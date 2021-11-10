import React, { ReactElement, useCallback, useState } from "react"
import { Redirect } from "react-router-dom"
import { addAddressNetwork } from "@tallyho/tally-background/redux-slices/accounts"
import { getEthereumNetwork } from "@tallyho/tally-background/lib/utils"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedInput from "../../components/Shared/SharedInput"
import SharedButton from "../../components/Shared/SharedButton"
import CorePage from "../../components/Core/CorePage"

export default function OnboardingViewOnlyWallet(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const data = useBackgroundSelector((background) => background.account)
  const [address, setAddress] = useState("")
  const [redirect, setRedirect] = useState(false)

  // Quick temp solution grabbed from
  // https://ethereum.stackexchange.com/a/40670
  function checkIfPlausibleETHAddress(checkAddress: string) {
    return /^(0x){1}[0-9a-fA-F]{40}$/i.test(checkAddress)
  }

  const handleSubmitViewOnlyAddress = useCallback(async () => {
    if (checkIfPlausibleETHAddress(address)) {
      dispatch(
        addAddressNetwork({
          address,
          network: getEthereumNetwork(),
        })
      )

      // TODO Replace this magic
      setTimeout(() => {
        setRedirect(true)
      }, 2000)
    } else {
      alert("Please enter a valid address")
    }
  }, [dispatch, address])

  // Redirect to the home tab once an account is set
  if (redirect) {
    return <Redirect to="/" />
  }

  return (
    <CorePage hasTabBar={false} hasTopBar={false}>
      <section>
        <div className="forest" />
        <div className="mascot" />
        <div className="top_content">
          <h1>Good hunting</h1>
          <h2>Explore Tally in read-only mode.</h2>
          <div className="info">
            Paste an Ethereum address to explore Tally. You can add an account
            later.
          </div>
        </div>
        <div className="cta_wrap">
          <div className="input_wrap">
            <SharedInput placeholder="ETH address" onChange={setAddress} />
          </div>
          <SharedButton
            type="primary"
            size="large"
            onClick={handleSubmitViewOnlyAddress}
            showLoadingOnClick
          >
            Explore
          </SharedButton>
        </div>
        <div className="warning_part">
          <div className="left">
            <div className="icon_warning" />
          </div>
          <div className="right">
            <h3 className="warning_title">What is read-only mode?</h3>
            <p>
              Read-only means you won&lsquo;t be able to sign any transactions
              or messages. It&lsquo;s a great way to try out a new wallet
              safely.
              <br />
              <br />
              Look around and share your thoughts in the Discord Feedback
              channel!
            </p>
          </div>
        </div>
        <style jsx>
          {`
            section {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .top_content {
              width: 336px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            h1 {
              font-family: "Quincy CF";
              font-weight: 500;
              font-size: 36px;
              line-height: 42px;
              color: var(--trophy-gold);
              margin-bottom: 15px;
              margin-top: 10px;
            }
            h2 {
              font-weight: 500;
              font-size: 22px;
              line-height: 32px;
              margin-bottom: 7px;
            }
            .info {
              color: var(--green-40);
              margin-bottom: 32px;
              text-align: center;
              margin-bottom: 20px;
              font-size: 14px;
              width: 293px;
            }
            .mascot {
              background: url("./images/mascot.svg") center no-repeat;
              background-size: cover;
              width: 120.52px;
              height: 94.97px;
              margin-left: 16px;
            }
            .forest {
              background: url("./images/dark_forest@2x.png");
              background-color: var(--green-80);
              background-size: cover;
              width: 384px;
              height: 141px;
              margin-bottom: -112px;
            }
            .cta_wrap {
              display: flex;
            }
            .input_wrap {
              width: 199px;
              margin-right: 19px;
            }
            .icon_warning {
              background: url("./images/warning@2x.png");
              background-size: cover;
              width: 24px;
              height: 21.55px;
            }
            h3 {
              font-weight: 500;
              font-size: 16px;
              line-height: 24px;
              margin: unset;
            }
            p {
              font-size: 14px;
              line-height: 16px;
              letter-spacing: 0.03em;
              color: var(--green-40);
              width: 320px;
            }
            .warning_part {
              width: 100%;
              display: flex;
              background: var(--green-95);
              position: fixed;
              bottom: 0;
              padding: 20px 0px 28px 0px;
            }
            .left {
              margin-left: 16px;
            }
            .right {
              margin-left: 8px;
            }
          `}
        </style>
      </section>
    </CorePage>
  )
}
