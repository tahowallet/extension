import React from "react"
import PropTypes from "prop-types"
import SharedAssetIcon from "../Shared/SharedAssetIcon"

export default function OverviewAssetsTable(props) {
  const { assets } = props
  if (!assets) return false

  return (
    <div>
      <div className="column_names standard_width">
        <div className="column_one">Asset</div>
        <div className="column_two">Price</div>
        <div className="column_three">Balance</div>
      </div>
      <div className="table">
        {assets.map((asset) => (
          <div className="row standard_width">
            <div className="row_asset column_one">
              <SharedAssetIcon size="small" />
              <span className="asset_name">KEEP</span>
            </div>
            <span className="row_price column_two">
              <span className="lighter_color">$</span>0.02827
            </span>
            <div className="row_balance column_three">
              <span>
                <span className="lighter_color">$</span>
                {asset.usd_balance}
              </span>
              <span className="balance_token_amount">
                {asset.balance.toFixed(5)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .row {
          display: flex;
          height: 55px;
          align-items: center;
          border-bottom: 1px solid var(--green-120);
        }
        .row_asset {
          display: flex;
          align-items: center;
        }
        .column_one {
          width: 40%;
        }
        .column_two {
          width: 25%;
          text-align: right;
        }
        .column_three {
          width: 35%;
          justify-self: flex-end;
          text-align: right;
        }
        .column_names {
          display: flex;
          color: var(--green-60);
          font-size: 12px;
          font-weight: 600;
          line-height: 16px;
          margin: 0 auto;
          margin-top: 23px;
          border-bottom: 1px solid var(--green-120);
          padding-bottom: 8px;
        }
        .row_balance {
          display: flex;
          flex-direction: column;
        }
        .balance_token_amount {
          color: var(--green-60);
          font-size: 14px;
          line-height: 16px;
          text-align: right;
          margin-top: 3px;
        }
        .lighter_color {
          color: var(--green-60);
        }
      `}</style>
    </div>
  )
}

OverviewAssetsTable.propTypes = {
  assets: PropTypes.shape([]).isRequired,
}
