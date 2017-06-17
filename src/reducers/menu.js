import { CLOSE_MENU, TOGGLE_MENU, SET_MENU } from '../actions/menu';

// メニューは最小は閉じている
const data = {
  open: false,
};

const MenuReducer = (state = data, action) => {
  switch (action.type) {
    case CLOSE_MENU:
      return { open: false };
    case TOGGLE_MENU:
      return { open: !state.open };
    case SET_MENU:
      return { open: action.flag };
    default:
      return state;
  }
};

export default MenuReducer;
