import React from 'react';
import PropTypes from 'prop-types';

export default function SharedButton(props) {
  const { label } = props;

  return (
    <>
      <button type="button" className="wrap">
        {label}
        <div className="icon_button" />
      </button>
      <style jsx>
        {`
          .wrap {
            height: 40px;
            border-radius: 4px;
            background-color: #d08e39;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #ffffff;
            font-family: Segment;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.48px;
            line-height: 24px;
            text-align: center;
            padding: 0 17px;
          }
          .icon_button {
            background: url('./images/${label}@2x.png');
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
            margin-left: 9px;
          }
        `}
      </style>
    </>
  );
}

SharedButton.propTypes = {
  label: PropTypes.string.isRequired,
};
