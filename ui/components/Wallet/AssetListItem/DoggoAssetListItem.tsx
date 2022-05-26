import React, { ReactElement, useState } from "react"
import { Link } from "react-router-dom"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"

import classNames from "classnames"
import SharedAssetIcon from "../../Shared/SharedAssetIcon"
import SharedIcon from "../../Shared/SharedIcon"
import SharedTooltip from "../../Shared/SharedTooltip"
import BonusProgramModal from "../../BonusProgram/BonusProgramModal"
import styles from "./styles"

export default function DoggoAssetListItem({
  assetAmount,
}: {
  assetAmount: CompleteAssetAmount
}): ReactElement {
  const [isBonusProgramOpen, setIsBonusProgramOpen] = useState(false)

  return (
    <>
      <div className="asset_list_item">
        <div className="asset_left">
          <SharedAssetIcon symbol="DOGGO" />
          <div className="asset_left_content">
            <div className="asset_amount">
              <span className="bold_amount_count">
                {assetAmount.localizedDecimalAmount}
              </span>
              {assetAmount.asset.symbol}
            </div>
            <SharedTooltip
              width={220}
              height={27}
              IconComponent={({ isShowingTooltip }) => (
                <div
                  className={classNames("locked", {
                    hover: isShowingTooltip,
                  })}
                >
                  <SharedIcon
                    icon="lock@2x.png"
                    width={18}
                    color="var(--trophy-gold)"
                  />
                  locked
                </div>
              )}
            >
              <div>DOGGO tokens are locked.</div>
              <div>
                Until DOGGO is unlocked you will not be able to transfer or sell
                your tokens, but you can earn more by sharing your referral link
                or farming.
              </div>
            </SharedTooltip>
          </div>
        </div>
        <div className="asset_right">
          <>
            <button
              type="button"
              aria-label="Rewards program"
              onClick={() => setIsBonusProgramOpen(true)}
              className="asset_icon asset_icon_gift"
            />
            <Link to="/earn" className="asset_icon asset_icon_earn" />
          </>
        </div>
        <style jsx>{`
          ${styles}
          .locked {
            display: flex;
            align-items: center;
            gap: 5px;
            color: var(--green-20);
            font-size: 14px;
            font-weight: 500;
            padding: 4px;
            width: 70px;
            border-radius: 4px;
            margin-bottom: -5px;
            margin-left: -13px;
            cursor: pointer;
          }
          .locked:hover,
          .locked.hover {
            background: var(--green-120);
          }
        `}</style>
      </div>
      <BonusProgramModal
        isOpen={isBonusProgramOpen}
        onClose={() => {
          setIsBonusProgramOpen(false)
        }}
      />
    </>
  )
}
