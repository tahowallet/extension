import React, { ReactElement, useState } from "react"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/selectors/accountsSelectors"
import { fromFixedPointNumber } from "@tallyho/tally-background/lib/fixed-point"
import {
  setClaimStep,
  selectClaimSelections,
} from "@tallyho/tally-background/redux-slices/claim"
import { Redirect, useHistory } from "react-router-dom"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import ClaimIntro from "../../components/Claim/ClaimIntro"
import ClaimReferral from "../../components/Claim/ClaimReferral"
import ClaimReferralByUser from "../../components/Claim/ClaimReferralByUser"
import ClaimManifesto from "../../components/Claim/ClaimManifesto"
import ClaimInfoModal from "../../components/Shared/SharedInfoModal"
import ClaimDelegate from "../../components/Claim/ClaimDelegate"
import ClaimReview from "../../components/Claim/ClaimReview"
import ClaimFooter from "../../components/Claim/ClaimFooter"
import ClaimSuccessModalContent from "../../components/Claim/ClaimSuccessModalContent"
import SharedSlideUpMenu from "../../components/Shared/SharedSlideUpMenu"
import { doggoTokenDecimalDigits } from "../../utils/constants"
import TopMenuProfileButton from "../../components/TopMenu/TopMenuProfileButton"
import SharedBackButton from "../../components/Shared/SharedBackButton"

export default function Eligible(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const { delegates, DAOs, claimAmount, step, referrer } =
    useBackgroundSelector((state) => {
      return {
        delegates: state.claim.delegates,
        DAOs: state.claim.DAOs,
        claimAmount:
          state.claim?.eligibility &&
          fromFixedPointNumber(
            {
              amount: BigInt(Number(state.claim?.eligibility?.amount)) || 0n,
              decimals: doggoTokenDecimalDigits,
            },
            0
          ),
        step: state.claim.claimStep,
        referrer: state.claim.referrer,
      }
    })

  const history = useHistory()
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const [showSuccessStep, setShowSuccessStep] = useState(false)
  const { accountData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )
  const { selectedDelegate, selectedForBonus } = useBackgroundSelector(
    selectClaimSelections
  )
  const hasAccounts = useBackgroundSelector(
    (state) => Object.keys(state.account.accountsData).length > 0
  )

  if (!hasAccounts) {
    return <Redirect to="/onboarding/infoIntro" />
  }

  if (Object.keys(accountData).length === 0) {
    return <Redirect to="/overview" />
  }

  function setStep(newStep: number) {
    dispatch(setClaimStep(newStep))
  }

  const advanceStep = () => {
    if (step < 5) {
      setStep(step + 1)
    }
  }

  const BONUS_PERCENT = 0.05
  if (!claimAmount) return <></>

  const claimAmountWithBonus = claimAmount + claimAmount * BONUS_PERCENT

  const handleSuccessModalClose = () => {
    setShowSuccessStep(false)
    history.push("/")
  }

  const stepsComponents = [
    { component: <ClaimIntro claimAmount={claimAmount} />, canAdvance: true },
    {
      component:
        referrer !== null ? (
          <ClaimReferralByUser claimAmount={claimAmount} />
        ) : (
          <ClaimReferral DAOs={DAOs} claimAmount={claimAmount} />
        ),
      canAdvance: Boolean(selectedForBonus) || Boolean(referrer),
    },
    {
      component: <ClaimManifesto claimAmount={claimAmountWithBonus} />,
      canAdvance: true,
    },
    {
      component: (
        <ClaimDelegate
          delegates={delegates}
          claimAmount={claimAmountWithBonus}
        />
      ),
      canAdvance: Boolean(selectedDelegate.truncatedAddress),
    },
    {
      component: (
        <ClaimReview
          claimAmount={claimAmountWithBonus}
          backToChooseDelegate={() => {
            setStep(step - 1)
          }}
          backToChooseReferrer={() => setStep(step - 3)}
        />
      ),
      canAdvance: true,
    },
  ]

  return (
    <div className="wrap">
      {infoModalVisible ? (
        <ClaimInfoModal setModalVisible={setInfoModalVisible} />
      ) : null}

      <SharedSlideUpMenu
        isOpen={showSuccessStep}
        close={handleSuccessModalClose}
        size="large"
      >
        <ClaimSuccessModalContent close={handleSuccessModalClose} />
      </SharedSlideUpMenu>

      <div className="eligible">
        <div className="top_bar standard_width">
          <SharedBackButton
            path="/"
            onClick={
              step > 1
                ? () => {
                    setStep(step - 1)
                  }
                : undefined
            }
          />
          <div className="profile_wrap">
            <TopMenuProfileButton />
          </div>
        </div>
        <div className="steps-container">
          {stepsComponents[step - 1].component}
        </div>
      </div>
      <footer>
        <ClaimFooter
          step={step}
          advanceStep={advanceStep}
          showSuccess={() => {
            setShowSuccessStep(true)
          }}
          isAdvanceable={stepsComponents[step - 1].canAdvance}
        />
      </footer>
      <style jsx>
        {`
          .steps-container {
            align-self: flex-start;
            margin-top: -10px;
            height: 492px;
            overflow: scroll;
            padding: 0px 16px;
            background-image: url("./images/dark_forest_bg@2x.png");
            background-size: 384px 274px;
            background-position: top;
            background-color: var(--hunter-green);
            background-attachment: local, scroll;
            background-repeat: no-repeat;
            margin-bottom: -16px;
          }
          .wrap {
            width: 100%;
            display: flex;
            flex-flow: column;
            position: relative;
          }
          .eligible {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            flex-grow: 1;
            width: 100%;
            margin: 0 auto;
            box-sizing: border-box;
            background-color: var(--green-95);
          }
          footer {
            background-color: var(--hunter-green);
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 63px;
          }
          .top_bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .profile_wrap {
            pointer-events: none;
            transform: translateY(-5px);
          }
        `}
      </style>
    </div>
  )
}
