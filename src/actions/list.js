export const CLEAR = 'CLEAR';
export const SET_COLLECTION = 'SET_COLLECTION';
export const SELECT_ITEMS = 'SELECT_ITEMS';
export const INIT_OWNER = 'INIT_OWNER';
export const INIT_OWNER_SUCCESS = 'INIT_OWNER_SUCCESS';
export const LOAD_NEXT = 'LOAD_NEXT';
export const LOAD_NEXT_SUCCESS = 'LOAD_NEXT_SUCCESS';
export const DO_SELECT = 'DO_SELECT';
export const DO_SEARCH = 'DO_SEARCH';
export const DROP = 'DROP';
export const DOWNLOAD = 'DOWNLOAD';

export const clear = () => ({
  type: CLEAR,
});

export const drop = ({ collection, file }) => ({
  type: DROP,
  collection,
  file,
});

export const download = ({ key }) => ({
  type: DOWNLOAD,
  key,
});

export const setCollection = ({ collection }) => ({
  type: SET_COLLECTION,
  collection,
});

export const selectItems = ({ collection, indexes }) => ({
  type: SELECT_ITEMS,
  collection,
  indexes,
});

export const initOwner = ({ collection, primaryGroup }) => ({
  type: INIT_OWNER,
  collection,
  primaryGroup,
});

export const initOwnerSuccess = ({ collection, primaryGroup, items }) => ({
  type: INIT_OWNER_SUCCESS,
  collection,
  primaryGroup,
  items,
});

export const loadNext = ({ skip }) => ({
  type: LOAD_NEXT,
  skip,
});

export const loadNextSuccess = ({ items }) => ({
  type: LOAD_NEXT_SUCCESS,
  items,
});

export const doSelect = ({ item }) => ({
  type: DO_SELECT,
  item,
});

export const doSearch = ({ collection, condition, order, orderBy }) => ({
  type: DO_SEARCH,
  collection,
  condition,
  order,
  orderBy,
});


