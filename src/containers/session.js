import { connect } from 'react-redux';
import { login } from '../actions/session';
import Session from '../components/session';


const mapStateToProps = (state) => {
  console.log(state);
  // return {event: state.editor.event}
  return { ...state.session };
};

const mapDispatchToProps = (dispatch) => {
  return {
    onLogin: ({ userName, password }) => {
      dispatch(login(userName, password));
    },
  };
};

const SessionContainer = connect(mapStateToProps, mapDispatchToProps)(Session);

export default SessionContainer;
