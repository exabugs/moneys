import { call, put, select } from 'redux-saga/effects';
import _ from 'underscore';
// import { browserHistory } from 'react-router';
//
import { initialize } from 'redux-form';

import { clear, loadNextSuccess, initOwnerSuccess } from '../actions/list';
import { serviceGetList, serviceTree, serviceDownloadFile } from '../services';

import { cloneDeep } from '../util';

// ダウンロード
export function* download(para) {
  console.log('download');
  const token = yield select(state => state.session.token);

  const params = {
    ..._.omit(para, 'type'),
  };

  const { data, error } = yield call(serviceDownloadFile, token, params);

  if (error) {
    console.log(error);
    // yield put(loginFailer(params));
  } else {
    // download
    const tempLink = document.createElement('a');
    tempLink.href = data.url;
//    tempLink.setAttribute('target', '_blank');
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
  }
};

// フォームのリセット
export function* reset(para) {

  const list = yield select(state => state.list);
  const { collection, context } = list;

  const { condition } = context[collection] || {};

  yield put(initialize('searchForm', cloneDeep(condition)));
};

export function* loadNext(para) {
  // const params = _.omit(para, 'type');
  console.log('loadNext');
  const token = yield select(state => state.session.token);

  const list = yield select(state => state.list) || {};
  const { collection, owner = {}, context } = list;
  const { primaryGroup } = owner[collection] || {};
  const { condition, order, orderBy } = context[collection] || {};

  const params = {
    collection,
//    ..._.omit(para, 'type'),
    condition,
    order,
    orderBy,
  };

  if (primaryGroup) {
    params.owner = primaryGroup;
  }

  if (list.items) {
    params.skip = list.items.length;
  }

  yield reset(para);

  const { data, error } = yield call(serviceGetList, token, params);

  if (error) {
    console.log(error);
    // yield put(loginFailer(params));
  } else {
    console.log(data);
    const result = { items: data.items };
    yield put(loadNextSuccess(result));
  }
}

export function* search(para) {
  yield put(clear());
  console.log();
  yield loadNext(para);
  console.log();
}

export function* initOwner(para) {
  console.log('initOwner');
  const session = yield select(state => state.session);
  const { token, primaryGroup } = session;

  const id = para.primaryGroup || primaryGroup;

  const params = {
    collection: 'groups',
    id,
  };

  const { data, error } = yield call(serviceTree, token, params);

  if (error) {
    console.log(error);
    // yield put(loginFailer(params));
  } else {
    console.log(data);
    const result = { collection: para.collection, primaryGroup: id, items: data.items };
    yield put(initOwnerSuccess(result));
    yield loadNext({});
  }
}
