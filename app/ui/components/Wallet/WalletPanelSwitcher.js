import React from 'react';
import PropTypes from 'prop-types';

export default function WalletPanelSwitcher(props) {
  const { setPanelNum, panelNum } = props;

  return (
    <>
      <div className="wrap">
        <div className="wrap_inner">
          <button
            type="button"
            onClick={() => {
              setPanelNum(0);
            }}
            className={`option${panelNum === 0 ? ' selected' : ''}`}
          >
            Assets
          </button>
          <button
            type="button"
            onClick={() => {
              setPanelNum(1);
            }}
            className={`option${panelNum === 1 ? ' selected' : ''}`}
          >
            Activity
          </button>
        </div>
      </div>
      <style jsx>
        {`
          .wrap {
            width: 100%;
            border-bottom: 1px solid #001413;
          }
          .wrap_inner {
            display: flex;
            padding-left: 24px;
            padding-bottom: 12px;
          }
          .option {
            margin-right: 16px;
            cursor: pointer;
          }
          .selected {
            font-weight: 500;
            color: #d08e39;
            text-align: center;
            display: flex;
            justify-content: center;
          }
          .selected::after {
            content: '';
            width: 18px;
            height: 2px;
            background-color: #d08e39;
            border-radius: 10px;
            position: absolute;
            display: block;
            margin-top: 29px;
          }
        `}
      </style>
    </>
  );
}

WalletPanelSwitcher.propTypes = {
  setPanelNum: PropTypes.func.isRequired,
  panelNum: PropTypes.number.isRequired,
};
