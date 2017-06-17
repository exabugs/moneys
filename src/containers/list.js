import { connect } from 'react-redux';
import List from '../components/list';

import { loadNext, initOwner, selectItems, doSelect, doSearch, drop, download } from '../actions/list';
import { detail } from '../actions/detail';

const mapStateToProps = (state) => {
  console.log(state);
  return { ...state.list };
};

const mapDispatchToProps = (dispatch) => {
  return {
    onLoadNext: (param) => {
      dispatch(loadNext(param));
    },
    onInitOwner: (param) => {
      dispatch(initOwner(param));
    },
    onRowSelection: (param) => {
      dispatch(selectItems(param));
    },
    onDetail: (param) => {
      dispatch(detail(param));
    },
    onSelected: (param) => {
      dispatch(doSelect(param));
    },
    onSearch: (param) => {
      dispatch(doSearch(param));
    },
    onDrop: (param) => {
      dispatch(drop(param));
    },
    onDownload: (param) => {
      dispatch(download(param));
    },
  };
};

const ListContainer = connect(mapStateToProps, mapDispatchToProps)(List);

export default ListContainer;
