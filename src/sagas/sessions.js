import { call, put, select } from 'redux-saga/effects';
import { browserHistory } from 'react-router';

import { loginSuccess, loginFailer } from '../actions/session';
import { serviceDoLogin } from '../services';

export function* watchDoLogin(params) {
  console.log('watch_do_login');
  const { data, error } = yield call(serviceDoLogin, params);
  let path;
  if (error) {
    console.log(error);
    yield put(loginFailer(params));
  } else {
    console.log(data);
    const { session } = data;

    if (session && session.user) {
      const result = {
        userName: session.user.userName,
        token: data.token,
        token_type: data.token_type,
        primaryGroup: session.group._id,
      };
      yield put(loginSuccess(result));
      path = yield select(state => state.session.path);
      console.log(path);
    } else {
      yield put(loginFailer(params));
    }
  }
  yield browserHistory.push(path || '/');
}
