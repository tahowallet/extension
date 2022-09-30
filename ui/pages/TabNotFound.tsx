import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"

export default function TabNotFound(): ReactElement {
  const { t } = useTranslation()
  return (
    <>
      <div>
        <p>{t("genericPages.pageDoesNotExist")}</p>
      </div>
      <style jsx>{`
        div {
          display: flex;
          min-height: 100%;
        }
        p {
          margin: auto;
        }
      `}</style>
    </>
  )
}
