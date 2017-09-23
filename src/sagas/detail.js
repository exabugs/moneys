import { call, put, select } from 'redux-saga/effects';
import _ from 'underscore';
import { serviceDetail, serviceRemove, serviceSubmitDetail, serviceUploadFile } from '../services';
import { loadDetailSuccess } from '../actions/detail';
import { initialize } from 'redux-form';
import { browserHistory } from 'react-router';

import { cloneDeep } from '../util';

import { clear } from '../actions/list';


// Business Logic
import config, { convert } from '../config/detail';

function getValue(obj, key) {
  return key.reduce((memo, _key) => {
    if (memo === null || memo === undefined) {
      return memo;
    } else {
      return memo[_key];
    }
  }, obj);
}

export function* doneSelect(para) {
  console.log('doneSelect');

  const list = yield select(state => state.list);
  const detail = yield select(state => state.detail);


  // todo: そもそも、ここは、immutable.js で書き換える

  // todo: setValue が 配列でうまく動作しないようなので ここで対応

  const field = detail.name.replace(/\[(\d+)\]/g, '.$1');

  const fields = field.split('.');
  const key = fields.pop();
  const object = getValue(detail.detail, fields);

  // サーバのレスポンスjsonを適切な型に変換する
  object[key] = convert(true, detail.fieldDef, list.item);

  console.log(object[key]);


  yield put(initialize('detailForm', detail.detail));

  yield console.log(detail.detail);
};

// フォームのリセット
export function* reset(para) {
  const detail = yield select(state => state.detail);
  yield put(initialize('detailForm', cloneDeep(detail.initial)));
};

// 削除
export function* remove(para) {
  console.log('serviceRemove');
  const token = yield select(state => state.session.token);

  const { collection, detail } = para;

  const params = {
    collection,
    id: detail._id,
  };

  const { data, error } = yield call(serviceRemove, token, params);

  if (error) {
    console.log(error);
    // yield put(loginFailer(params));
  } else {
    console.log(data);

    yield put(clear());
  }
}

export function* detail(para) {
  console.log('serviceDetail');
  const token = yield select(state => state.session.token);

  const { collection, id } = para;

  const params = {
    collection,
    id,
    ..._.omit(para, 'type'),
  };

  const { data, error } = yield call(serviceDetail, token, params);

  if (error) {
    console.log(error);
    // yield put(loginFailer(params));
  } else {
    console.log(data);

    // サーバのレスポンスjsonを適切な型に変換する
    const detail = convert(true, config.modules[collection], data.item);

    const result = { collection, detail };
    yield put(loadDetailSuccess(result));
    console.log(result);

    yield put(initialize('detailForm', detail));
  }
}

// サブミット
export function* submitDetail(para) {
  console.log('submitDetail');
  const token = yield select(state => state.session.token);

  const { collection, detail } = para;

  // サーバのレスポンスjsonを適切な型に変換する
  const item = convert(false, config.modules[collection], detail);

  const params = {
    collection,
    id: item._id, // 'undefined' if new.
    item,
    ..._.omit(para, 'type'),
  };

  const { data, error } = yield call(serviceSubmitDetail, token, params);

  if (error) {
    console.log(error);
    // yield put(loginFailer(params));
  } else {
    console.log(data);


    // サーバのレスポンスjsonを適切な型に変換する
    const detail_new = convert(true, config.modules[collection], data.item);

    const result = { collection, detail: detail_new };
    yield put(loadDetailSuccess(result));
    console.log(result);

    // 登録後、詳細画面のまま
    // yield browserHistory.push(`/modules/${collection}/${detail_new._id}`);
    // yield put(initialize('detailForm', detail_new));

    // 登録後、一覧画面に遷移
    yield browserHistory.push(`/modules/${collection}`);
  }
}

export function* drop(para) {
  console.log('drop');
  const token = yield select(state => state.session.token);

  const { collection, file } = para;

  const params = {
    collection,
    file: file[0],
  };

  const { data, error } = yield call(serviceUploadFile, token, params);

  if (error) {
    console.log(error);
  } else {
    // yield browserHistory.push(`/modules/${collection}/${data.id}`);
    yield browserHistory.push(`/modules/${collection}`);
  }
}
