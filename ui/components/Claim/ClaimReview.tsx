import React, { ReactElement } from "react"
import {
  Referrer,
  selectClaimSelections,
} from "@tallyho/tally-background/redux-slices/claim"
import SharedButton from "../Shared/SharedButton"
import AmountBanner from "./ClaimAmountBanner"
import ClaimDelegateChoiceProfile from "./ClaimDelegateChoiceProfile"
import { useBackgroundSelector } from "../../hooks"
import SharedAddressAvatar from "../Shared/SharedAddressAvatar"

export default function ClaimReview({
  claimAmount,
  backToChooseDelegate,
  backToChooseReferrer,
}: {
  claimAmount: number
  backToChooseReferrer: () => void
  backToChooseDelegate: () => void
}): ReactElement {
  const { selectedDelegate, selectedForBonus } = useBackgroundSelector(
    selectClaimSelections
  )
  const referrer: Referrer | null = useBackgroundSelector(
    (state) => state.claim.referrer
  )

  return (
    <div className="claim standard_width">
      <div className="title">Review claim</div>
      <div className="description_review">You will receive</div>
      <AmountBanner amount={claimAmount} showLabel showBonus />
      <ClaimDelegateChoiceProfile
        discard={backToChooseReferrer}
        name={
          referrer?.ensName ??
          referrer?.address ??
          selectedForBonus?.name ??
          selectedForBonus?.address ??
          ""
        }
        avatar={
          referrer || !selectedForBonus?.avatar
            ? undefined
            : `./images/DAOs/${selectedForBonus?.avatar}`
        }
      />
      <div className="description_review">Chosen delegate</div>
      <div className="content">
        <SharedAddressAvatar
          address={selectedDelegate?.address ?? ""}
          url={selectedDelegate?.avatar}
        />
        <div className="option">
          <div className="left">
            {selectedDelegate?.ensName ? (
              <span>{selectedDelegate?.ensName}</span>
            ) : null}
            <span>{selectedDelegate?.truncatedAddress}</span>
          </div>
          <div className="right">
            <SharedButton
              type="tertiaryGray"
              size="small"
              onClick={backToChooseDelegate}
            >
              Change
            </SharedButton>
          </div>
        </div>
      </div>
      <style jsx>
        {`
          .claim {
            display: flex;
            flex-flow: column;
            flex-grow: 1;
          }
          .title {
            font-family: Quincy CF;
            font-size: 42px;
            line-height: 58px;
            margin-top: 12px;
          }
          .description_review {
            font-size: 16px;
            line-height: 24px;
            margin-top: 14px;
            color: var(--green-40);
          }
          .content {
            width: 352px;
            height: 64px;
            border-radius: 8px;
            background-color: var(--green-95);
            padding: 12px 16px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            box-shadow: var(--shadow);
          }
          .option {
            display: flex;
            justify-content: space-between;
            width: inherit;
            align-items: center;
            margin-left: 12px;
          }
          .left {
            display: flex;
            flex-direction: column;
            color: var(--green-60);
            font-size: 16px;
            line-height: 20px;
          }
          .left span:first-of-type {
            color: #fff;
          }
        `}
      </style>
    </div>
  )
}
