// @ts-check
//
import React from "react"
import PropTypes from "prop-types"
import { routes } from "../../config/routes"
import SharedButtonLink from "../Shared/SharedButtonLink"
import SharedAssetIcon from "../Shared/SharedAssetIcon"

export default function WalletAssetListItem(props) {
  const { assetAmount } = props

  // TODO: ETH price hard-coded for demo
  return (
    <li>
      <SharedButtonLink component={routes.singleAsset}>
        <button type="button" className="standard_width">
          <div className="left">
            <SharedAssetIcon />
            <div className="left_content">
              <div className="amount">
                <span className="bold_amount_count">
                  {assetAmount.localizedDecimalValue}
                </span>
                {assetAmount.asset.symbol}
              </div>
              <div className="price">${assetAmount.localizedUserValue}</div>
            </div>
          </div>
          <div className="right">
            <span className="icon_send_asset" />
            <span className="icon_swap_asset" />
          </div>
        </button>
      </SharedButtonLink>

      <style jsx>
        {`
          button {
            height: 72px;
            border-radius: 16px;
            background-color: var(--green-95);
            display: flex;
            padding: 16px;
            box-sizing: border-box;
            margin-bottom: 16px;
            justify-content: space-between;
            align-items: center;
          }
          button:hover {
            background-color: var(--green-80);
          }
          .left {
            display: flex;
          }
          .left_content {
            display: flex;
            flex-direction: column;
            height: 41px;
            justify-content: space-between;
            margin-left: 16px;
          }
          .amount {
            height: 17px;
            color: #fefefc;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-transform: uppercase;
          }
          .bold_amount_count {
            width: 70px;
            height: 24px;
            color: #fefefc;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            margin-right: 4px;
          }
          .price {
            width: 58px;
            height: 17px;
            color: var(--green-40);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .icon_send_asset {
            background: url("./images/send_asset.svg");
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .icon_swap_asset {
            background: url("./images/swap_asset.svg");
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .right {
            display: flex;
            width: 48px;
            justify-content: space-between;
            margin-right: 16px;
          }
        `}
      </style>
    </li>
  )
}

WalletAssetListItem.propTypes = {
  assetAmount: PropTypes.shape({
    localizedDecimalValue: PropTypes.string,
    balance: PropTypes.number,
    localizedUserValue: PropTypes.string,
    asset: PropTypes.shape({ symbol: PropTypes.string }),
  }).isRequired,
}
