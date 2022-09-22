import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"

export default function SignTransactionLedgerNotConnected(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.notConnected",
  })
  return (
    <SignTransactionSlideUpContentLayout
      title={t("title")}
      helpMessage={t("helpMessage")}
      steps={[<>{t("step1")}</>, <>{t("step2")}</>, <>{t("step3")}</>]}
    />
  )
}
