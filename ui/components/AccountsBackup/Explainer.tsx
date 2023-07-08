import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../Shared/SharedButton"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"

type Props = {
  translation: "showPrivateKey" | "showMnemonic"
  close: () => void
}

const EXPLAINER_LINK =
  "https://tahowallet.notion.site/Recovery-Phrases-Private-Keys-31274e1abd2e4055aa63dae5297828b3"

export default function Explainer({ translation, close }: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: `accounts.accountItem.${translation}`,
  })
  const { t: tShared } = useTranslation("translation", { keyPrefix: "shared" })

  return (
    <>
      <SharedSlideUpMenuPanel header={t("explainer.header")} type="small">
        <div className="explainer simple_text">
          <p>{t("explainer.text1")}</p>
          <p className="bold">{t("explainer.text2")}</p>
          <p>{t("explainer.text3")}</p>
          <div className="explainer_buttons">
            <SharedButton
              size="medium"
              type="tertiary"
              iconSmall="close"
              onClick={() => close()}
            >
              {tShared("close")}
            </SharedButton>
            <SharedButton
              size="medium"
              type="tertiary"
              iconSmall="new-tab"
              onClick={() => {
                window.open(EXPLAINER_LINK, "_blank")?.focus()
              }}
            >
              {tShared("readMore")}
            </SharedButton>
          </div>
        </div>
      </SharedSlideUpMenuPanel>
      <style jsx>{`
        .explainer {
          font-family: "Segment";
          padding: 0 24px 10px;
          margin-top: -20px;
        }
        .bold {
          font-weight: 600;
          color: var(--white);
        }
        .explainer_buttons {
          display: flex;
          justify-content: space-between;
        }
      `}</style>
    </>
  )
}
