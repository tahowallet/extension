import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/accounts"
import React, { ReactElement, useEffect, useState } from "react"
import { Link, Redirect } from "react-router-dom"
import TopMenu from "../../components/TopMenu/TopMenu"
import TopMenuProfileButton from "../../components/TopMenu/TopMenuProfileButton"
import { useBackgroundSelector } from "../../hooks"
import Intro from "../../components/Claim/Intro"
import Referral from "../../components/Claim/Referral"
import InfoModal from "../../components/Claim/InfoModal"
import TopBar from "../../components/Claim/TopBar"
import AmountBanner from "../../components/Claim/AmountBanner"
import Delegate from "../../components/Claim/Delegate"
import ChoseModal from "../../components/Claim/ChooseModal"
import Review from "../../components/Claim/Review"
import ClaimFooter from "../../components/Claim/ClaimFooter"

export default function Eligible(): ReactElement {
  const [account, setAccount] = useState("")
  const [step, setStep] = useState(1)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const [choseDelegateModalVisible, setChoseDelegateModalVisible] =
    useState(false)
  const { accountData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  useEffect(() => {
    if (Object.keys(accountData)) {
      setAccount(Object.keys(accountData)[0])
    }
  }, [accountData])

  if (Object.keys(accountData).length === 0) {
    return <Redirect to="/overview" />
  }

  const alreadyClaimedAddresses: string[] = []
  const advanceStep = () => {
    // alreadyClaimedAddresses.push(account)
    // setAlreadyClaimed(true)
    setStep(step + 1)
    // console.log(claimTally())
    // await claimTally()
  }

  const openInfoModal = () => {
    setInfoModalVisible(true)
  }
  const openChooseModal = () => {
    setChoseDelegateModalVisible(true)
  }

  return (
    <>
      <div className="wrap">
        {infoModalVisible ? (
          <InfoModal setModalVisible={setInfoModalVisible} />
        ) : null}
        {choseDelegateModalVisible ? (
          <ChoseModal setModalVisible={setChoseDelegateModalVisible} />
        ) : null}
        <TopBar />
        <div
          className="background"
          style={{ backgroundPositionX: `${(step - 1) * 80}%` }}
        />
        <div className="eligible">
          <div
            className="steps-container"
            style={{ transform: `translateX(${-384 * (step - 1)}px)` }}
          >
            <Intro />
            <Referral />
            <Delegate openInfo={openInfoModal} openChoose={openChooseModal} />
            <Review />
          </div>
          <ClaimFooter
            step={step}
            setStep={setStep}
            advanceStep={advanceStep}
          />
        </div>
        <style jsx>
          {`
            .steps-container {
              display: flex;
              position: relative;
              gap: 32px;
              align-self: flex-start;
              transition: all 0.6s ease-in-out;
            }

            .wrap {
              width: 100%;
              height: 100vh;
              background-color: #193330;
              display: flex;
              flex-flow: column;
            }
            .background {
              width: 100%;
              height: 100vh;
              position: absolute;
              background-image: url("./images/dark_forest@2x.png");
              background-repeat: repeat-x;
              background-position: bottom;
              transition: all 0.6s ease-in-out;
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
          `}
        </style>
      </div>
    </>
  )
}
