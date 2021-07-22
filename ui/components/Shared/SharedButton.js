import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default function SharedButton(props) {
  const { label, type, size, onClick, isDisabled, icon, iconSize } = props;

  return (
    <button
      type="button"
      className={classNames(
        { large: size === 'large' },
        { small: size === 'small' },
        { secondary: type === 'secondary' },
        { disabled: isDisabled },
        { tertiary: type === 'tertiary' },
        { 'tertiary white': type === 'tertiaryWhite' },
        { special_disabled_white: type === 'specialDisabledWhite' },
        { warning: type === 'warning' }
      )}
      onClick={onClick}
    >
      {label}
      {icon ? (
        <span
          className={`icon_button${iconSize === 'large' ? ' icon_large' : ''}`}
        />
      ) : null}
      <style jsx>
        {`
          button {
            height: 40px;
            border-radius: 4px;
            background-color: var(--trophy-gold);
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.48px;
            line-height: 24px;
            text-align: center;
            padding: 0 17px;
          }
          .icon_button {
            mask-image: url('./images/${icon}@2x.png');
            mask-size: cover;
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
            width: 24px;
            height: 24px;
            margin-left: 10px;
          }
          .secondary {
            background: unset;
            border: 2px solid var(--trophy-gold);
            color: var(--trophy-gold);
            box-sizing: border-box;
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
          .tertiary.disabled {
            color: var(--green-60);
          }
          .tertiary.disabled .icon_button {
            background-color: var(--green-60);
          }
          .special_disabled_white {
            color: #fff;
          }
          .special_disabled_white .icon_button {
            background-color: #fff;
          }
          .small {
            padding: 0 12px;
            height: 32px;
          }
          .warning {
            background-color: var(--attention);
          }
          .warning {
            color: var(--hunter-green);
          }
          .warning .icon_button {
            background-color: var(--hunter-green);
          }
        `}
      </style>
    </button>
  );
}

SharedButton.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.oneOf([
    'primary',
    'secondary',
    'tertiary',
    'tertiaryWhite',
    'specialDisabledWhite',
  ]).isRequired,
  size: PropTypes.oneOf(['medium', 'large']).isRequired,
  icon: PropTypes.string,
  iconSize: PropTypes.oneOf(['small', 'medium', 'large']),
  onClick: PropTypes.func,
  isDisabled: PropTypes.bool,
};

SharedButton.defaultProps = {
  icon: null,
  isDisabled: false,
  iconSize: 'medium',
  onClick: () => {},
};
