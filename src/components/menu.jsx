import React, { PropTypes } from 'react';
import AppBar from 'material-ui/AppBar';
import { Link } from 'react-router';
import Drawer from 'material-ui/Drawer';
import MenuItem from 'material-ui/MenuItem';
import { FormattedMessage } from 'react-intl';

import IconButton from 'material-ui/IconButton';
import IconMenu from 'material-ui/IconMenu';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

import icons from './icons';
import menus from '../config/menus.json';

const title = 'J:Survey';

// SideMenu
const SideMenu = ({ open, onCloseMenu, onSetMenu, onToggleMenu }) => (
  <Drawer
    docked={false}
    width={200}
    open={open}
    onRequestChange={flag => onSetMenu(flag)}
  >
    <AppBar
      onLeftIconButtonTouchTap={onToggleMenu}
    />
    {menus.map(menu => (
      <MenuItem
        key={menu.link}
        onTouchTap={onCloseMenu}
        containerElement={<Link to={menu.link} />}
        primaryText={<FormattedMessage id={`menu.${menu.text}`} />}
        leftIcon={icons[menu.icon]}
      />
    ))}
  </Drawer>
);

SideMenu.propTypes = {
  open: PropTypes.bool.isRequired,
  onCloseMenu: PropTypes.func.isRequired,
  onSetMenu: PropTypes.func.isRequired,
};

const Logged = (props) => {
  return (
    <IconMenu
      {...props}
      iconButtonElement={
        <IconButton><MoreVertIcon /></IconButton>
      }
      targetOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
    >
      <MenuItem
        containerElement={<Link to="/help" />}
        primaryText="Help"
      />
      <MenuItem
        containerElement={<Link to="/signin" />}
        primaryText="Sign out"
      />
    </IconMenu>
  );
};
Logged.muiName = 'IconMenu';

// MainMenu
const Menu = (props) => {
  const { children, onToggleMenu } = props;
  return (
    <div>

      <SideMenu {...props} />

      <AppBar
        title={title}
        onLeftIconButtonTouchTap={onToggleMenu}
        iconElementRight={
          <Logged />
        }
      />

      {children}

    </div>
  );
};

Menu.propTypes = {
  children: PropTypes.node.isRequired,
  onToggleMenu: PropTypes.func.isRequired,
};

export default Menu;
