export const CLOSE_MENU = 'CLOSE_MENU';
export const TOGGLE_MENU = 'TOGGLE_MENU';
export const SET_MENU = 'SET_MENU';

export const closeMenu = () => ({
  type: CLOSE_MENU,
});

export const toggleMenu = () => ({
  type: TOGGLE_MENU,
});

export const setMenu = (flag) => ({
  type: SET_MENU,
  flag,
});
