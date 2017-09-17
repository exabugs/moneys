import { browserHistory } from 'react-router';
import {
  CLEAR,
  SET_COLLECTION,
  INIT_OWNER_SUCCESS,
  LOAD_NEXT_SUCCESS,
  SELECT_ITEMS,
  DO_SELECT,
  DO_SEARCH,
} from '../actions/list';

const data = {
  items: [],
  owner: {}, // コレクション別
  context: {}, // コレクション別
};

function merge(map, now, add) {
  add.forEach((item) => {
    if (!map[item._id]) {
      now.push(item);
      map[item._id] = true;
    }
  });
}

const ListReducer = (state = data, action) => {
  switch (action.type) {
    case CLEAR:
      return { ...state, items: [] };
    case SET_COLLECTION: {
      const { collection } = action;
      return { ...state, items: [], collection };
    }
    case DO_SEARCH: {
      const { collection, context } = state;
      const { order, orderBy } = action;
      const condition = action.condition;
      const newContext = { ...context };
      newContext[collection] = {
        ...newContext[collection],
        condition,
        order,
        orderBy,
      };
      return { ...state, context: newContext };
    }
    case INIT_OWNER_SUCCESS: {
      const owner = { ...state.owner };
      const { collection, primaryGroup, items } = action;
      console.log(action);
      console.log(collection);
      console.log(primaryGroup);
      owner[collection] = { primaryGroup, items };
      return { ...state, items: [], collection, owner };
    }
    case LOAD_NEXT_SUCCESS: {
      const map = {};
      const items = [];
      merge(map, items, state.items);
      merge(map, items, action.items);
      return { ...state, items };
    }
    case SELECT_ITEMS: {
      const { context, items } = state;
      const { collection, indexes } = action;
      // 配列番号を_idに変換する
      const selected = {};
      if (indexes === 'all' || indexes === 'none') {
        console.log();
      } else {
        indexes.forEach(i => {
          selected[items[i]._id] = true;
        });
      }

      const newContext = { ...context };
      newContext[collection] = {
        selected,
        indexes,
      };

      return { ...state, context: newContext };
    }
    case DO_SELECT: {
      browserHistory.goBack();
      return { ...state, item: action.item };
    }
    default:
      return state;
  }
};

export default ListReducer;
