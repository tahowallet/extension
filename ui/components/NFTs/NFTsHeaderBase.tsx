import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { ONBOARDING_ROOT } from "../../pages/Onboarding/Tabbed/Routes"
import SharedButton from "../Shared/SharedButton"

export function HeaderContainer({
  children,
}: {
  children: React.ReactNode
}): ReactElement {
  return (
    <header>
      {children}
      <style jsx>
        {`
          header {
            width: 100%;
            padding: 24px;
            display: flex;
            box-sizing: border-box;
            flex-direction: column;
            align-items: center;
            background: var(--nft-header-gradient);
          }
        `}
      </style>
    </header>
  )
}
export function EmptyHeader(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })

  return (
    <div className="container">
      <h1>{t("header.emptyTitle")}</h1>
      <p>{t("header.emptyDesc")}</p>
      <SharedButton
        iconPosition="left"
        iconSmall="add"
        type="secondary"
        size="large"
        onClick={() => {
          window.open(ONBOARDING_ROOT)
          window.close()
        }}
      >
        {t("header.addAccountCTA")}
      </SharedButton>
      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        h1 {
          font-family: "Quincy CF";
          font-weight: 500;
          font-size: 36px;
          line-height: 42px;
          color: var(--white);
          margin: 0;
          margin-bottom: 16px;
        }

        p {
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--nft-header-text);
          text-align: center;
          margin: 0;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  )
}
