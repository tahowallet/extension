import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SlideUpContentLayout from "./SlideUpLayout"

export default function MultipleLedgersConnected(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.multipleLedgersConnected",
  })
  return (
    <SlideUpContentLayout
      title={t("title")}
      helpMessage={t("helpMessage")}
      steps={[<>{t("step1")}</>, <>{t("step2")}</>, <>{t("step3")}</>]}
    />
  )
}
