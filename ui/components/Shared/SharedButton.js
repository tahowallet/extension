import React from 'react';
import PropTypes from 'prop-types';

export default function SharedButton(props) {
  const { label, type, size, onClick, isDisabled, icon, iconSize } = props;

  return (
    <>
      <button
        type="button"
        className={`wrap${size === 'large' ? ' large' : ''}${
          type === 'secondary' ? ' secondary' : ''
        }${isDisabled ? ' disabled' : ''}${
          type === 'tertiary' ? ' tertiary' : ''
        }${type === 'tertiaryWhite' ? ' tertiary white' : ''}`}
        onClick={onClick}
      >
        {label}
        {icon ? (
          <div
            className={`icon_button${
              iconSize === 'large' ? ' icon_large' : ''
            }`}
          />
        ) : null}
      </button>
      <style jsx>
        {`
          .wrap {
            height: 40px;
            border-radius: 4px;
            background-color: var(--trophy-gold);
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
            mask-image: url('./images/${icon}@2x.png');
            mask-size: 12px 12px;
            width: 12px;
            height: 12px;
            margin-left: 9px;
            background-color: #ffffff;
          }
          .large {
            height: 48px;
            border-radius: 8px;
            padding: 0 24px;
          }
          .icon_large {
            mask-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-left: 10px;
          }
          .secondary {
            background: unset;
            border: 2px solid var(--trophy-gold);
            color: var(--trophy-gold);
          }
          .secondary .icon_button {
            background-color: var(--trophy-gold);
          }
          .disabled {
            background-color: var(--green-60);
            color: var(--green-80);
          }
          .disabled .icon_button {
            background-color: var(--green-80);
          }
          .tertiary {
            color: var(--trophy-gold);
            background: unset;
            border: unset;
            padding: unset;
            font-size: 18px;
          }
          .tertiary .icon_button {
            background-color: var(--trophy-gold);
          }
          .white {
            color: #ffffff;
            font-weight: 500;
          }
          .white .icon_button {
            background-color: #ffffff;
          }
        `}
      </style>
    </>
  );
}

SharedButton.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['primary', 'secondary', 'tertiary', 'tertiaryWhite'])
    .isRequired,
  size: PropTypes.oneOf(['medium', 'large']).isRequired,
  icon: PropTypes.string,
  iconSize: PropTypes.oneOf(['medium', 'large']),
  onClick: PropTypes.func,
  isDisabled: PropTypes.bool,
};

SharedButton.defaultProps = {
  icon: null,
  isDisabled: false,
  iconSize: 'medium',
  onClick: () => {},
};
