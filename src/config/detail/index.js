import _ from 'underscore';
import moment from 'moment';

import claims from './claims.json';
import customers from './customers.json';
import images from './images.json';
import accounts from './accounts.json';
import groups from './groups.json';
import users from './users.json';
import passwords from './passwords.json';
import sessions from './sessions.json';
import files from './files.json';

import common from './_common.json';

const config = {
  modules: {
    claims,
    customers,
    images,
    accounts,
    groups,
    users,
    passwords,
    sessions,
    files,
  },
};

function resolve(fieldDef) {

  if (fieldDef.fieldDefs) {
    fieldDef.fieldDefs = fieldDef.fieldDefs.map((_fieldDef) => {

      const newDef = {};
      _.extend(newDef, { collection: fieldDef.collection });
      _.extend(newDef, common[_fieldDef.common]);
      _.extend(newDef, _fieldDef);

      return resolve(newDef);
    });

    fieldDef.fieldDefs.push({
      key: '_id',
      type: 'ObjectId',
      visible: false,
    });
  }

  return fieldDef;
}

export default (() => {
  _.each(config.modules, (fieldDef) => {
    return resolve(fieldDef);
  });
  return config;
})();

//
// サーバのレスポンスjsonを適切な型に変換する
//
const _convert = (fieldDef, object, resolve) => {

  if (object === null || object === undefined) {
    return fieldDef.array ? [] : (fieldDef.fieldDefs ? {} : null);
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
  if (fieldDef.mapping) {
    const item = fieldDef.mapping.find(v => v[0] === object);
    object = item && item[1];
  }
  switch (fieldDef.type) {
    case 'Date':
      if (fieldDef.format) {
        // Dateとして扱いたいのに文字列でぶっこんでくる場合に変換する
        try {
          return moment(object, fieldDef.format).toDate();
        } catch (err) {
          return object;
        }
      } else {
        return new Date(Date.parse(object));
      }
    case 'DateTime':
      return new Date(Date.parse(object));
    case 'Location':
      return object.coordinates ? object.coordinates.join(',') : object;
    default:
      return object;
  }
}

// 出力方向の変換
function outgoing(fieldDef, object) {
  if (fieldDef.mapping) {
    const item = fieldDef.mapping.find(v => v[1] === object);
    object = item && item[0];
  }
  switch (fieldDef.type) {
    case 'Date':
      if (fieldDef.format) {
        return moment(object).format(fieldDef.format);
      } else {
        return object;
      }
    case 'Location':
      let p = object.trim().split(/[, ]+/).slice(0, 2).map(v => Number(v));
      if (p[0] < p[1]) {
        // 経度,緯度の順
        // 日本に限定すれば、経度の方が緯度より大きいことで、簡易なチェックができる。
        p = [p[1], p[0]];
      }
      return p;
    default:
      return object;
  }
}

export const convert = (incom, fieldDef, object) => {
  if (incom) {
    return _convert(fieldDef, object, incomming);
  } else {
    return _convert(fieldDef, object, outgoing);
  }
};
