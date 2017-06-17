export const RESET = 'RESET';
export const REMOVE = 'REMOVE';
export const LOAD_DETAIL = 'LOAD_DETAIL';
export const LOAD_DETAIL_SUCCESS = 'LOAD_DETAIL_SUCCESS';
export const SUBMIT_DETAIL = 'SUBMIT_DETAIL';
export const SELECT = 'SELECT';
export const DONE_SELECT = 'DONE_SELECT';
export const DROP = 'DROP';

export const drop = ({ collection, file }) => ({
  type: DROP,
  collection,
  file,
});

export const reset = ({ collection, detail }) => ({
  type: RESET,
  collection,
  detail,
});

export const remove = ({ collection, detail }) => ({
  type: REMOVE,
  collection,
  detail,
});

export const loadDetail = ({ collection, id }) => ({
  type: LOAD_DETAIL,
  collection,
  id,
});

export const loadDetailSuccess = ({ collection, detail }) => ({
  type: LOAD_DETAIL_SUCCESS,
  collection,
  detail,
});

export const submitDetail = ({ collection, detail }) => ({
  type: SUBMIT_DETAIL,
  collection,
  detail,
});

export const select = ({ detail, name, fieldDef }) => ({
  type: SELECT,
  detail,
  name,
  fieldDef,
});

export const doneSelect = ({ collection, id }) => ({
  type: DONE_SELECT,
  collection,
  id,
});
