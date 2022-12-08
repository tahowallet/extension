import React, { ReactElement, useState } from "react"
import SharedButton from "../../../components/Shared/SharedButton"
import OnboardingStepsIndicator from "../../../components/Onboarding/OnboardingStepsIndicator"
import { useBackgroundSelector } from "../../../hooks"
import OnboardingTip from "./OnboardingTip"

function WarningMessage({ onAccept }: { onAccept: () => void }): ReactElement {
  return (
    <section className="step_content fadeIn">
      <h1 className="center_text">Before we get started</h1>
      <div className="message">
        <div className="message_header">
          <img
            className="message_icon"
            src="./images/message_warning.png"
            alt="warning"
          />
        </div>
        <p>
          It&apos;s important to write down your secret recovery phrase and
          store it somewhere safe.
          <br />
          <br />
          This is the only way to recover your accounts and funds.
          <br />
          <br />
          <u>You will not be able to export your recovery phrase later.</u>
        </p>
      </div>
      <div className="cta">
        <SharedButton type="primary" size="large" onClick={onAccept} center>
          Create recovery phrase
        </SharedButton>
      </div>

      <OnboardingTip>You can upgrade a view-only wallet later</OnboardingTip>
      <style jsx>{`
        .step_content {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          max-width: 380px;
          margin: 0 auto;
        }

        section h1 {
          font-family: "Quincy CF";
          font-style: normal;
          font-weight: 500;
          font-size: 36px;
          line-height: 42px;
          margin: 45px 0 48px;
        }

        .message {
          background: var(--green-95);
          border-radius: 8px;
          font-weight: 600;
          color: var(--green-20);
          padding: 24px 29px 32px;
          margin: 15px 0 24px;
          display: flex;
          flex-direction: column;
        }

        .message p {
          margin: 0;
          font-family: "Segment";
          font-style: normal;
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          color: var(--green-20);
          text-align: left;
        }

        .message_header {
          display: flex;
          align-items: center;
          font-weight: 600;
          font-size: 18px;
          color: var(--attention);
        }

        .message_icon {
          height: 54px;
          margin: 10px auto;
        }

        .cta {
          display: flex;
          flex-direction: column;
          width: 100%;
          margin-bottom: 40px;
        }
      `}</style>
    </section>
  )
}

function SeedContainer(): ReactElement {
  const freshMnemonic = useBackgroundSelector((state) => {
    return state.keyrings.keyringToVerify?.mnemonic
  })

  return (
    <section className="fadeIn">
      <h1 className="center_text">Save and store your recovery phrase</h1>
      <div className="step_content">
        <div className="seed_phrase">
          {freshMnemonic?.map((word, i) => {
            // It's safe to use index as key here
            const key = `${word}-${i}`
            return (
              <div className="word" key={key}>
                <i>-</i>
                {word}
              </div>
            )
          })}
        </div>
        <SharedButton
          type="primary"
          size="medium"
          linkTo="/onboarding/new-seed/verify"
          center
        >
          I wrote it down
        </SharedButton>
        <div className="copy_phrase">
          <SharedButton
            type="tertiary"
            size="small"
            iconMedium="copy"
            onClick={() =>
              navigator.clipboard.writeText(freshMnemonic?.join(" ") ?? "")
            }
            center
          >
            Copy phrase to clipboard
          </SharedButton>
        </div>
      </div>
      <style jsx>{`
        section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .step_content{
          max-width: 430px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          justify-content: stretch;
        }
        h1 {
          font-family: "Quincy CF";
          font-style: normal;
          font-weight: 500;
          font-size: 36px;
          line-height: 42px;
          color: var(--white);
          text-align: center;
          margin-bottom: 27px;
          margin-top 24px;
        }
        .seed_phrase {
          display: grid;
          grid: repeat(8, 1fr) / auto-flow 1fr;
          place-content: center;
          counter-reset: step;
          gap: 16px 24px;
          padding: 16px;
          background: var(--green-95);
          border-radius: 8px;
        }

        .word::before {
          width: 20px;
          text-align: right;
          content: counter(step);
          counter-increment: step;
        }

        .word {
          color: var(--green-20);
          display: flex;
          gap: 8px;
          font-family: "Segment";
          font-style: normal;
          font-weight: 600;
          font-size: 18px;
          line-height: 27px;
        }

        .word i {
          user-select: none;
        }

        .copy_phrase {
          align-items: center;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </section>
  )
}

export default function SaveSeed(): ReactElement {
  const [revealSeed, setRevealSeed] = useState(false)

  return (
    <div className="steps_section">
      <div className="steps_indicator">
        <OnboardingStepsIndicator activeStep={revealSeed ? 1 : 0} />
      </div>
      {revealSeed ? (
        <SeedContainer />
      ) : (
        <WarningMessage onAccept={() => setRevealSeed(true)} />
      )}
      <style jsx>
        {`
          .steps_section {
            margin: auto;
          }
          .steps_indicator {
            width: 200px;
            margin: auto;
          }
        `}
      </style>
    </div>
  )
}
