import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-chrome-extension-router';

export default function TabBarIcon(props) {
  const { name, isActive, component } = props;

  return (
    <>
      <Link component={component}>
        <div className={`wrap${isActive ? ' active' : ''}`}>
          <div className="icon" />
        </div>
      </Link>
      <style jsx>
        {`
          .icon {
            background: url('./images/${name}.svg');
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            cursor: pointer;
          }
          .active {
            filter: brightness(0) saturate(100%) invert(64%) sepia(9%)
              saturate(2395%) hue-rotate(354deg) brightness(89%) contrast(112%);
          }
        `}
      </style>
    </>
  );
}

TabBarIcon.propTypes = {
  name: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  component: PropTypes.node.isRequired,
};

TabBarIcon.defaultProps = {
  isActive: false,
};
