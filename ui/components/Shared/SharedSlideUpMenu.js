import React from 'react';
import PropTypes from 'prop-types';
import TopMenuProtocolList from '../TopMenu/TopMenuProtocolList';

export default function SharedSlideUpMenu(props) {
  const { isOpen, isRunAnimation, close } = props;

  return (
    <>
      <div
        className={`slide_up_menu ${
          isRunAnimation && !isOpen ? ' closed_animate' : ''
        }${isRunAnimation && isOpen ? ' open_animate' : ''}
        ${!isRunAnimation && !isOpen ? ' closed' : ''}`}
      >
        <button
          type="button"
          className="icon_close"
          onClick={close}
          label="Close menu"
        />
        <TopMenuProtocolList />
      </div>
      <style jsx>
        {`
          .slide_up_menu {
            width: 100vw;
            height: 536px;
            border-radius: 16px;
            background-color: #193330;
            position: fixed;
            left: 0px;
            right: 0px;
            bottom: 0px;
            z-index: 999;
            transform: translateY(536px);
            padding-top: 24px;
            box-sizing: border-box;
          }
          .icon_close {
            background: url('/assets/img/close.svg');
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
            position: absolute;
            right: 24px;
          }
          .open_animate {
            transform: translateY(0px);
            animation: slideUp cubic-bezier(0.19, 1, 0.22, 1) 0.445s;
            animation-direction: forward;
          }
          .closed {
            transform: translateY(536px);
          }
          .closed_animate {
            transform: translateY(536px);
            animation: slideDown linear 0.16s;
            animation-direction: backward;
          }
          @keyframes slideUp {
            0% {
              transform: translateY(536px);
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
              transform: translateY(536px);
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
};
