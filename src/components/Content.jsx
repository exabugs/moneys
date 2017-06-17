import React, { PropTypes } from 'react';

const Content = ({ children }) => (
  <div>
    {children}
  </div>
);

Content.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Content;
