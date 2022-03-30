import React, { ReactElement, useEffect, useState } from "react"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/selectors/accountsSelectors"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import {
  toFixedPointNumber,
  multiplyByFloat,
  convertFixedPointNumber,
} from "@tallyho/tally-background/lib/fixed-point"
import { Redirect } from "react-router-dom"
import { useBackgroundSelector } from "../../hooks"
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
import TopMenuProfileButton from "../../components/TopMenu/TopMenuProfileButton"
import SharedBackButton from "../../components/Shared/SharedBackButton"

export default function Eligible(): ReactElement {
  const [account, setAccount] = useState("")
  const [step, setStep] = useState(1)
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const [showSuccessStep, setShowSuccessStep] = useState(false)
  const { accountData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )
  const hasAccounts = useBackgroundSelector(
    (state) => Object.keys(state.account.accountsData).length > 0
  )

  const selectedAccountAddress =
    useBackgroundSelector(selectCurrentAccount).address

  const { delegates, DAOs, claimAmountHex } = useBackgroundSelector((state) => {
    return {
      delegates: state.claim.delegates,
      DAOs: state.claim.DAOs,
      claimAmountHex: state.claim?.eligibility?.earnings,
    }
  })

  useEffect(() => {
    if (Object.keys(accountData)) {
      setAccount(Object.keys(accountData)[0])
    }
  }, [accountData])

  if (!hasAccounts) {
    return <Redirect to="/onboarding/infoIntro" />
  }

  if (Object.keys(accountData).length === 0) {
    return <Redirect to="/overview" />
  }

  const advanceStep = () => {
    setStep(step + 1)
  }

  const BONUS_PERCENT = 0.05
  if (!claimAmountHex) return <></>

  const fixedPointClaimEarnings = toFixedPointNumber(Number(claimAmountHex), 18)

  const fixedPointClaimEarningsWithBonus = {
    amount:
      fixedPointClaimEarnings.amount +
      multiplyByFloat(fixedPointClaimEarnings, BONUS_PERCENT),
    decimals: fixedPointClaimEarnings.decimals,
  }

  const claimAmount = Number(
    convertFixedPointNumber(fixedPointClaimEarnings, 0).amount
  )
  const claimAmountWithBonus = Number(
    convertFixedPointNumber(fixedPointClaimEarningsWithBonus, 0).amount
  )

  const stepsComponents = [
    <ClaimIntro claimAmount={claimAmount} />,
    <ClaimReferral
      DAOs={DAOs}
      claimAmount={claimAmount}
      claimAmountWithBonus={claimAmountWithBonus}
    />,
    <ClaimManifesto claimAmount={claimAmountWithBonus} />,
    // <ClaimReferralByUser claimAmount={claimAmount} />,
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
        close={() => {
          setShowSuccessStep(false)
        }}
        size="large"
      >
        <ClaimSuccessModalContent />
      </SharedSlideUpMenu>

      <div className="background" />
      <div className="eligible">
        <div className="top_bar standard_width">
          <SharedBackButton
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
          setStep={setStep}
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
