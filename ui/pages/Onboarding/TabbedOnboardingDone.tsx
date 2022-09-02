import React, { useEffect, useState, ReactElement } from "react"
import browser from "webextension-polyfill"
import LedgerPanelContainer from "../../components/Ledger/LedgerPanelContainer"
import SharedButton from "../../components/Shared/SharedButton"

export default function TabbedOnboardingDone(): ReactElement {
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
      <div className="wallet_shortcut">
        <span>Try this shortcut to open the wallet.</span>
        <img
          width="318"
          height="84"
          className="indicator"
          src={
            os === "mac"
              ? "/images/mac-shortcut.svg"
              : "/images/windows-shortcut.svg"
          }
          alt={os === "mac" ? "option + shift + T" : "alt + shift + T"}
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
      `}</style>
    </LedgerPanelContainer>
  )
}
