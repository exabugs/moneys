/* eslint-disable no-constant-condition */

import { takeEvery, takeLatest, take, fork, call } from 'redux-saga/effects';

// import { call, put, fork, takeEvery, select } from 'redux-saga/effects';
import { delay } from 'redux-saga';

// import { addTodo, upload_file } from '../actions';
// import { loginSuccess, loginFailer } from '../../common/session/SessionAction';

import { watchDoLogin } from './sessions';
import { loadNext, initOwner, search, download } from './list';
import { detail, reset, remove, doneSelect, submitDetail, drop } from './detail';

import { DO_LOGIN } from '../actions/session';
import { LOAD_NEXT, INIT_OWNER, DO_SEARCH, DOWNLOAD } from '../actions/list';
import { LOAD_DETAIL, SUBMIT_DETAIL, DONE_SELECT, RESET, REMOVE, DROP } from '../actions/detail';

// function* incrementAsync() {
//   yield call(delay, 2000)
//   console.log("incrementAsync")
//   yield put(addTodo("hello"))
// }
//
// function* watch_upload_file(params) {
//   console.log("watch_upload_file")
//   const result = yield call(service_upload_file, params);
//   console.log(result);
// }
//
// function* watch_download_file(params) {
//   console.log("watch_download_file")
//   const result = yield call(service_download_file, params);
//   console.log(result);
// }

function watchWait(key, func, timeout) {
  return function* handleRequestSuggest() {
    let task;
    while (true) {
      const a = yield take(key);
      if (task && task.isRunning()) {
        task.cancel();
      }
      //      task = yield forkLater(func, payload);
      task = yield fork(function*() {
        yield call(delay, timeout);
        yield fork(func, a);
      });
    }
  };
}

export default function* rootSaga() {
  yield [
    // takeEvery('INCREMENT_ASYNC', incrementAsync),
    // takeEvery('LOAD_EVENT', incrementAsync),
    // takeEvery('UPLOAD_FILE', watch_upload_file),
    // takeEvery('DOWNLOAD_FILE', watch_download_file),
    takeEvery(DO_LOGIN, watchDoLogin),
    takeEvery(LOAD_NEXT, loadNext),
    takeEvery(INIT_OWNER, initOwner),
    takeEvery(LOAD_DETAIL, detail),
    takeEvery(SUBMIT_DETAIL, submitDetail),
    takeEvery(DONE_SELECT, doneSelect),
    takeEvery(RESET, reset),
    takeEvery(REMOVE, remove),
    // fork(watchWait(DO_SEARCH, search, 2000)),
    takeLatest(DO_SEARCH, search),
    takeLatest(DROP, drop),
    takeLatest(DOWNLOAD, download),
  ];
}
