import React, { ReactElement, useState } from "react"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/selectors/accountsSelectors"
import { fromFixedPointNumber } from "@tallyho/tally-background/lib/fixed-point"
import { advanceClaimStep } from "@tallyho/tally-background/redux-slices/claim"
import { Redirect, useHistory } from "react-router-dom"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import ClaimIntro from "../../components/Claim/ClaimIntro"
import ClaimReferral from "../../components/Claim/ClaimReferral"
import ClaimReferralByUser from "../../components/Claim/ClaimReferralByUser"
import ClaimInfoModal from "../../components/Shared/SharedInfoModal"
import ClaimDelegate from "../../components/Claim/ClaimDelegate"
import ClaimReview from "../../components/Claim/ClaimReview"
import ClaimFooter from "../../components/Claim/ClaimFooter"
import ClaimSuccessModalContent from "../../components/Claim/ClaimSuccessModalContent"
import SharedSlideUpMenu from "../../components/Shared/SharedSlideUpMenu"
import { tallyTokenDecimalDigits } from "../../utils/constants"

export default function Eligible(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const { delegates, DAOs, claimAmount, claimStep } = useBackgroundSelector(
    (state) => {
      return {
        delegates: state.claim.delegates,
        DAOs: state.claim.DAOs,
        claimAmount:
          state.claim?.eligibility &&
          fromFixedPointNumber(
            {
              amount: BigInt(Number(state.claim?.eligibility?.amount)) || 0n,
              decimals: tallyTokenDecimalDigits,
            },
            0
          ),
        claimStep: state.claim.claimStep,
      }
    }
  )

  const history = useHistory()
  const [step, setStep] = useState(claimStep)
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const [showSuccessStep, setShowSuccessStep] = useState(false)
  const { accountData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
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

  const advanceStep = () => {
    setStep(step + 1)
    if (step < 5) {
      dispatch(advanceClaimStep())
    }
  }

  const BONUS_PERCENT = 0.05
  if (!claimAmount) return <></>

  const claimAmountWithBonus = claimAmount + claimAmount * BONUS_PERCENT

  const handleSuccessModalClose = () => {
    setShowSuccessStep(false)
    history.push("/")
  }

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
        <ClaimSuccessModalContent />
      </SharedSlideUpMenu>

      <div
        className="background"
        style={{ backgroundPositionX: `${-384 * (step - 1)}px` }}
      />
      <div className="eligible">
        <div
          className="steps-container"
          style={{ marginLeft: -384 * (step - 1) }}
        >
          <ClaimIntro claimAmount={claimAmount} />
          <ClaimReferral DAOs={DAOs} claimAmount={claimAmount} />
          <ClaimReferralByUser claimAmount={claimAmount} />
          <ClaimDelegate
            delegates={delegates}
            claimAmount={claimAmountWithBonus}
          />
          <ClaimReview
            claimAmount={claimAmountWithBonus}
            backToChoose={() => {
              setStep(step - 1)
            }}
          />
        </div>
        <footer>
          <ClaimFooter
            step={step}
            setStep={setStep}
            advanceStep={advanceStep}
            showSuccess={() => {
              setShowSuccessStep(true)
            }}
          />
        </footer>
      </div>
      <style jsx>
        {`
          .steps-container {
            display: flex;
            position: relative;
            gap: 32px;
            align-self: flex-start;
            transition: all 0.7s cubic-bezier(0.86, 0, 0.07, 1);
            margin-top: -20px;
          }
          .wrap {
            width: 100%;
            display: flex;
            flex-flow: column;
            margin-top: 10px;
          }
          .background {
            width: 100%;
            position: absolute;
            background-image: url("./images/dark_forest@2x.png");
            background-repeat: repeat-x;
            background-position: bottom;
            height: 307px;
            background-color: var(--green-95);
            box-shadow: 0px -22px 8px 0px var(--green-95);
            transition: all 0.7s cubic-bezier(0.86, 0, 0.07, 1);
          }
          .eligible {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            flex-grow: 1;
            width: 100%;
            padding: 0px 16px;
            margin: 0 auto;
            overflow-x: hidden;
            box-sizing: border-box;
            padding-top: 7px;
          }
          footer {
            position: fixed;
            bottom: 0px;
            left: 0px;
            right: 0px;
            background-color: var(--hunter-green);
            padding-top: 15px;
          }
        `}
      </style>
    </div>
  )
}
