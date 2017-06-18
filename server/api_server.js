const aws = require('aws-sdk');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongodb = require('mongodb');
const path = require('path');
const morgan = require('morgan');
const _ = require('underscore');
const async = require('async');
const crypto = require('crypto');
const kuromoji = require('@exabugs/kuromoji');

const { ObjectId, MongoClient } = mongodb;

process.env.HOST = process.env.HOST || 'exabugs.k2s.io';
process.env.PORT = process.env.PORT || 8007;
process.env.AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
process.env.AWS_BUCKET = process.env.AWS_BUCKET || 'jp.co.dreamarts.exabugs';

process.env.MONGODB = process.env.MONGODB || 'mongodb://localhost:27017/';
process.env.DB_NAME = process.env.DB_NAME || 'master';

process.env.CLUSTER = process.env.CLUSTER || 'frontend';

const credentialProvider = new aws.CredentialProviderChain();
const cognitoidentity = new aws.CognitoIdentity({ credentialProvider });
const s3 = new aws.S3({ credentialProvider });

const dbMaster = 'master';

const Sessions = require('./lib/sessions');
const ECS = require('./lib/ecs');

const module_config = require('./config/module_config');
const list_config = require('./config/list_config');

const app = express();

const appGlobal = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('dev'));


const values = (array, key) => array.map(a => a[key]);

const toObj1 = (array) => array.reduce((memo, v) => {
  memo[v] = 1;
  return memo
}, {});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const subscribeInfo = {};

function subscribe(type, coll, func) {
  const info = subscribeInfo[type] = subscribeInfo[type] || {};
  const name = coll.s ? coll.s.name : coll;
  info[name] = info[name] || [];
  info[name].push(func);
}

function publish(type, coll, item, callback) {
  const infos = subscribeInfo[type] || [];
  async.eachSeries(infos[coll], (func, next) => {
    func(item, next);
  }, (err) => {
    callback(err, item);
  });
}

// BaseURL
const CONTEXT = '/admin';

// トークンチェック
app.use(CONTEXT, (req, res, next) => {
  console.log(JSON.stringify(req.headers));

  const whitelist = [
    '/login',
  ];
  if (_.contains(whitelist, req.url)) {
    next();
  } else {
    const { authorization } = req.headers;
    appGlobal.sessions.verify(authorization).then((result) => {
      result.source = (req.headers['x-forwarded-for'] || '').split(',');
      req.session = result;
      console.log(JSON.stringify(result));
      next();
    }).catch((err) => {
      next(err);
    });
  }
});

// エラーハンドリング
app.use(CONTEXT, Sessions.handleError);

const router = express.Router('/survey');

app.use(CONTEXT, router);

const createHmac = (str) => {
  return str ? crypto.createHmac('sha256', 'exabugs').update(str).digest('hex') : '';
};

// 認証
const authUser = (userName, pass, clientKey, callback) => {
  const db = appGlobal.db;
  const authe = db.collection('passwords');
  const users = db.collection('users');
  const client = { key: clientKey };
  const password = createHmac(pass);
  authe.findOne({ userName }, (err, authe) => {
    if (err) {
      callback(err);
    } else if (!authe) {
      callback({ status: 404 });
    } else if (authe.password !== password) {
      callback({ status: 404 });
    } else {
      const fields = ['name', 'userName', 'primaryGroup'];
      users.findOne({ userName }, toObj1(fields), (err, user) => {
        if (err) {
          callback(err);
        } else if (!user) {
          callback({ status: 404 });
        } else {
          // セッション生成
          appGlobal.sessions.create(user, client).then((token) => {
            Object.assign(token, user);
            callback(null, token);
          }).catch((err2) => {
            callback(err2);
          });
        }
      });
    }
  });
};

router.post('/login', (req, res) => {
  const { userName, password } = req.body;

  const { clientKey } = req.body;

  async.waterfall([
    (next) => {
      // 認証
      authUser(userName, password, clientKey, (err, data) => {
        next(err, data);
      });
    },
    (data, next) => {
      publish('login', 'sessions', data, next);
    },
    (data, next) => {
      if (!process.env.AWS_POOL_ID) {
        next(null, data);
      } else {
        // 次に GetOpenIdTokenForDeveloperIdentity を呼び出す
        const params = {
          IdentityPoolId: process.env.AWS_POOL_ID,
          Logins: {
            // アプリ名とユーザー名(任意の定義)を渡す
            'jp.co.dreamarts.jcomsurvey': userName,
          },
        };
        cognitoidentity.getOpenIdTokenForDeveloperIdentity(params, (err2, cognito) => {
          if (err2) {
            next(err2);
          } else {
            // クライアントに CognitoId と OpenIdToken を返してやる
            data.cognito = cognito;
            next(err2, data);
            // cognito = {
            //  IdentityId: 'YOUR_COGNITO_ID',
            //  Token: 'YOUR_TOKEN'
            // };
          }
        });
      }
    },
  ], (err, data) => {
    if (!err) {
      res.send(data);
    }
  });
});

function getSignedUrl(operation, params) {
  return new Promise((resolve, reject) => {
    s3.getSignedUrl(operation, params, (err, data) => {
      if (err) {
        reject(err, data);
      } else {
        resolve(data);
      }
    });
  });
}

if (!process.env.AWS_BUCKET) {
  console.log('AWS Bucket not specified.');
} else {

  kuromoji.builder().build((err, tokenizer) => {
    if (err) {
      console.log(err);
    } else {
      appGlobal.tokenizer = tokenizer;

      MongoClient.connect(process.env.MONGODB, (err, db) => {
        if (err) {
          console.log(err);
        } else {
          db = db.db(dbMaster);
          appGlobal.db = db;

          // session
          appGlobal.sessions = new Sessions(db);

          // ecs
          appGlobal.ecs = new ECS(db, subscribe);

          // 管理者アカウント
          const createdAt = new Date();
          const valid = true;
          const upsert = { upsert: true };
          const rootId = ObjectId('000000000000000000000000');

          {
            const _id = rootId;
            const name = 'root';
            const userName = 'admin';
            const password = createHmac('123');
            db.collection('groups').updateOne({ _id },
              { $setOnInsert: { name, ancestors: [{ _id, name }], createdAt, valid } }, upsert);

            db.collection('users').updateOne({ _id },
              { $setOnInsert: { userName, primaryGroup: { _id, name }, createdAt, valid } }, upsert);
            db.collection('passwords').updateOne({ userName },
              { $setOnInsert: { password, createdAt, valid } }, upsert);
          }

          {
            const accountId = ObjectId('5944f4898853b8000000000a');
            const groupId = ObjectId('5944f4898853b8000000000b');
            const name = 'test';
            {
              const _id = accountId;
              db.collection('accounts').updateOne({ _id },
                {
                  $setOnInsert: {
                    name,
                    image: {
                      name: 'jquerywebide_terminal',
                      tag: '20170618',
                    },
                    createdAt,
                    valid,
                  }
                }, upsert);
            }
            {
              const _id = groupId;
              db.collection('groups').updateOne({ _id }, {
                $setOnInsert: {
                  name,
                  parent: { _id: rootId },
                  ancestors: [{ _id: rootId }, { _id, name }],
                  createdAt,
                  valid,
                },
              }, upsert);
            }

            {
              const _id = ObjectId('5944f4898853b80000000001');
              const userName = 'test1';
              const password = createHmac('123');
              db.collection('users').updateOne({ _id }, {
                $setOnInsert: {
                  userName,
                  account: { _id: accountId, name },
                  primaryGroup: { _id: groupId, name },
                  createdAt,
                  valid,
                },
              }, upsert);
              db.collection('passwords').updateOne({ userName },
                { $setOnInsert: { password, createdAt } }, upsert);
            }
            {
              const _id = ObjectId('5944f4898853b80000000002');
              const userName = 'test2';
              const password = createHmac('123');
              db.collection('users').updateOne({ _id }, {
                $setOnInsert: {
                  userName,
                  account: { _id: accountId, name },
                  primaryGroup: { _id: groupId, name },
                  createdAt,
                  valid,
                },
              }, upsert);
              db.collection('passwords').updateOne({ userName },
                { $setOnInsert: { password, createdAt } }, upsert);
            }
          }

          app.listen(process.env.PORT, () => {
            console.log(`Example app listening on port ${process.env.PORT}!`);
          });
        }
      });
    }
  });
}

function number(str, alt) {
  return str ? Number(str) : alt;
}

const list_colls = Object.keys(list_config.config.modules);
const module_colls = Object.keys(module_config.config.modules);

// todo : Date 型
const flatten = (obj, keys) => {
  let result = {};
  keys = keys || [];
  _.each(obj, (val, key) => {
    keys.push(key);
    if (val === undefined || val === null) {
      result[keys.join('.')] = val;
    } else if (val instanceof Date) {
      result[keys.join('.')] = new Date(val.getTime());
    } else if (typeof val === 'object') {
      const child = flatten(val, keys);
      result = _.extend(result, child);
    } else {
      result[keys.join('.')] = val;
    }
    keys.pop();
  });
  return result;
};

function handler(collname) {
  return (req, res) => {
    const db = appGlobal.db;
    const coll = db.collection(collname);
    const fieldDefs = list_config.config.modules[collname];

    let field = 'owner.';
    (collname === 'groups') && (field = '');
    (collname === 'users') && (field = 'primaryGroup.');

    const params = {
      skip: number(req.query.skip, 0),
      limit: number(req.query.limit, 20),
      sort: fieldDefs.sort || [],
    };
    params.sort.push(['_id', 1]);

    const condition = req.query.condition;
    const cond = [flatten(condition ? JSON.parse(condition) : {})];
    async.waterfall([
      (next) => {
        async.eachSeries(cond, (c, next1) => {
          async.eachSeries(Object.keys(c), (key, next2) => {
            const keywords = c[key].trim();
            if (key.startsWith('__keywords.')) { // todo: フィールド名ではなくフィールドの検索タイプで
              const words = appGlobal.tokenizer.auto(keywords);
              if (keywords !== '') {
                c[key] = { $all: words };
              } else {
                delete c[key];
              }
              next2();
            } else if (key === 'location') { // todo: フィールド名ではなくフィールドの検索タイプで
              const words = keywords.split(/[, ]+/);
              if (words.length === 2) {
                try {
                  let p = words.map(v => Number(v));
                  if (p[0] < p[1]) {
                    p = [p[1], p[0]];
                  }
                  const $geometry = { type: 'Point', coordinates: p };
                  c[key] = { $near: { $geometry } };
                  delete params.sort;
                } catch (e) {
                  delete c[key];
                }
              } else {
                delete c[key];
              }
              next2();
            } else {
              next2();
            }
          }, err => next1(err));
        }, err => next(err));
      },
      (next) => {
        const owner = req.query.owner;
        const ownerCond = _.find(fieldDefs.search, field => field.type === 'owner');
        if (owner && ownerCond) {
          const groups = db.collection('groups');
          groups.findOne({ _id: ObjectId(owner) }, (err, group) => {
            // Y字型の権限チェック
            const ancestors = values(group.ancestors, '_id');
            cond.push({
              $or: [
                { [`${field}ancestors._id`]: { $in: [group._id] } }, // 下位
                { [`${field}_id`]: { $in: ancestors } }, // 上位
              ],
            });
            next(err);
          });
        } else {
          next();
        }
      },
      (next) => {
        let _cond = (cond.length === 1) ? cond[0] : { $and: cond };

        coll.find(_cond, params).toArray((err, items) => {

          const fieldsDef = module_config.config.modules[collname];

          items = items.map(item => {
            // return module_config.convert(false, fieldsDef, item);
            const ret = module_config.convert(false, fieldsDef, item);
            Object.keys(ret).forEach(key => {
              item[key] = ret[key];
            });
            return item;
          });

          next(err, items);
        });
      },
    ], (err, items) => {
      res.send({ items });
    });
  };
}

list_colls.forEach((col) => {
  router.get(`/${col}`, handler(col));
});

function handlerOne(collname) {
  return (req, res) => {
    const db = appGlobal.db;
    const coll = db.collection(collname);

    const id = req.params.id;
    const params = {};
    async.waterfall([
      (next) => {
        if (isObjectId(id)) {
          coll.findOne({ _id: ObjectId(id) }, params, (err, item) => {
            next(err, item);
          });
        } else {
          next(null, {});
        }
      },
    ], (err, item) => {
      if (item) {
        res.send({ item });
      } else {
        res.sendStatus(404);
      }
    });
  };
}
module_colls.forEach((col) => {
  router.get(`/${col}/:id`, handlerOne(col));
});

function isObjectId(str) {
  return str && /[a-f0-9]{24}/.test(str);
}

function setInitial(obj, ini, key, value) {
  if (!obj[key] || (value._id && !obj[key]._id)) {
    ini[key] = value;
    delete obj[key];
  }
}


// todo: insert か update か、よく考える。
// upsert:true は 危険
function update(user, collname, data, id, callback) {
  const db = appGlobal.db;
  const coll = db.collection(collname);

  const fieldsDef = module_config.config.modules[collname];

  const detail = module_config.convert(true, fieldsDef, data);

  detail.updatedAt = new Date();
  detail.updatedBy = { name: user.name, _id: user._id };

  const initial = {};
  setInitial(detail, initial, 'owner', user.primaryGroup);
  setInitial(detail, initial, 'createdBy', detail.updatedBy);
  setInitial(detail, initial, 'createdAt', detail.updatedAt);

  let _id;
  if (isObjectId(id)) {
    _id = new ObjectId(id);
  } else {
    _id = new ObjectId();
  }
  delete detail._id;

  const params = { upsert: true };
  async.waterfall([
    (next) => {
      coll.update({ _id }, { $setOnInsert: initial, $set: detail }, params, (err) => {
        next(err);
      });
    },
    (next) => {
      coll.findOne({ _id }, (err, item) => {
        next(err, item);
      });
    },
    (item, next) => {
      publish('update', collname, item, next);
    },
  ], (err, item) => {
    callback(err, item);
  });
}

function handlerUpdate(collname) {
  return (req, res) => {
    const user = req.session.user;
    const data = req.body.item;
    const id = req.params.id;
    update(user, collname, data, id, (err, item) => {
      if (item) {
        res.send({ item });
      } else {
        res.sendStatus(404);
      }
    });
  };
}

function remove(user, collname, id, callback) {
  const db = appGlobal.db;
  const coll = db.collection(collname);

  async.waterfall([
    (next) => {
      const _id = new ObjectId(id);
      coll.findOne({ _id }, (err, item) => {
        if (item) {
          coll.remove({ _id }, (err) => {
            next(err, item);
          });
        } else {
          next(err, item);
        }
      });
    },
    (item, next) => {
      publish('remove', collname, item, next);
    },
  ], (err, item) => {
    callback(err, item);
  });
}

function handlerRemove(collname) {
  return (req, res) => {
    const user = req.session.user;
    const id = req.params.id;
    if (!id) {
      res.sendStatus(404);
    } else {
      remove(user, collname, id, (err, item) => {
        if (item) {
          res.send({ item });
        } else {
          res.sendStatus(404);
        }
      });
    }
  };
}

module_colls.forEach((col) => {
  router.post(`/${col}`, handlerUpdate(col));
  router.put(`/${col}/:id`, handlerUpdate(col));
  router.delete(`/${col}/:id`, handlerRemove(col));
});


// パンくずリスト
function breadcrumbs(coll, _id, cond, option, callback) {
  coll.findOne(_.extend({ _id }, cond), (err, obj) => {
    if (obj) {
      const ids = values(obj.ancestors, '_id').concat(_id);
      const infos = ids.reduce((memo, group) => {
        memo.push({
          parent: memo.length ? memo[memo.length - 1]._id : null,
          _id: group,
        });
        return memo;
      }, []);
      infos.shift();

      async.map(infos, (info, next) => {
        const _cond = _.extend({ 'parent._id': info.parent }, cond);
        coll.find(_cond, option).toArray((err, children) => {
          if (children.length) {
            const items = children.map(g => ({ value: g._id, name: g.name }));
            items.unshift({ value: info.parent, name: '-' });
            next(err, { value: info._id, items });
          } else {
            next(err, null);
          }
        });
      }, (err1, _items) => {
        const items = _items.filter(item => item);
        callback(err1, items);
      });
    } else {
      callback(err);
    }
  });
}

router.get('/breadcrumbs/:coll/:_id', (req, res) => {
  const cond = {};
  const option = {
    sort: [['order', 1], ['_id', 1]],
  }
  const collname = req.params.coll;
  const _id = new ObjectId(req.params._id);
  const db = appGlobal.db;
  const coll = db.collection(collname);

  breadcrumbs(coll, _id, cond, option, (err, items) => {
    res.send({ items });
  });
});

// アップロードURL
// [戻り値] json
router.get('/upload/**', (req, res) => {
  const { contentType, name, length, expires } = req.query;
  const prefix = req.params[0];

  if (!prefix || !contentType) {
    return res.sendStatus(400);
  }

  const user = req.session.user;
  const data = { contentType, name, length };

  update(user, 'files', data, null, (err, item) => {
    if (item) {
      const id = item._id.toString();

      // 注意 : getSignedUrl では ContentDisposition は設定できない。
      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: path.join('S3', prefix, id),
        Expires: expires ? Number(expires) : 10,
        ContentType: contentType,
      };

      return getSignedUrl('putObject', params)
        .then(url => res.send({ url, id }))
        .catch(err => res.status(500).send(err));
    } else {
      res.sendStatus(500);
    }
  });
});

// 【注意】権限チェックすること
// ダウンロードURL
// [戻り値] リダイレクト
router.get('/download/**', (req, res) => {
  const { ContentDisposition, Expires } = req.query;
  const FullKey = req.params[0];

  if (!FullKey) {
    return res.sendStatus(400);
  }

  const id = new ObjectId(FullKey.split('/').pop());
  if (!isObjectId(id)) {
    return res.sendStatus(400);
  }

  const _id = new ObjectId(id);

  const files = appGlobal.db.collection('files');
  files.findOne({ _id }, (err, file) => {

    if (err) {
      res.sendStatus(500);
    } else if (!file) {
      res.sendStatus(400);
    } else {
      const filename = encodeURIComponent(file.name || _id);
      const disposition = `attachment; filename="${filename}"`;

      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: path.join('S3', FullKey),
        Expires: Expires ? Number(Expires) : 2,
        ResponseContentDisposition: ContentDisposition || disposition,
      };

      return getSignedUrl('getObject', params)
        .then(url => res.send({ url }))
        //    .then(url => res.redirect({url}))
        .catch(err => res.status(500).send(err));
    }
  });

});
