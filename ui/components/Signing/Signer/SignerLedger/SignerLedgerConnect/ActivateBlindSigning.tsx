import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SlideUpContentLayout from "./SlideUpLayout"

export default function LedgerActivateBlindSigning(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.activation",
  })
  return (
    <SlideUpContentLayout
      title={t("title")}
      helpMessage={t("helpMessage")}
      steps={[<>{t("step1")}</>, <>{t("step2")}</>, <>{t("step3")}</>]}
      onHelpClick={() =>
        window.open(
          "https://support.ledger.com/hc/en-us/articles/4405481324433-Enable-blind-signing-in-the-Ethereum-ETH-app?docs=true",
        )
      }
    />
  )
}
