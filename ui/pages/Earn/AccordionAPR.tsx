import { AvailableVault } from "@tallyho/tally-background/redux-slices/earn"
import React, { ReactElement } from "react"
import SharedTooltip from "../../components/Shared/SharedTooltip"

export const AccordionAPRHeader = ({
  vault,
}: {
  vault: AvailableVault
}): ReactElement => (
  <div className="accordion_header">
    <div className="accordion_text">Total estimated vAPR</div>
    <div className="amount">{vault.APR?.totalAPR}</div>
    <style jsx>
      {`
        .accordion_header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 28px;
          padding: 0 8px;
        }
        .accordion_text {
          font-size: 14px;
          display: flex;
          align-items: center;
        }
        .amount {
          font-size: 18px;
          font-weight: 600;
        }
      `}
    </style>
  </div>
)

export const AccordionAPRContent = ({
  vault,
}: {
  vault: AvailableVault
}): ReactElement => (
  <>
    <ul>
      <li className="category">
        <div>${vault.asset.symbol} APY</div>
        <div>{vault.APR?.yearnAPY}</div>
      </li>
      <li>
        <div className="label">
          Annual management fee
          <span className="tooltip_inline_wrap">
            <SharedTooltip width={130} verticalPosition="bottom">
              Management Fee goes to the DAO treasury
            </SharedTooltip>
          </span>
        </div>
        <div>-{vault.managementFee}</div>
      </li>
      <li className=" category">
        <div>Estimated $DOGGO APR</div>
      </li>
      <li>
        <div className="label">If $DOGGO = $0.025</div>
        <div>{vault.APR?.high}</div>
      </li>
      <li>
        <div className="label">If $DOGGO = $0.005</div>
        <div>{vault.APR?.mid}</div>
      </li>
      <li>
        <div className="label">If $DOGGO = $0.0016</div>
        <div>{vault.APR?.low}</div>
      </li>
    </ul>
    <style jsx>
      {`
        ul {
          display: block;
          padding-bottom: 10px;
        }
        li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 48px;
          padding-right: 32px;
          font-size: 14px;
        }
        li.category {
          padding-left: 32px;
        }
      `}
    </style>
  </>
)
