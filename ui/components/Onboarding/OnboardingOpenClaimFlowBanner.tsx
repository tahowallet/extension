import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import classNames from "classnames"
import {
  toFixedPointNumber,
  fixedPointNumberToString,
} from "@tallyho/tally-background/lib/fixed-point"
import { selectCurrentAccountSigningMethod } from "@tallyho/tally-background/redux-slices/selectors"

import { useBackgroundSelector, useLocalStorage } from "../../hooks"
import SharedButton from "../Shared/SharedButton"

export default function OnboardingOpenClaimFlowBanner(): ReactElement {
  const claimAmount = useBackgroundSelector((state) =>
    fixedPointNumberToString(
      toFixedPointNumber(Number(state.claim?.eligibility?.earnings) || 0, 18)
    )
  )

  const currentAccountSigningMethod = useBackgroundSelector(
    selectCurrentAccountSigningMethod
  )

  const [showOrHide, setShowOrHide] = useLocalStorage(
    "showOrHideOnboardingClaimFlowBanner",
    "show"
  )

  function handleCloseBanner() {
    setShowOrHide("hide")
  }

  if (claimAmount === "0" && showOrHide === "hide") return <></>

  return (
    <div className="standard_width">
      <div className="banner">
        <div>
          <img className="image" src="./images/claim.png" alt="" />
        </div>
        {claimAmount > "0" ? (
          <>
            <div className="claimable">
              <div className="claimable_woohoo">
                {currentAccountSigningMethod
                  ? "Wohoo! You can claim"
                  : "Upgrade your wallet to claim"}
              </div>
              <div>
                <span className="claimable_amount">{claimAmount}</span> TALLY
              </div>
            </div>
            <Link
              to="/eligible"
              className={classNames({
                no_click: !currentAccountSigningMethod,
              })}
            >
              <div className="link_content">{">"}</div>
            </Link>
          </>
        ) : (
          <div className="right">
            <div className="top">
              <p>
                Looks like there are no <br />
                tokens to claim.
              </p>

              <button
                type="button"
                className="icon_close"
                onClick={handleCloseBanner}
                aria-label="Close menu"
              />
            </div>

            <SharedButton
              type="tertiary"
              size="small"
              linkTo="/onboarding/addWallet"
            >
              Try another address
            </SharedButton>
          </div>
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
          .icon_close {
            mask-image: url("./images/close.svg");
            mask-size: cover;
            width: 12px;
            height: 12px;
            background-color: var(--green-40);
            margin-top: 8px;
            margin-right: 8px;
          }
          .icon_close:hover {
            background-color: #fff;
          }
          .image {
            width: 72px;
            position: relative;
            top: -3px;
            left: 1px;
          }
          .claimable {
            display: flex;
            flex-flow: column;
            position: relative;
            top: 4px;
            color: var(--green-40);
            font-size: 14px;
            width: 190px;
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
            color: black;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 18px;
          }
          .upgrade .link_content {
            background-color: var(--green-80);
          }
          .right {
            display: flex;
            flex-direction: column;
            width: 258px;
          }
          .top {
            display: flex;
            justify-content: space-between;
          }
          p {
            color: var(--green-40);
            font-size: 16px;
            font-weight: 500;
            line-height: 22px;
            margin-left: 11px;
            margin-bottom: -3px;
            margin-top: 1px;
          }
        `}
      </style>
    </div>
  )
}
