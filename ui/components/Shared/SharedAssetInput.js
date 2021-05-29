import React, { useState } from 'react';
import PropTypes from 'prop-types';
import SharedButton from './SharedButton';
import SharedSlideUpMenu from './SharedSlideUpMenu';
import SharedAssetItem from './SharedAssetItem';

export default function SharedAssetInput(props) {
  const { isTypeDestination } = props;

  const [openAssetMenu, setOpenAssetMenu] = useState(false);
  const [isRunAnimation, setRunAnimation] = useState(false);

  function handleClick() {
    setOpenAssetMenu(!openAssetMenu);
    setRunAnimation(true);
  }

  return (
    <>
      <SharedSlideUpMenu
        isOpen={openAssetMenu}
        isRunAnimation={isRunAnimation}
        close={handleClick}
      >
        <>
          <div className="search_label">Select token</div>
          <input
            type="text"
            className="search"
            value="Search by name or address"
          />
          {['', '', '', '', '', '', '', '', '', '', '', '', ''].map(() => (
            <>
              <SharedAssetItem />
            </>
          ))}
        </>
      </SharedSlideUpMenu>
      <div className="wrap">
        {isTypeDestination ? (
          <>
            <input className="token_input" type="text" value="0x..." />
            <SharedButton
              type="tertiary"
              size="medium"
              label="Paste"
              icon="paste"
              iconSize="large"
            />
          </>
        ) : (
          <>
            <SharedButton
              type="secondary"
              size="medium"
              label="Select token"
              icon="chevron"
              onClick={handleClick}
            />
            <input className="input_amount" type="text" placeholder="0.0" />
          </>
        )}
      </div>
      <style jsx>
        {`
          .search_label {
            height: 20px;
            color: var(--green-60);
            font-family: Segment;
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-left: 28px;
            margin-bottom: 16px;
          }
          .search {
            width: 336px;
            height: 48px;
            border-radius: 4px;
            border: 1px solid #667c7a;
            margin-left: 24px;
            margin-bottom: 20px;
            padding-left: 16px;
            box-sizing: border-box;
            color: var(--green-40);
          }
          .wrap {
            width: 352px;
            height: 72px;
            border-radius: 4px;
            background-color: var(--green-95);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0px 16px;
            box-sizing: border-box;
          }
          .input_amount {
            width: 98px;
            height: 32px;
            color: #fefefc;
            font-family: Segment;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: right;
          }
          .token_input {
            width: 204px;
            height: 34px;
            color: var(--green-40);
            font-family: Segment;
            font-size: 28px;
            font-weight: 500;
            line-height: 32px;
          }
          .paste_button {
            height: 24px;
            color: var(--trophy-gold);
            font-family: Segment;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            text-align: center;
            display: flex;
          }
          .icon_paste {
            background: url('./images/paste@2x.png');
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-left: 8px;
          }
        `}
      </style>
    </>
  );
}

SharedAssetInput.propTypes = {
  isTypeDestination: PropTypes.bool,
};

SharedAssetInput.defaultProps = {
  isTypeDestination: false,
};
