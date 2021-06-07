import React from 'react';
import PropTypes from 'prop-types';

export default function SharedSlideUpMenu(props) {
  const { isOpen, isRunAnimation, close, size, children } = props;

  let menuHeight = '536px';
  if (size === 'large') {
    menuHeight = '600px';
  } else if (size === 'small') {
    menuHeight = '268px';
  }

  return (
    <>
      <div
        className={`slide_up_menu
        ${size === 'large' ? ' large' : ''}
        ${isRunAnimation && !isOpen ? ' closed_animate' : ''}
        ${isRunAnimation && isOpen ? ' open_animate' : ''}
        ${!isRunAnimation && !isOpen ? ' closed' : ''}`}
      >
        <button
          type="button"
          className="icon_close"
          onClick={close}
          label="Close menu"
        />
        {children}
      </div>
      <style jsx>
        {`
          .slide_up_menu {
            width: 100vw;
            height: ${menuHeight};
            border-radius: 16px;
            background-color: var(--green-95);
            position: fixed;
            left: 0px;
            right: 0px;
            bottom: 0px;
            z-index: 999;
            transform: translateY(${menuHeight});
            padding-top: 24px;
            box-sizing: border-box;
          }
          .icon_close {
            background: url('./images/close.svg');
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
            position: absolute;
            right: 24px;
          }
          .large {
            background-color: #002522;
          }
          .open_animate {
            transform: translateY(0px);
            animation: slideUp cubic-bezier(0.19, 1, 0.22, 1) 0.445s;
            animation-direction: forward;
          }
          .closed {
            transform: translateY(${menuHeight});
          }
          .closed_animate {
            transform: translateY(${menuHeight});
            animation: slideDown linear 0.16s;
            animation-direction: backward;
          }
          @keyframes slideUp {
            0% {
              transform: translateY(${menuHeight});
            }
            100% {
              transform: translateY(0px);
            }
          }
          @keyframes slideDown {
            0% {
              transform: translateY(0px);
            }
            100% {
              transform: translateY(${menuHeight});
            }
          }
        `}
      </style>
    </>
  );
}

SharedSlideUpMenu.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isRunAnimation: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

SharedSlideUpMenu.defaultProps = {
  size: 'medium',
};
