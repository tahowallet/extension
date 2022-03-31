import React, { ReactElement, useState } from "react"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/selectors/accountsSelectors"
import { fromFixedPointNumber } from "@tallyho/tally-background/lib/fixed-point"
import { advanceClaimStep } from "@tallyho/tally-background/redux-slices/claim"
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
import { tallyTokenDecimalDigits } from "../../utils/constants"
import TopMenuProfileButton from "../../components/TopMenu/TopMenuProfileButton"
import SharedBackButton from "../../components/Shared/SharedBackButton"

export default function Eligible(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const { delegates, DAOs, claimAmount, claimStep, referrer } =
    useBackgroundSelector((state) => {
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
        referrer: state.claim.referrer,
      }
    })

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
    if (step < 5) {
      setStep(step + 1)
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

  const stepsComponents = [
    <ClaimIntro claimAmount={claimAmount} />,
    referrer !== null ? (
      <ClaimReferralByUser claimAmount={claimAmount} />
    ) : (
      <ClaimReferral DAOs={DAOs} claimAmount={claimAmount} />
    ),
    <ClaimManifesto claimAmount={claimAmountWithBonus} />,
    <ClaimDelegate delegates={delegates} claimAmount={claimAmountWithBonus} />,
    <ClaimReview
      claimAmount={claimAmountWithBonus}
      backToChoose={() => {
        setStep(step - 1)
      }}
    />,
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

      <div className="background" />
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
        <div className="steps-container">{stepsComponents[step - 1]}</div>
      </div>
      <footer>
        <ClaimFooter
          step={step}
          advanceStep={advanceStep}
          showSuccess={() => {
            setShowSuccessStep(true)
          }}
        />
      </footer>
      <style jsx>
        {`
          .steps-container {
            align-self: flex-start;
            margin-top: -20px;
            height: 492px;
            overflow: scroll;
          }
          .wrap {
            width: 100%;
            display: flex;
            flex-flow: column;
            position: relative;
          }
          .background {
            width: 100%;
            background-image: url("./images/dark_forest@2x.png");
            background-repeat: repeat-x;
            background-position: bottom;
            background-color: var(--green-95);
            height: 357px;
            margin-bottom: -357px;
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
            background-color: var(--hunter-green);
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
