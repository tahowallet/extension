import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SlideUpContentLayout from "./SlideUpLayout"

export default function LedgerBusy(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "ledger.busy" })
  return (
    <SlideUpContentLayout
      title={t("title")}
      helpMessage={t("helpMessage")}
      steps={[<>{t("step1")}</>, <>{t("step2")}</>]}
    />
  )
}
