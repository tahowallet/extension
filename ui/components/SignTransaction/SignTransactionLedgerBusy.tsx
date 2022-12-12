import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"

export default function SignTransactionLedgerBusy(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "ledger.busy" })
  return (
    <SignTransactionSlideUpContentLayout
      title={t("title")}
      helpMessage={t("helpMessage")}
      steps={[<>{t("step1")}</>, <>{t("step2")}</>]}
    />
  )
}
