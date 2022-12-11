import React, { ReactElement } from "react"
import SharedButton from "../../../../components/Shared/SharedButton"
import OnboardingTip from "../OnboardingTip"

export default function NewSeedIntro({
  onAccept,
}: {
  onAccept: () => void
}): ReactElement {
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
