import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default function TopMenuProtocolListItem(props) {
  const { isSelected } = props;

  return (
    <li className={classNames({ select: isSelected })}>
      <div className="left">
        <div className="icon_wrap">
          <span className="icon_eth" />
        </div>
      </div>
      <div className="right">
        <div className="title">Ethereum</div>
        <div className="sub_title">
          Mainnet{isSelected && <span className="status">Connected</span>}
        </div>
      </div>
      <style jsx>
        {`
          li {
            display: flex;
            margin-bottom: 15px;
            cursor: pointer;
          }
          .status {
            width: 76px;
            height: 17px;
            color: #22c480;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-left: 8px;
          }
          .icon_eth {
            background: url('./images/eth@2x.png');
            background-size: 18px 29px;
            width: 18px;
            height: 29px;
          }
          .icon_wrap {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            background-color: var(--hunter-green);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .left {
            margin-right: 16px;
            margin-left: 2px;
          }
          .right {
            width: 80px;
            height: 24px;
            color: var(--green-5);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .title {
            width: 80px;
            height: 24px;
            color: var(--green-5);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .sub_title {
            width: 54px;
            height: 17px;
            color: var(--green-60);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .select .icon_wrap {
            border: 2px solid #22c480;
          }
          .select .left {
            margin-left: 0px;
          }
        `}
      </style>
    </li>
  );
}

TopMenuProtocolListItem.propTypes = {
  isSelected: PropTypes.bool,
};

TopMenuProtocolListItem.defaultProps = {
  isSelected: false,
};
