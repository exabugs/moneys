import { connect } from 'react-redux';
import { browserHistory } from 'react-router';
import Detail from '../components/detail';

import { reset, remove, submitDetail, select, drop } from '../actions/detail';


const mapStateToProps = (state) => {
  return { ...state.detail };
};

const mapDispatchToProps = (dispatch) => {
  return {
    onSubmitDetail: (param) => {
      dispatch(submitDetail(param));
    },
    onReset: (param) => {
      dispatch(reset(param));
    },
    onRemove: (param) => {
      dispatch(remove(param));
    },
    onSelect: ({ detail, name, fieldDef }) => {
      dispatch(select({ detail, name, fieldDef }));
      browserHistory.push(`/select/${fieldDef.collection}`);
    },
    onDrop: (param) => {
      dispatch(drop(param));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Detail);
