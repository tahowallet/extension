import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/accounts"
import React, { ReactElement, useEffect, useState } from "react"
import { Redirect } from "react-router-dom"
import CorePage from "../../components/Core/CorePage"
import SharedButton from "../../components/Shared/SharedButton"
import SharedInput from "../../components/Shared/SharedInput"
import { useBackgroundSelector } from "../../hooks"

export default function Eligible(): ReactElement {
  const [account, setAccount] = useState("")
  const [step, setStep] = useState(1)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
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
  const claim = () => {
    alreadyClaimedAddresses.push(account)
    setAlreadyClaimed(true)

    // console.log(claimTally())
    // await claimTally()
  }

  return (
    <CorePage>
      <div className="wrap">
        <div className="eligible">
          <div className=" banner banner-primary">
            <div>
              <img className="banner__image" src="./images/claim.png" alt="" />
            </div>
            <div className="banner__claimable">
              <div className="banner__claimable__amount">10,989</div>
              {/* I KNOW THIS SHOULD BE UPPERCASE IN CSS */}
              <div>TALLY</div>
            </div>
          </div>
          <div className="banner banner-secondary">
            <div>Referral</div>
            <div className="banner__percentage">+5%</div>
          </div>
          <div className="banner banner-secondary">
            <div>Delegate</div>
            <div className="banner__percentage">+2.5%</div>
          </div>
          <div className="claim">
            <div className="claim__title">Claim Tally</div>
            <div className="claim__description">
              Tally is an open source wallet that is run by the community and
              token holders.
            </div>
            <button className="claim__button" type="button">
              Start Process
            </button>
          </div>
        </div>
        <style jsx>
          {`
            .claim__button {
              height: 40px;
              border-radius: 4px;
              background-color: var(--trophy-gold);
              display: flex;
              align-items: center;
              justify-content: space-between;
              color: #002522;
              font-size: 20px;
              letter-spacing: 0.48px;
              line-height: 24px;
              text-align: center;
              padding: 0px 17px;
              margin-bottom: 16px;
              margin-right: 8px;
              align-self: flex-end;
              margin-top: auto;
            }
            .wrap {
              width: 100%;
              height: 100vh;
              background-image: url("./images/dark_forest@2x.png");
              background-repeat: no-repeat;
              background-position: bottom;
              background-color: #193330;
            }
            .eligible {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              height: 100%;
              width: 352px;
              margin: 0 auto;
            }
            .wrap__claim-button {
              padding: 16px;
            }
            .link {
              color: var(--trophy-gold);
            }
            .banner {
              width: 100%;
              border-radius: 16px;
              display: flex;
              padding: 0 4px;
              box-sizing: border-box;
              justify-content: space-between;
              align-items: center;
            }
            .banner-secondary {
              opacity: 0.5;
              height: 42px;
              font-family: Segment;
              font-style: normal;
              font-weight: 500;
              color: #99a8a7;
              padding: 0 12px;
              background-color: #002522;
              margin-bottom: 8px;
              font-size: 14px;
              letter-spacing: 0.03em;
            }
            .banner-primary {
              height: 58px;
              margin: 20px 0 10px 0;
              background-color: var(--hunter-green);
            }
            .banner__image {
              width: 90px;
              position: relative;
              top: -4px;
            }
            .banner__claimable__amount {
              font-family: Quincy CF;
              font-size: 30px;
              color: #22c480;
            }
            .banner__claimable {
              padding: 0 8px;
              text-align: right;
              font-size: 14px;
            }
            .banner__percentage {
              font-family: Segment;
              font-size: 18px;
              line-height: 24px;
              color: #22c480;
            }
            .claim__title {
              font-family: Quincy CF;
              font-size: 42px;
              line-height: 58px;
              margin-top: 12px;
            }
            .claim__description {
              font-family: Segment;
              font-size: 16px;
              line-height: 24px;
              color: #99a8a7;
            }
            .claim {
              display: flex;
              flex-flow: column;
              flex-grow: 1;
            }
          `}
        </style>
      </div>
    </CorePage>
  )
}
