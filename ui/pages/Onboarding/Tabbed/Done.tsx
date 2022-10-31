import React, { useEffect, useState, ReactElement } from "react"
import browser from "webextension-polyfill"
import LedgerPanelContainer from "../../../components/Ledger/LedgerPanelContainer"
import SharedButton from "../../../components/Shared/SharedButton"

export default function Done(): ReactElement {
  const [os, setOS] = useState("windows")

  // fetch the OS using the extension API to decide what shortcut to show
  useEffect(() => {
    let active = true

    async function loadOS() {
      if (!active) {
        setOS((await browser.runtime.getPlatformInfo()).os)
      }
    }

    loadOS()

    return () => {
      active = false
    }
  }, [])

  // state for alt, t, and option key status
  const [tPressed, setTPressed] = useState(false)
  const [altPressed, setAltPressed] = useState(false)

  // add keydown/up listeners for our shortcut code
  useEffect(() => {
    const downListener = (e: KeyboardEvent) => {
      if (e.altKey || e.key === "Alt") {
        setAltPressed(true)
      }
      if (e.key === "t") {
        setTPressed(true)
      }
    }
    const upListener = (e: KeyboardEvent) => {
      if (e.altKey || e.key === "Alt") {
        setAltPressed(false)
      }
      if (e.key === "t") {
        setTPressed(false)
      }
    }

    window.addEventListener("keydown", downListener.bind(window))
    window.addEventListener("keyup", upListener.bind(window))

    return () => {
      window.removeEventListener("keydown", downListener)
      window.removeEventListener("keyup", upListener)
    }
  })

  return (
    <LedgerPanelContainer
      indicatorImageSrc="/images/onboarding_success.svg"
      heading={
        <>
          Congratulations!
          <br />
          You can now open
          <br />
          Tally Ho.
        </>
      }
    >
      <div className="confetti">
        <img src="./images/confetti.svg" alt="Confetti" />
      </div>
      <div className="wallet_shortcut">
        <span>Try this shortcut to open the wallet.</span>
        <img
          width="318"
          height="84"
          className="indicator"
          src={
            os === "mac"
              ? `/images/mac-shortcut${altPressed ? "-option" : ""}${
                  tPressed ? "-t" : ""
                }.svg`
              : `/images/windows-shortcut${altPressed ? "-alt" : ""}${
                  tPressed ? "-t" : ""
                }.svg`
          }
          alt={os === "mac" ? "option + T" : "alt + T"}
        />
      </div>
      <div className="button_container">
        <SharedButton
          size="medium"
          iconSmall="close"
          iconPosition="right"
          type="tertiary"
          onClick={() => window.close()}
        >
          Close tab
        </SharedButton>
      </div>
      <style jsx>{`
        .button_container {
          display: flex;
          justify-content: center;
          padding: 1rem;
        }
        .wallet_shortcut {
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
          align-items: center;
          padding: 16px;
          height: 158px;
          border-radius: 16px;
          background-color: var(--hunter-green);
          color: var(--green-40);
          margin-top: 24px;
        }
        .wallet_shortcut > span {
          text-align: center;
        }
        .confetti {
          position: absolute;
          z-index: 1;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </LedgerPanelContainer>
  )
}
