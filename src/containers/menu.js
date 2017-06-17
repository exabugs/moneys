import { connect } from 'react-redux';
import { closeMenu, toggleMenu, setMenu } from '../actions/menu';
import Menu from '../components/menu';


const mapStateToProps = (state) => {
  console.log(state);
  return { ...state.menu };
};

const mapDispatchToProps = (dispatch) => {
  return {
    onToggleMenu: () => {
      dispatch(toggleMenu());
    },
    onCloseMenu: () => {
      dispatch(closeMenu());
    },
    onSetMenu: (flag) => {
      dispatch(setMenu(flag));
    },
  };
};

const MenuContainer = connect(mapStateToProps, mapDispatchToProps)(Menu);

export default MenuContainer;
