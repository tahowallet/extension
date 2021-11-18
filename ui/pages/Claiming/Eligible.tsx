import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/accounts"
import React, { ReactElement, useEffect, useState } from "react"
import { Link, Redirect } from "react-router-dom"
import TopMenu from "../../components/TopMenu/TopMenu"
import TopMenuProfileButton from "../../components/TopMenu/TopMenuProfileButton"
import { useBackgroundSelector } from "../../hooks"

export default function Eligible(): ReactElement {
  const [account, setAccount] = useState("")
  const [step, setStep] = useState(1)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [referrCode, setReferrCode] = useState("")
  const { accountData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )
  const truncatedAccountAddress = useBackgroundSelector((background) => {
    return background.ui.selectedAccount?.truncatedAddress
  })

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
    // alreadyClaimedAddresses.push(account)
    // setAlreadyClaimed(true)
    setStep(step + 1)
    // console.log(claimTally())
    // await claimTally()
  }

  return (
    <>
      <div className="wrap">
        <div
          className="background"
          style={{ backgroundPositionX: `${(step - 1) * 80}%` }}
        />
        <div className="nav">
          <Link to="/wallet">
            <img
              src="./images/transfer@2x.png"
              alt="return"
              className="nav__back"
            />
          </Link>
          <div className="account">
            {truncatedAccountAddress}
            <div className="avatar" />
          </div>
        </div>
        <div
          className="background"
          style={{ backgroundPositionX: `${(step - 1) * 80}%` }}
        />
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
          {step === 1 && (
            <div className="claim standard_width">
              <div className="claim__title">Claim Tally</div>
              <div className="claim__description">
                Tally is an open source wallet that is run by the community and
                token holders.
              </div>
              <button className="claim__button" type="button" onClick={claim}>
                Start Process
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="claim standard_width fade-in">
              <div className="claim__title">Reffer a friend</div>
              <div className="claim__description">
                Do you have a referral code? Referral codes come in the shape of
                an ethereum address.
              </div>
              <div className="refer">
                <label htmlFor="referInput" className="refer__code">
                  Refferal code
                </label>
                <input
                  value={referrCode}
                  onChange={(e) => setReferrCode(e.target.value)}
                  id="referInput"
                  type="text"
                />
              </div>

              <button className="claim__button" type="button" onClick={claim}>
                Select degenerate
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="claim standard_width fade-in">
              <div className="claim__title">Choose a delegate!</div>
              <div className="claim__description">
                Delegates are your north-star.
              </div>
              <div className=" banner banner-delegate">
                {new Array(4).fill(null).map(() => (
                  <img
                    className="delegate__icon"
                    src="./images/uniswap@2x.png"
                    alt=""
                  />
                ))}
                <img
                  className="delegate__icon"
                  src="./images/uniswap@2x.png"
                  alt=""
                />
              </div>
              <button className="claim__button" type="button" onClick={claim}>
                Delegate and Claim
              </button>
            </div>
          )}
          {step === 4 && (
            <div className="claim standard_width fade-in">
              <div className="claim__title">Review claim</div>
              <div className="claim__description">
                Delegates are your north-star.
              </div>
              <div className=" banner banner-primary">
                <div>
                  <img
                    className="banner__image"
                    src="./images/claim.png"
                    alt=""
                  />
                </div>
                <div className="banner__claimable">
                  <div className="banner__claimable__amount">10,989</div>
                  {/* I KNOW THIS SHOULD BE UPPERCASE IN CSS */}
                  <div>TALLY</div>
                </div>
              </div>
              <button
                className="claim__button"
                type="button"
                onClick={() => {}}
              >
                Claim
              </button>
            </div>
          )}
          <div className="step">
            {new Array(4).fill(null).map((el, index) => {
              return (
                <button
                  type="button"
                  aria-label="Change step"
                  onClick={() => setStep(index + 1)}
                  className={step === index + 1 ? "active" : "inactive"}
                />
              )
            })}
          </div>
        </div>

        <style jsx>
          {`
          .fade-in{
            animation-name: fadein;
            animation-duration: 0.6s;
          }
          @keyframes fadein{
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to{
              opacity: 1
              transform: translateX(0%)
            }
          }
          .active{
            width: 16px;
            height: 6px;
            background: #D08E39;
            border-radius: 100px;
            transition: all 0.5s ease-out;
            margin: 0 2px;
          }
          .inactive {
            width: 6px;
            height: 6px;
            background: #667C7A;
            border-radius: 100px;
            transition: all 0.5s ease-in;
            margin: 0 2px;
          }
          .nav__back{
            transform: rotate(180deg)
          }
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
            z-index: 2;
          }
          .refer{
            position: relative;
            margin-top 24px;
          }
          .refer__code {
            font-size: 12px;
            color: #99a8a7;
            position: absolute;
            background-color: #193330;
            padding: 0 6px;
            top: -8px;
            left: 12px;
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
            transition: all 0.6s ;
          }
          .eligible {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            flex-grow:1;
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
          .step{
            position: absolute;
            bottom: 32px;
            left: 24px;
            margin-top: auto;
            display: flex;
            z-index:2;
          }
          .banner-primary {
            height: 58px;
            margin: 20px 0 10px 0;
            background-color: var(--hunter-green);
          }
          .banner-delegate {
            height: 58px;
            padding: 0 20px;
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
          input {
            width: 100%;
            height: 48px;
            color: white !important;
            border-radius: 4px;
            border: 2px solid var(--green-60);
            padding: 0px 16px;
            box-sizing: border-box;
          }
          input::placeholder {
            color: white;
          }
          input:focus {
            border: 2px solid white;
            color: white;
          }
          .delegate__icon{
            width: 40px;
            opacity: 0.5
          }
          .nav{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0 24px;
            z-index:2;
          }
          .account {
            flex-shrink: 0;
            height: 64px;
            display: flex;
            align-items: center;
            user-select: none;
          }
          .avatar {
            border-radius: 12px;
            width: 32px;
            height: 32px;
            background-color: white;
            margin-left: 8px;
            background: url("./images/portrait.png");
          }
        `}
        </style>
      </div>
    </>
  )
}
