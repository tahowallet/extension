import React from 'react';
import PropTypes from 'prop-types';

export default function SharedAssetsHeader(props) {
  const { label, icon } = props;

  return (
    <h1 className="header">
      <span className="icon_activity" />
      {label}
      <style jsx>
        {`
          h1 {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            margin-top: 17px;
            height: 32px;
            color: #ffffff;
            font-family: Segment;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .icon_activity {
            background: url('./images/activity_${icon}_medium@2x.png');
            background-size: cover;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
        `}
      </style>
    </h1>
  );
}

SharedAssetsHeader.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
};
