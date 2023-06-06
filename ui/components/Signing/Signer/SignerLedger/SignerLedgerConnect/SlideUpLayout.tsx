import { connectLedger } from "@tallyho/tally-background/redux-slices/ledger"
import React, { ReactElement, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch } from "../../../../../hooks"
import SharedButton from "../../../../Shared/SharedButton"

export default function SlideUpContentLayout({
  title,
  helpMessage,
  steps,
  onHelpClick,
}: {
  title: ReactNode
  helpMessage: ReactNode
  steps: ReactNode[]
  onHelpClick?: () => void
}): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })

  const dispatch = useBackgroundDispatch()
  return (
    <div className="container">
      <div className="title">{title}</div>
      <div className="help">
        <div className="message">{helpMessage}</div>
        <ol className="steps">
          {steps.map((step) => (
            <li>{step}</li>
          ))}
        </ol>
      </div>
      <div className="footer_actions">
        <SharedButton type="tertiaryGray" size="small" onClick={onHelpClick}>
          {t("help")}
        </SharedButton>
        <SharedButton
          type="primary"
          size="medium"
          onClick={() => dispatch(connectLedger())}
        >
          {t("refresh")}
        </SharedButton>
      </div>
      <style jsx>{`
        .container {
          margin-top: -24px; // Revert slide-up padding-top (FIXME?)
        }
        .title {
          margin: 1rem 2rem;
          font-weight: 500;
          font-size: 22px;
          line-height: 32px;
          color: var(--trophy-gold);
        }
        .help {
          margin: 1rem;
          padding: 1rem;
          border-radius: 1rem;
          background-color: var(--hunter-green);
        }
        .message {
          margin: 0.5rem;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-60);
        }
        .steps {
          margin: 0;
          padding: 0;
          display: flex;
          flex-flow: column;
          list-style: none;
          counter-reset: step;
        }
        .steps > li {
          display: flex;
          align-items: center;
          font-size: 18px;
          font-weight: 500;
          line-height: 24px;
        }
        .steps > li::before {
          content: counter(step);
          counter-increment: step;
          display: inline-block;
          min-width: 2.5rem;
          min-height: 2.5rem;
          margin: 0.5rem;
          margin-right: 1rem;
          border-radius: 1.25rem;
          border: 1px solid var(--green-60);
          color: var(--green-60);
          line-height: 2.5rem;
          vertical-align: middle;
          text-align: center;
          font-weight: 600;
          font-size: 18px;
        }
        .footer_actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          box-shadow: 0 0 5px rgba(0, 20, 19, 0.5);
        }
      `}</style>
    </div>
  )
}
