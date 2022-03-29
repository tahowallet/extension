import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import classNames from "classnames"
import {
  selectCurrentAccount,
  selectCurrentAccountSigningMethod,
} from "@tallyho/tally-background/redux-slices/selectors"
import { fromFixedPointNumber } from "@tallyho/tally-background/lib/fixed-point"
import {
  selectClaimed,
  selectClaimError,
  selectCurrentlyClaiming,
} from "@tallyho/tally-background/redux-slices/claim"

import { SigningMethod } from "@tallyho/tally-background/utils/signing"
import { tallyTokenDecimalDigits } from "../../utils/constants"
import { useBackgroundSelector, useLocalStorage } from "../../hooks"
import SharedButton from "../Shared/SharedButton"

function EligibleCTAContent({
  currentAccountSigningMethod,
  claimAmount,
  isCurrentlyClaiming,
  hasAlreadyClaimed,
  hasError,
}: {
  currentAccountSigningMethod: SigningMethod | null
  claimAmount: string
  isCurrentlyClaiming: boolean
  hasError: boolean
  hasAlreadyClaimed: boolean
}) {
  const getComponentToDisplay = () => {
    if (isCurrentlyClaiming) {
      return <div className="claim_progress">Claiming...</div>
    }
    if (hasError) {
      return <div className="claim_error ">Claiming failed. Try again</div>
    }
    if (hasAlreadyClaimed) {
      return <div className="claim_success">Succesfully claimed</div>
    }
    if (currentAccountSigningMethod) {
      return <div>Wohoo! You can claim</div>
    }
    return <div>Upgrade your wallet to claim</div>
  }

  const isFirstClaim = !hasAlreadyClaimed && !hasError && !isCurrentlyClaiming

  return (
    <>
      <img className="image" src="./images/claim.svg" alt="" />
      <div
        className={classNames("claimable_container", {
          isCurrentlyClaiming: "left",
        })}
      >
        {getComponentToDisplay()}
        <div>
          <span
            className={classNames("claimable_amount", {
              has_highlight: isFirstClaim,
            })}
          >
            {claimAmount}
          </span>{" "}
          DOGGO
        </div>
      </div>
      {hasAlreadyClaimed ? (
        <img className="close_icon" src="./images/close.svg" alt="Close" />
      ) : (
        <Link
          to="/eligible"
          className={classNames({
            no_click: !currentAccountSigningMethod || isCurrentlyClaiming,
          })}
        >
          <div
            className={classNames("link_content", {
              disabled: isCurrentlyClaiming,
            })}
          >
            <img
              className="link_icon"
              src="./images/continue.svg"
              alt="Claim tokens"
            />
          </div>
        </Link>
      )}
      <style>
        {`
          .image {
            height: 100%;
            margin-right: 15px;
          }
          .claimable_container {
            display: flex;
            flex-grow: 1;
            flex-flow: column;
            position: relative;
            color: var(--green-40);
            font-size: 14px;
          }
          .left {
            justify-self: flex-start;
          }
          .claim_progress {
            color: var(--attention);
          }
          .claim_error {
            color: var(--error);
          }
          .claim_success {
            color: var(--success);
          }
          .claimable_amount {
            font-family: Quincy CF;
            font-size: 36px;
            line-height: 38px;
          }
          .claimable_amount.has_highlight {
            color: #22c480;
          }
          .link_content {
            width: 40px;
            height: 100%;
            background-color: var(--trophy-gold);
            border-radius: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 18px;
          }
          .link_content.disabled {
            background-color: var(--green-60);
          }
          .link_icon {
            width: 16px;
            height: 17px;
          }
          .link_content:hover {
            background-color: var(--gold-80);
          }
          .upgrade .link_content {
            background-color: var(--green-80);
          }
          .close_icon {
            align-self: flex-start;
            margin: 12px;
          }
        `}
      </style>
    </>
  )
}

function IneligibleCTAContent({
  handleCloseBanner,
}: {
  handleCloseBanner: () => void
}) {
  return (
    <div className="right">
      <div className="top">
        <p>
          Looks like there are no tokens to claim.
          <br /> Try another address or see other ways to earn
        </p>

        <button
          type="button"
          className="icon_close"
          onClick={handleCloseBanner}
          aria-label="Close menu"
        />
      </div>
      <div className="bottom">
        <SharedButton
          type="tertiary"
          size="small"
          linkTo="/onboarding/addWallet"
          icon="plus"
          iconPosition="left"
        >
          Add wallet
        </SharedButton>
        <SharedButton
          type="tertiary"
          size="small"
          icon="external_small"
          iconPosition="left"
        >
          Learn more
        </SharedButton>
      </div>
      <style>
        {`
          .icon_close {
            mask-image: url("./images/close.svg");
            mask-size: cover;
            width: 12px;
            height: 12px;
            background-color: var(--green-40);
            margin-top: 8px;
            margin-right: 8px;
            flex-shrink: 0;
          }
          .icon_close:hover {
            background-color: #fff;
          }
          .right {
            display: flex;
            flex-direction: column;
          }
          .top {
            display: flex;
            justify-content: space-between;
          }
          p {
            color: var(--green-40);
            font-size: 14.6px;
            font-weight: 500;
            line-height: 22px;
            margin-left: 11px;
            margin-bottom: -1px;
            margin-top: 1px;
          }
          .bottom {
            display: flex;
          }
        `}
      </style>
    </div>
  )
}

export default function OnboardingOpenClaimFlowBanner(): ReactElement {
  const claimAmount = useBackgroundSelector((state) =>
    fromFixedPointNumber(
      {
        amount: BigInt(Number(state.claim?.eligibility?.amount || 0n)) || 0n,
        decimals: tallyTokenDecimalDigits,
      },
      0
    ).toString()
  )

  const currentAccountSigningMethod = useBackgroundSelector(
    selectCurrentAccountSigningMethod
  )

  const claimError = useBackgroundSelector(selectClaimError)
  const currentAccount = useBackgroundSelector(selectCurrentAccount)
  const claimed = useBackgroundSelector(selectClaimed)

  const isCurrentlyClaiming = useBackgroundSelector(selectCurrentlyClaiming)

  const [showOrHide, setShowOrHide] = useLocalStorage(
    "showOrHideOnboardingClaimFlowBanner",
    "show"
  )

  const hasAlreadyClaimed = claimed[currentAccount.address]
  const hasError = claimError[currentAccount.address]
  const hasSomethingToClaim = claimAmount !== "0"

  if (
    (!hasSomethingToClaim && showOrHide === "hide") ||
    typeof hasAlreadyClaimed === "undefined"
  )
    return <></>

  return (
    <div className="standard_width">
      <div className="banner">
        {hasSomethingToClaim ? (
          <EligibleCTAContent
            currentAccountSigningMethod={currentAccountSigningMethod}
            claimAmount={claimAmount}
            isCurrentlyClaiming={isCurrentlyClaiming}
            hasAlreadyClaimed={hasAlreadyClaimed}
            hasError={hasError}
          />
        ) : (
          <IneligibleCTAContent
            handleCloseBanner={() => {
              setShowOrHide("hide")
            }}
          />
        )}
      </div>

      <style jsx>
        {`
          .banner {
            height: 90px;
            width: 100%;
            border-radius: 16px;
            background-color: var(--green-95);
            display: flex;
            padding: 8px;
            box-sizing: border-box;
            margin-bottom: 20px;
            align-items: center;
          }
        `}
      </style>
    </div>
  )
}
