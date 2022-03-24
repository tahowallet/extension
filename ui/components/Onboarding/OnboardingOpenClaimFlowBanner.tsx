import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import classNames from "classnames"
import { fromFixedPointNumber } from "@tallyho/tally-background/lib/fixed-point"
import {
  selectCurrentAccount,
  selectCurrentAccountSigningMethod,
} from "@tallyho/tally-background/redux-slices/selectors"
import { SigningMethod } from "@tallyho/tally-background/redux-slices/signing"
import {
  selectClaimed,
  selectClaimError,
  selectCurrentlyClaiming,
} from "@tallyho/tally-background/redux-slices/claim"
import { tallyTokenDecimalDigits } from "../../utils/constants"
import { useBackgroundSelector, useLocalStorage } from "../../hooks"
import SharedButton from "../Shared/SharedButton"

function EligibleCTAContent({
  currentAccountSigningMethod,
  claimAmount,
  isCurrentlyClaiming,
  claimError,
}: {
  currentAccountSigningMethod: SigningMethod | null
  claimAmount: string
  isCurrentlyClaiming: boolean
  claimError: boolean
}) {
  const getComponentToDisplay = () => {
    if (isCurrentlyClaiming) {
      return <div className="claiming">Claiming...</div>
    }
    if (claimError) {
      return (
        <div className="claimError">
          Something went wrong, please try claiming again.
        </div>
      )
    }
    return (
      <div className="claimable_woohoo">
        {currentAccountSigningMethod
          ? "Wohoo! You can claim"
          : "Upgrade your wallet to claim"}
      </div>
    )
  }
  return (
    <>
      <div>
        <img className="image" src="./images/claim@2x.png" alt="" />
      </div>
      <div
        className={classNames("claimable_container", {
          isCurrentlyClaiming: "left",
        })}
      >
        {getComponentToDisplay()}
        <div>
          <span className="claimable_amount">{claimAmount}</span> TALLY
        </div>
      </div>
      {!isCurrentlyClaiming ? (
        <Link
          to="/eligible"
          className={classNames({
            no_click: !currentAccountSigningMethod,
          })}
        >
          <div className="link_content">
            <img
              className="link_icon"
              src="./images/continue.svg"
              alt="Claim tokens"
            />
          </div>
        </Link>
      ) : (
        <></>
      )}
      <style>
        {`
          .image {
            width: 72px;
            position: relative;
            top: -3px;
            left: 1px;
          }
          .claimable_container {
            display: flex;
            flex-flow: column;
            position: relative;
            top: 4px;
            color: var(--green-40);
            font-size: 14px;
            width: 190px;
          }
          .left {
            justify-self: flex-start;
          }
          .claiming{
            color: var(--trophy-gold);
          }
          .claimError{
            color: var(--error);
          }
          .claimable_amount {
            font-family: Quincy CF;
            font-size: 36px;
            line-height: 38px;
            color: #22c480;
          }
          .link_content {
            width: 40px;
            height: 74px;
            background-color: var(--trophy-gold);
            border-radius: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 18px;
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

  const hideOnboardingClaimBanner = currentAccount.address in claimed

  if (
    (claimAmount === "0" && showOrHide === "hide") ||
    hideOnboardingClaimBanner
  )
    return <></>

  return (
    <div
      className={classNames("standard_width", {
        upgrade: !currentAccountSigningMethod,
      })}
    >
      <div className={classNames("banner", { left: isCurrentlyClaiming })}>
        {claimAmount !== "0" ? (
          <EligibleCTAContent
            currentAccountSigningMethod={currentAccountSigningMethod}
            claimAmount={claimAmount}
            isCurrentlyClaiming={isCurrentlyClaiming}
            claimError={claimError[currentAccount.address]}
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
            padding: 0 8px;
            box-sizing: border-box;
            margin-bottom: 20px;
            justify-content: space-between;
            align-items: center;
          }
          .left {
            justify-content: flex-start;
            gap: 20px;
          }
        `}
      </style>
    </div>
  )
}
