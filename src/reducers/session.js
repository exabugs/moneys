import { DO_ACCESS, LOGIN_SUCCESS, LOGIN_FAILER } from '../actions/session';

const data = {
  state: false,
};

const MenuReducer = (state = data, action) => {
  switch (action.type) {
    case DO_ACCESS:
      return { ...state, path: action.path };
    case LOGIN_SUCCESS:
      return { ...state, ...action, state: true };
    case LOGIN_FAILER:
      return { ...state, state: false };
    default:
      return state;
  }
};

export default MenuReducer;
