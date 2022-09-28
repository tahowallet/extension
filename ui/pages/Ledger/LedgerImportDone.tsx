import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import LedgerPanelContainer from "../../components/Ledger/LedgerPanelContainer"
import SharedButton from "../../components/Shared/SharedButton"

export default function LedgerImportDone({
  onClose,
}: {
  onClose: () => void
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.onboarding",
  })
  return (
    <LedgerPanelContainer
      indicatorImageSrc="/images/connect_ledger_indicator_connected.svg"
      heading={
        <>
          {t("doneMessageOne")}
          <br />
          {t("doneMessageTwo")}
        </>
      }
      subHeading={t("onboardingSuccessful")}
    >
      <div className="button_container">
        <SharedButton
          size="medium"
          iconSmall="close"
          iconPosition="right"
          type="tertiary"
          onClick={onClose}
        >
          {t("closeTab")}
        </SharedButton>
      </div>
      <style jsx>{`
        .button_container {
          display: flex;
          justify-content: center;
          padding: 1rem;
        }
      `}</style>
    </LedgerPanelContainer>
  )
}
