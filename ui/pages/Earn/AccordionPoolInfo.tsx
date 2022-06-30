import { AvailableVault } from "@tallyho/tally-background/redux-slices/earn"
import React, { ReactElement } from "react"
import SharedAssetIcon from "../../components/Shared/SharedAssetIcon"
import SharedButton from "../../components/Shared/SharedButton"

export const AccordionPoolInfoHeader = (): ReactElement => (
  <>
    <div className="accordion_header">Pool info/links</div>
    <style jsx>{`
      .accordion_header {
        color: var(--green-40);
        font-size: 14px;
        height: 28px;
        padding: 0 8px;
        display: flex;
        align-items: center;
      }
    `}</style>
  </>
)

export const AccordionPoolInfoContent = ({
  vault,
}: {
  vault?: AvailableVault
}): ReactElement => (
  <div className="pool_container">
    <p className="pool_row">
      This is a Yearn vault with a Variable APR (vAPR). It has an APY supplied
      by a Yearn strategy and an APR, supplied by Tally Ho!
    </p>
    <SharedButton
      type="tertiary"
      size="medium"
      iconSmall="new-tab"
      iconPosition="left"
    >
      Read more about strategies
    </SharedButton>
    <div className="divider" />
    <p className="pool_row">Underlying Yearn vault</p>
    <SharedButton
      type="tertiary"
      size="medium"
      iconSmall="new-tab"
      iconPosition="left"
    >
      See vault
    </SharedButton>
    <div className="divider" />
    <div className="pool_asset">
      <SharedAssetIcon size="medium" symbol="DOGGO" />
      <p className="pool_row">
        $DOGGO APR rewards will be claimable at any time, without withdrawing
        your deposit
      </p>
    </div>
    <div className="pool_asset">
      <SharedAssetIcon
        size="medium"
        symbol={vault?.asset?.symbol}
        logoURL={vault?.icons?.[1] ?? vault?.icons?.[0]}
      />
      <p className="pool_row">
        ${vault?.asset.symbol} APY will be auto compounded and withdraw-able
        together with your deposit.
      </p>
    </div>
    <style jsx>{`
      .pool_container {
        padding: 5px 10px 0;
      }
      .pool_row {
        margin: 10px 0;
        line-height: 24px;
        flex-shrink: 1;
        flex-grow: 0;
      }
      .pool_asset {
        display: flex;
        margin-bottom: 16px;
      }
      .pool_asset .pool_row {
        margin: 0 0 0 10px;
      }
      .divider {
        background-color: var(--green-95);
        height: 1px;
        width: 100%;
        margin: 10px 0 16px;
      }
    `}</style>
  </div>
)
