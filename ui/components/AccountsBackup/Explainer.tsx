import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../Shared/SharedButton"

type Props = {
  translation: "showPrivateKey" | "showMnemonic"
  close: () => void
}

export default function Explainer({ translation, close }: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: `accounts.accountItem.${translation}`,
  })
  const { t: tShared } = useTranslation("translation", { keyPrefix: "shared" })

  return (
    <>
      <div className="explainer">
        <h3 className="simple_text explainer_header">
          {t("explainer.header")}
        </h3>
        <p className="simple_text">{t("explainer.text1")}</p>
        <p className="simple_text bold">{t("explainer.text2")}</p>
        <p className="simple_text">{t("explainer.text3")}</p>
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
              window
                .open(
                  "https://tahowallet.notion.site/Recovery-Phrases-Private-Keys-31274e1abd2e4055aa63dae5297828b3",
                  "_blank"
                )
                ?.focus()
            }}
          >
            {tShared("readMore")}
          </SharedButton>
        </div>
      </div>
      <style jsx>{`
        .explainer {
          font-family: "Segment";
          padding: 0 24px 5px;
          margin-top: -20px;
        }
        .explainer_header {
          color: var(--white);
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
