import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useHistory } from "react-router-dom"
import SharedButton from "../Shared/SharedButton"
import SharedPageHeader from "../Shared/SharedPageHeader"

export default function HiddenDevPanel(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "devPanel" })
  const history = useHistory()

  return (
    <section className="standard_width_padded">
      <SharedPageHeader backPath="/settings" withoutBackText>
        {t("title")}
      </SharedPageHeader>
      <div className="buttons_wrap">
        <SharedButton
          type="secondary"
          size="medium"
          iconSmall="arrow-right"
          onClick={() => {
            history.push("/dev/feature-flags")
          }}
        >
          {t("featureFlags.title")}
        </SharedButton>
      </div>
      <style jsx>{`
        section {
          height: 100%;
        }
        h3 {
          border-bottom: 1px solid var(--hunter-green);
          padding-bottom: 10px;
          padding-left: 8px;
        }
        .buttons_wrap {
          height: 80%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }
      `}</style>
    </section>
  )
}
