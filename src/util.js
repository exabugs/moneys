/**
 * @file util
 * @module collie-core
 * @copyright DreamArts Corporation. All Rights Reserved.
 * @version 0.2
 */

import _ from 'underscore';

/**
 * @desc obj[key]にアクセスできるように
 * @param obj
 * @param key
 * @param callback
 * @param readonly
 * @returns {*}
 */
const arrayIndex = /^[+-]?[0-9]+$/;

export const getObject = (obj, key, callback, readonly) => {

  const keys = key.split('.');
  const k = keys.pop();

  if (obj === undefined || obj === null) {
    obj = [];
  } else if (!(obj instanceof Array)) {
    obj = [obj];
  }

  obj = keys.reduce((obj, key) => {
    if (arrayIndex.test(key)) {
      key = Number(key);
      if (key < 0) {
        key = obj.length + key;
      }
      if (obj[key] !== undefined) {
        // do nothing.
      } else if (!readonly) {
        obj[key] = {};
      }
      return [obj[key]];
    } else {
      return obj.reduce((ary, obj) => {
        if (obj[key] !== undefined && obj[key] !== null) {
          ary = ary.concat(obj[key]);
        } else if (!readonly) {
          obj[key] = {};
          ary.push(obj[key]);
        }
        return ary;
      }, []);
    }
  }, obj);

  return callback(obj, k);
};

/**
 * @desc obj[key] 取得
 * @param {Object} obj アクセスされるオブジェクト
 * @param {String} key アクセスするプロパティを表す文字列
 * @param {Any} [val=undefined] プロパティが存在しなかった場合の返り値
 * @return {Any} プロパティが存在した場合はその値を、無ければ<code>val</code>の値
 */
export const getValue = (obj, key, val) => {
  return getObject(obj, key, (obj, key) => {
    obj = obj[0];
    if (obj === undefined) {
      return val;
    } else if (obj === null) {
      return val;
    } else if (key === '') {
      return obj;
    } else if (obj[key] === undefined) {
      return val;
    } else {
      return obj[key];
    }
  }, true);
};

/**
 * @desc obj[key] 取得
 * @param {Object} obj アクセスされるオブジェクト
 * @param {String} key アクセスするプロパティを表す文字列
 * @return {Any} プロパティが存在した場合はその値
 */
export const getValues = (obj, key) => {
  return getObject(obj, key, (obj, key) => {
    return obj.reduce((ary, v) => {
      v && v[key] !== undefined && ary.push(v[key]);
      return ary;
    }, []);
  }, true);
};

/**
 * @desc obj[key] 設定
 * @param {Object} obj アクセスされるオブジェクト
 * @param {String} key アクセスするプロパティを表す文字列
 * @param {Any} val セットする値
 */
export const setValue = (obj, key, val) => {
  return getObject(obj, key, (obj, key) => {
    return obj.reduce((memo, obj) => {
      return obj && (obj[key] = val);
    }, false);
  }, false);
};

/**
 * @desc obj[key] 確認
 * @param {Object} obj アクセスされるオブジェクト
 * @param {String} key アクセスするプロパティを表す文字列
 * @return {Boolean} プロパティが存在するかどうか？
 */
export const hasValue = (obj, key) => {
  return getObject(obj, key, (obj, key) => {
    return obj.reduce((memo, obj) => {
      return memo || key in obj;
    }, false);
  }, true);
};

/**
 * @desc obj[key] 削除
 * @param {Object} obj アクセスされるオブジェクト
 * @param {String} key アクセスするプロパティを表す文字列
 * @return {Boolean} プロパティを削除できたか？
 */
export const delValue = (obj, key) => {
  return getObject(obj, key, (obj, key) => {
    return obj.reduce((memo, obj) => {
      return memo || delete obj[key];
    }, false);
  }, true);
};


/**
 * uniq
 *  - ObjectID 対応
 *  - null/undefined は削除
 * @param array
 * @returns {*}
 */

export const uniq = (array) => {
  return _.values(array.reduce((memo, value) => {
    if (value !== null && value !== undefined) {
      memo[value] = value;
    }
    return memo;
  }, {}));
};

/**
 * オブジェクトをドット記法でバラバラにする
 * @param obj
 * @returns {{}}
 */
export const flatten = (obj, keys) => {
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

/**
 * ディープ・コピー
 * @param val
 * @returns {*}
 */
export const cloneDeep = (val) => {
  if (val === undefined || val === null) {
    return val;
  } else if (val instanceof Date) {
    return new Date(val.getTime());
  } else if (val instanceof Array) {
    return val.reduce((memo, v) => {
      memo.push(cloneDeep(v));
      return memo;
    }, []);
  } else if (typeof val === 'object') {
    return Object.keys(val).reduce((memo, key) => {
      memo[key] = cloneDeep(val[key]);
      return memo;
    }, { __proto__: val.__proto__ });
  } else {
    return val;
  }
};
