import React, { ReactElement, useState } from "react"
import { useDispatch } from "react-redux"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { useHistory } from "react-router-dom"
import SharedButton from "../../components/Shared/SharedButton"
import OnboardingStepsIndicator from "../../components/Onboarding/OnboardingStepsIndicator"
import { useBackgroundSelector } from "../../hooks"
import SharedBackButton from "../../components/Shared/SharedBackButton"
import {
  OnboardingBox,
  OnboardingHeader,
  OnboardingSubheader,
  OnboardingContainer,
  OnboardingMessageHeader,
} from "./styles"

function WarningMessage({ onAccept }: { onAccept: () => void }): ReactElement {
  return (
    <>
      <div className="onboarding_box">
        <div className="message_header">
          <img
            className="message_icon"
            src="./images/message_warning.png"
            alt="warning"
          />
          <span>Before you start</span>
        </div>
        <p>
          It&apos;s important to write down your secret recovery phrase and
          store it somewhere safe.
        </p>
        <p>This is the only way to recover your accounts and funds.</p>
        <p>You will not be able to export your recovery phrase later.</p>
      </div>
      <SharedButton type="primary" size="medium" onClick={onAccept}>
        Reveal my secret recovery phrase
      </SharedButton>
      <style jsx>{`
        .onboarding_box {
          ${OnboardingBox}
          padding-top: 20px;
        }
        .onboarding_box p {
          margin: 8px 0;
        }
        .message_header {
          ${OnboardingMessageHeader}
          color: var(--attention);
        }
        .message_icon {
          height: 54px;
          margin-right: 20px;
        }
      `}</style>
    </>
  )
}

function SeedContainer(): ReactElement {
  const dispatch = useDispatch()

  const freshMnemonic = useBackgroundSelector((state) => {
    return state.keyrings.keyringToVerify?.mnemonic
  })

  return (
    <>
      <h3 className="subtitle">This is the only way to restore your wallet</h3>
      <div className="words_group">
        {freshMnemonic && (
          <>
            <div className="column_wrap">
              <div className="column numbers">1 2 3 4 5 6 7 8 9 10 11 12</div>
              <div className="column dashes">- - - - - - - - - - - -</div>
              <div className="column words">
                {freshMnemonic?.slice(0, 12).map((word) => {
                  return (
                    <React.Fragment key={word}>
                      {word}
                      <br />
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
            <div className="column_wrap">
              <div className="column numbers">
                13 14 15 16 17 18 19 20 21 22 23 24
              </div>
              <div className="column dashes">- - - - - - - - - - - -</div>
              <div className="column words">
                {freshMnemonic?.slice(12, 24).map((word) => {
                  return (
                    <React.Fragment key={word}>
                      {word}
                      <br />
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="button_group">
        <SharedButton
          type="primary"
          size="medium"
          iconMedium="continue"
          linkTo="/onboarding/verify-seed"
        >
          I wrote it down
        </SharedButton>
        <SharedButton
          type="tertiary"
          size="small"
          iconMedium="copy"
          onClick={() => {
            navigator.clipboard.writeText(freshMnemonic?.join(" ") ?? "")
            dispatch(setSnackbarMessage("Copied!"))
          }}
        >
          Copy phrase to clipboard
        </SharedButton>
      </div>
      <style jsx>{`
        .subtitle {
          ${OnboardingSubheader}
        }
        .words_group {
          ${OnboardingBox}
          flex-direction: row;
          justify-content: space-between;
        }
        .numbers {
          width: 18px;
          text-align: right;
        }
        .column {
          color: var(--green-20);
          font-weight: 600;
          line-height: 32px;
          text-align: right;
        }
        .column_wrap {
          display: flex;
          height: 382px;
        }
        .dashes {
          width: 12px;
          margin-right: 8px;
          margin-left: 5px;
        }
        .words {
          width: 69px;
          text-align: left;
        }
        .button_group {
          align-items: center;
          height: 86px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `}</style>
    </>
  )
}

export default function OnboardingSaveSeed(): ReactElement {
  const historyPre: unknown = useHistory()
  const history = historyPre as {
    entries: { pathname: string }[]
  }

  const hasNewSeed =
    history.entries.at(-2)?.pathname ===
    "/onboarding/onboarding-interstitial-create-phrase"
  const [revealSeed, setRevealSeed] = useState(!hasNewSeed)

  return (
    <section className="onboarding_container">
      <div className="top">
        <SharedBackButton path="/" />
        <div className="wordmark" />
      </div>
      <OnboardingStepsIndicator activeStep={1} />
      <h1 className="serif_header center_text">
        Save and store your recovery phrase
      </h1>
      {revealSeed ? (
        <SeedContainer />
      ) : (
        <WarningMessage onAccept={() => setRevealSeed(true)} />
      )}
      <style jsx>
        {`
          .serif_header {
            ${OnboardingHeader}
          }
          .onboarding_container {
            ${OnboardingContainer}
          }
          .top {
            display: flex;
            justify-content: space-between;
            width: 100%;
            height: 40px;
          }
          .wordmark {
            background: url("./images/wordmark@2x.png");
            background-size: cover;
            width: 95px;
            height: 25px;
            margin-right: calc(50% - 95px / 2);
          }
        `}
      </style>
    </section>
  )
}
