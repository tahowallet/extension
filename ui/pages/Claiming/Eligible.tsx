import React, { ReactElement, useEffect, useState } from "react"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/selectors/accountsSelectors"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import { Redirect } from "react-router-dom"
import { useBackgroundSelector } from "../../hooks"
import ClaimIntro from "../../components/Claim/ClaimIntro"
import ClaimReferral from "../../components/Claim/ClaimReferral"
import ClaimReferralByUser from "../../components/Claim/ClaimReferralByUser"
import ClaimInfoModal from "../../components/Shared/SharedInfoModal"
import ClaimDelegate from "../../components/Claim/ClaimDelegate"
import ClaimReview from "../../components/Claim/ClaimReview"
import ClaimFooter from "../../components/Claim/ClaimFooter"
import ClaimSuccessModalContent from "../../components/Claim/ClaimSuccessModalContent"
import SharedSlideUpMenu from "../../components/Shared/SharedSlideUpMenu"

export default function Eligible(): ReactElement {
  const [account, setAccount] = useState("")
  const [step, setStep] = useState(1)
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const [showSuccessStep, setShowSuccessStep] = useState(false)
  const { accountData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const selectedAccountAddress =
    useBackgroundSelector(selectCurrentAccount).address

  const { delegates, DAOs, eligibility } = useBackgroundSelector((state) => {
    return {
      delegates: state.claim.delegates,
      DAOs: state.claim.DAOs,
      eligibility: state.claim.eligibles.find(
        ({ address }) => address === selectedAccountAddress
      ),
    }
  })

  useEffect(() => {
    if (Object.keys(accountData)) {
      setAccount(Object.keys(accountData)[0])
    }
  }, [accountData])

  if (Object.keys(accountData).length === 0) {
    return <Redirect to="/overview" />
  }

  const advanceStep = () => {
    setStep(step + 1)
  }

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

      <div
        className="background"
        style={{ backgroundPositionX: `${-384 * (step - 1)}px` }}
      />
      <div className="eligible">
        <div
          className="steps-container"
          style={{ transform: `translateX(${-384 * (step - 1)}px)` }}
        >
          <ClaimIntro eligibility={eligibility} />
          <ClaimReferral DAOs={DAOs} />
          <ClaimReferralByUser />
          <ClaimDelegate delegates={delegates} />
          <ClaimReview />
        </div>
        <footer>
          <ClaimFooter
            step={step}
            setStep={setStep}
            advanceStep={advanceStep}
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
            box-shadow: 0px -10px 13px 6px var(--green-95);
            transition: all 0.7s cubic-bezier(0.86, 0, 0.07, 1);
          }
          .eligible {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            flex-grow: 1;
            width: 352px;
            margin: 0 auto;
          }
          footer {
            position: fixed;
            bottom: 0px;
          }
        `}
      </style>
    </div>
  )
}
