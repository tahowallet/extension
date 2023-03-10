import logger from "@tallyho/tally-background/lib/logger"
import React, { ReactElement } from "react"
import { FallbackProps } from "react-error-boundary"
import { useTranslation } from "react-i18next"
import SharedButton from "../components/Shared/SharedButton"
import { useOnMount } from "../hooks/react-hooks"

export default function ErrorFallback(
  props: Partial<FallbackProps>
): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "genericPages" })

  useOnMount(() => {
    // We only need the original stack trace available in production logs
    if (process.env.NODE_ENV === "production") {
      logger.error(props.error?.message, props.error?.stack)
    }
  })

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
