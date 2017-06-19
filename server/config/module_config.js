const fs = require('fs');
const _ = require('underscore');
const moment = require('moment');
const mongodb = require('mongodb');

const { ObjectId } = mongodb;

const modules = {};
const config = { modules };

const dir = __dirname + '/../../src/config/detail/';

const files = fs.readdirSync(dir);
files.filter(file => {
  if (fs.statSync(dir + file).isFile() && /^([a-z].*)\.json$/.test(file)) {
    modules[RegExp.$1] = require(dir + file);
  }
});

const common = require(dir + '/_common.json');

function resolve(fieldDef) {

  if (fieldDef.fieldDefs) {
    fieldDef.fieldDefs = fieldDef.fieldDefs.map((_fieldDef) => {

      const newDef = {};
      _.extend(newDef, { collection: fieldDef.collection });
      _.extend(newDef, common[_fieldDef.common]);
      _.extend(newDef, _fieldDef);

      return resolve(newDef);
    });

    if (fieldDef.selector) {
      fieldDef.fieldDefs.push({
        key: '_id',
        type: 'ObjectId',
      });
    }
  }
  return fieldDef;
}


//
// サーバのレスポンスjsonを適切な型に変換する
//
const _convert = (fieldDef, object, resolve) => {

  if (object === null || object === undefined) {
    if (fieldDef.default) {
      object = fieldDef.default;
    } else {
      return fieldDef.array ? [] : (fieldDef.fieldDefs ? {} : null);
    }
  }

  if (fieldDef.array && Array.isArray(object)) {
    return object.map((obj) => {
      return _convert(_.omit(fieldDef, 'array'), obj, resolve);
    });
  } else if (fieldDef.fieldDefs) {
    return fieldDef.fieldDefs.reduce((memo, _fieldDef) => {
      const key = _fieldDef.key;
      memo[key] = _convert(_fieldDef, object[key], resolve);
      return memo;
    }, {});
  } else {
    // 変換処理
    return resolve(fieldDef, object);
  }
};

// 入力方向の変換
function incomming(fieldDef, object) {
  switch (fieldDef.type) {
    case 'ObjectId':
      return new ObjectId(object);
    case 'Date':
      if (fieldDef.format) {
        // 文字列表現の場合
        return object;
      } else {
        return new Date(Date.parse(object));
      }
    case 'DateTime':
      return new Date(Date.parse(object));
    case 'Location':
      let p = object;
      if (p && p.length === 2) {
        return { type: 'Point', coordinates: p };
      } else {
        return fieldDef.default;
      }
    default:
      return object;
  }
}

// 出力方向の変換
function outgoing(fieldDef, object) {
  switch (fieldDef.type) {
    case 'Location':
      return object.coordinates ? object.coordinates : object;
    default:
      return object;
  }
}

const convert = (incom, fieldDef, object) => {
  if (incom) {
    return _convert(fieldDef, object, incomming);
  } else {
    return _convert(fieldDef, object, outgoing);
  }
};

module.exports.config = (db) => {
  _.each(config.modules, (fieldDef) => {

    _.each(fieldDef.indexes, (info) => {
      db.createIndex(fieldDef.collection, info.index, info.option);
    });

    return resolve(fieldDef);
  });

  config.convert = convert;

  return config;
};
