import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import classNames from "classnames"
import {
  selectCurrentAccount,
  selectCurrentAccountSigner,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  selectClaimed,
  selectClaimError,
  selectCurrentlyClaiming,
  selectEligibility,
  selectEligibilityLoading,
} from "@tallyho/tally-background/redux-slices/claim"

import {
  AccountSigner,
  ReadOnlyAccountSigner,
} from "@tallyho/tally-background/services/signing"
import { useBackgroundSelector, useLocalStorage } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"

function EligibleCTAContent({
  currentAccountSigner,
  claimAmount,
  isCurrentlyClaiming,
  hasAlreadyClaimed,
  hasError,
  handleCloseBanner,
}: {
  currentAccountSigner: AccountSigner
  claimAmount: string
  isCurrentlyClaiming: boolean
  hasError: boolean
  hasAlreadyClaimed: boolean
  handleCloseBanner: () => void
}) {
  const getComponentToDisplay = () => {
    if (isCurrentlyClaiming) {
      return <div className="claim_progress">Claiming...</div>
    }
    if (hasError) {
      return <div className="claim_error ">Claiming failed. Try again</div>
    }
    if (hasAlreadyClaimed) {
      return <div className="claim_success">Successfully claimed</div>
    }
    return <div>Wohoo! You can claim</div>
  }
  const amount = Number(claimAmount)
  const amountWithBonus = amount + amount * 0.05
  const isFirstClaim = !hasAlreadyClaimed && !hasError && !isCurrentlyClaiming

  return (
    <>
      <img className="image" src="./images/claim@2x.png" alt="" />
      <div className="claimable_container">
        {getComponentToDisplay()}
        <div>
          <span
            className={classNames("claimable_amount", {
              has_highlight: isFirstClaim,
            })}
          >
            {isFirstClaim ? claimAmount : amountWithBonus}
          </span>{" "}
          DOGGO
        </div>
        {currentAccountSigner === ReadOnlyAccountSigner ? (
          <div>Upgrade above to claim</div>
        ) : (
          <></>
        )}
      </div>
      {hasAlreadyClaimed ? (
        <SharedIcon
          icon="close.svg"
          width={12}
          color="var(--green-40)"
          hoverColor="#fff"
          ariaLabel="Close banner"
          onClick={handleCloseBanner}
          customStyles={`
            align-self: flex-start;
            margin: 10px 12px;
          `}
        />
      ) : (
        <Link
          to="/eligible"
          className={classNames({
            no_click: isCurrentlyClaiming,
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
    <div className="banner_right">
      <div className="banner_top">
        <p>
          Looks like there are no tokens to claim.
          <br /> Try another address or see other ways to earn
        </p>

        <SharedIcon
          icon="close.svg"
          width={12}
          color="var(--green-40)"
          onClick={handleCloseBanner}
          ariaLabel="Close menu"
          customStyles={`
            margin-top: 8px;
            margin-right: 8px;
            flex-shrink: 0;
          `}
        />
      </div>
      <div className="banner_bottom">
        <SharedButton
          type="tertiary"
          size="small"
          linkTo="/onboarding/add-wallet"
          iconSmall="add"
          iconPosition="left"
        >
          Add wallet
        </SharedButton>
        <SharedButton
          type="tertiary"
          size="small"
          iconSmall="new-tab"
          iconPosition="left"
        >
          Learn more
        </SharedButton>
      </div>
      <style>
        {`
          .banner_right {
            display: flex;
            flex-direction: column;
          }
          .banner_top {
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
          .banner_bottom {
            display: flex;
          }
        `}
      </style>
    </div>
  )
}

export default function OnboardingOpenClaimFlowBanner(): ReactElement {
  const claimAmount = useBackgroundSelector(selectEligibility).toString()
  const isClaimLoading = useBackgroundSelector(selectEligibilityLoading)

  const currentAccountSigner = useBackgroundSelector(selectCurrentAccountSigner)

  const claimError = useBackgroundSelector(selectClaimError)
  const currentAccount = useBackgroundSelector(selectCurrentAccount)
  const claimed = useBackgroundSelector(selectClaimed)

  const isCurrentlyClaiming = useBackgroundSelector(selectCurrentlyClaiming)

  const [addresHasNothingToClaimClosed, setAddresHasNothingToClaimClosed] =
    useLocalStorage("addresHasNothingToClaimClosed", "")
  const [addressFinishedClaiming, setAddressFinishedClaiming] = useLocalStorage(
    "addressFinishedClaiming",
    ""
  )
  const currentAddress = currentAccount.address
  const hasAlreadyClaimed = claimed[currentAddress]
  const hasError = claimError[currentAddress]
  const hasSomethingToClaim = claimAmount !== "0"

  if (
    addressFinishedClaiming.split(";").includes(currentAddress) ||
    ((!hasSomethingToClaim || isClaimLoading) &&
      addresHasNothingToClaimClosed.split(";").includes(currentAddress))
  )
    return <></>

  if (isClaimLoading)
    return (
      <SharedSkeletonLoader
        height={90}
        width={352}
        borderRadius={16}
        customStyles="margin: 0 0 20px; flex: 1 0 auto;"
      />
    )

  return (
    <div className="standard_width">
      <div className="banner">
        {hasSomethingToClaim ? (
          <EligibleCTAContent
            currentAccountSigner={currentAccountSigner}
            claimAmount={claimAmount}
            isCurrentlyClaiming={isCurrentlyClaiming}
            hasAlreadyClaimed={hasAlreadyClaimed}
            hasError={hasError}
            handleCloseBanner={() =>
              setAddressFinishedClaiming(
                `${addressFinishedClaiming};${currentAddress}`
              )
            }
          />
        ) : (
          <IneligibleCTAContent
            handleCloseBanner={() =>
              setAddresHasNothingToClaimClosed(
                `${addresHasNothingToClaimClosed};${currentAddress}`
              )
            }
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
