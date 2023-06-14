import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import LedgerConnectedSvg from "../Signing/Signer/SignerLedger/LedgerConnectedSvg"

export default function LedgerPanelContainer({
  indicatorImage,
  heading,
  subHeading,
  children,
}: {
  indicatorImage: "connected" | "unknown"
  heading?: React.ReactNode
  subHeading?: React.ReactNode
  children?: React.ReactNode
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.connectionStatus",
  })

  return (
    <div className="panel">
      <div className="indicator">
        {indicatorImage === "unknown" ? (
          <img
            width="318"
            height="84"
            src="/images/connect_ledger_indicator_unknown.svg"
            alt={t("state.unknown")}
          />
        ) : (
          <LedgerConnectedSvg
            text={t("state.connected")}
            alt={t("state.connected")}
          />
        )}
      </div>
      {heading && <h1 className="heading">{heading}</h1>}
      {subHeading && <p className="subheading">{subHeading}</p>}
      {children}
      <style jsx>{`
        .panel {
          display: flex;
          flex-flow: column;
          max-width: 450px;
          margin: 0 auto;
          padding: 1rem;
        }

        .indicator {
          align-self: center;
          margin: 1rem 1rem 0;
        }

        .heading {
          margin: 0.25rem;
          font-family: "Quincy CF";
          font-size: 36px;
          font-weight: 500;
          line-height: 42px;
          text-align: center;
          color: var(--green-5);
        }

        .subheading {
          margin: 0.25rem;
          font-size: 16px;
          line-height: 24px;
          text-align: center;
          color: var(--green-40);
        }
      `}</style>
    </div>
  )
}
