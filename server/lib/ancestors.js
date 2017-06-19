//
// YUKARi アカウント同期 (テンポラリ作成)
//
const mongodb = require('mongodb');
const async = require('async');
const _ = require('underscore');

const config = require('../../config');

const ObjectId = mongodb.ObjectId;

const root = ObjectId("000000000000000000000001");


module.exports = (params, callback) => {

  const local = {};

  async.waterfall([
    (next) => {
      local.db = {
        yukari: params.db.db(config.db.yukari),
        survey: params.db.db(config.db.temporary),
      };
      next(null);
    },
    (next) => {
      var src = local.db.yukari.collection('users');
      var dst = local.db.survey.collection('users');
      copy(src, dst, next);
    },
    (next) => {
      var src = local.db.yukari.collection('groups');
      var dst = local.db.survey.collection('groups');
      copy(src, dst, next);
    },
    (next) => {
      var coll = local.db.survey.collection('users');
      // 制約チェック
      coll.createIndex('userName', { unique: true }, (err) => {
        err && console.log(err);
        next(err);
      });
    },
    (next) => {
      var coll = local.db.survey.collection('groups');
      // ancestors 再構築
      build_ancestors(coll, root, [], [], [], undefined, next);
    },
    (next) => {
      var coll = local.db.survey.collection('groups');
      disp(coll, root, 0, next);
    },
  ], (err) => {
    console.log(err);
    callback(err, params);
  });
};

// Collection Copy
function copy(src, dst, callback) {
  dst.drop(() => {
    src.find({}, (err, cursor) => {
      function processItem(err, item) {
        if (err || !item) {
          return callback(err);
        } else {
          dst.insert(item, (err) => {
            if (err) {
              callbak(err);
            } else {
              cursor.nextObject(processItem);
            }
          });
        }
      }

      if (err) {
        return callback();
      } else {
        cursor.nextObject(processItem);
      }
    });

  })
}

// ancestors を再計算
//   ルールは yukari '3cf13466'
//     - 自分自身は含まない
//     - _id は 文字列
function build_ancestors(coll, id, ancestors, names, orders, update, callback) {
  coll.findOne({ _id: id }, (err, tgt) => {
    if (err || !tgt) {
      console.log(err);
      callback();
    } else {
      var depth = ancestors.length;
      var $set = { ancestors, depth, ancestors_name: names, ancestors_order: orders, updateAt: update };
      coll.update({ _id: id }, { $set }, (err) => {
        ancestors.push(id.toString());
        names.push(tgt.name);
        orders.push(tgt.order);
        coll.find({ parent: id.toString() }).toArray().then(children => {
          async.eachSeries(children, (child, next) => {
            var _update = (!update || update < child.updateAt) ? child.updateAt : update;
            build_ancestors(coll, child._id, ancestors, names, orders, _update, next);
          }, (err) => {
            ancestors.pop();
            names.pop();
            orders.pop();
            callback(err);
          });
        });
      })
    }
  });
}

// ただの表示だけ
function disp(coll, id, level, callback) {
  coll.findOne({ _id: id }, function(err, tgt) {
    if (err || !tgt) {
      console.log(err);
      callback();
    } else {
      var date = tgt.updateAt && tgt.updateAt.toISOString().slice(5, 16);
      var text = `${tgt._id} ${date} ${repeat(' ', level * 4)} ${tgt.name}`;
      console.log(text);
      coll.find({ parent: id.toString() }).toArray().then(children => {
        async.eachSeries(children, (child, next) => {
          disp(coll, child._id, level + 1, next);
        }, (err) => {
          callback();
        });
      });
    }
  });
}

function repeat(char, n) {
  let result = '';
  for (let i = 0; i < n; i += 1) {
    result = result + char;
  }
  return result;
}
