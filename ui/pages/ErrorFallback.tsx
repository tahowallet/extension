import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../components/Shared/SharedButton"

export default function ErrorFallback(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "genericPages" })
  return (
    <>
      <div className="wrap">
        <h1 className="serif_header">{t("errorPageTitle")}</h1>
        <SharedButton type="primary" size="medium" linkTo="/">
          {t("returnHome")}
        </SharedButton>
      </div>
      <style jsx>{`
        .wrap {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        h1 {
          margin-bottom: 20px;
        }
      `}</style>
    </>
  )
}
