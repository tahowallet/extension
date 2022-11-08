import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import LedgerContinueButton from "./LedgerContinueButton"
import LedgerPanelContainer from "./LedgerPanelContainer"
import LedgerMenuProtocolList from "../LedgerMenu/LedgerMenuProtocolList"

export default function LedgerSelectNetwork({
  onContinue,
}: {
  onContinue: () => void
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.onboarding.selectLedgerApp",
  })

  return (
    <LedgerPanelContainer
      indicatorImageSrc="/images/connect_ledger_indicator_disconnected.svg"
      heading={t("initialScreenHeader")}
      subHeading={t("subheading")}
    >
      <div className="box">
        <LedgerMenuProtocolList />
      </div>
      <LedgerContinueButton onClick={onContinue}>
        {t("continueButton")}
      </LedgerContinueButton>

      <style jsx>{`
        .box {
          margin: 0.5rem 0;
          padding: 0.8rem 0.8rem;
          border-radius: 4px;
          background: var(--hunter-green);
        }
      `}</style>
    </LedgerPanelContainer>
  )
}
