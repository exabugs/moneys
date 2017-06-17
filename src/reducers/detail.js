import { initialize } from 'redux-form';
import { LOAD_DETAIL_SUCCESS, SELECT } from '../actions/detail';
import { cloneDeep } from '../util';

const data = {
  collection: '',
  detail: {},
};

const DetailReducer = (state = data, action) => {
  switch (action.type) {
    case LOAD_DETAIL_SUCCESS: {
      const { collection, detail } = action;
      return { ...state, collection, detail, initial: cloneDeep(detail) };
    }
    case SELECT: {
      // todo: name は select でのフィールド名。あとで変更する。
      const { detail, name, fieldDef } = action;
      return { ...state, detail, name, fieldDef };
    }
    default:
      return state;
  }
};

export default DetailReducer;
