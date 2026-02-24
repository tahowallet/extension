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
            background:   
                /* filter */
              linear-gradient(
                180deg,
                rgba(11, 41, 38, 0) 0%,
                var(--hunter-green) 140px /* bg fades at 140px height */
              ),
              /* bottom-right */
              radial-gradient(
                  366px 366px at 507px 349px,
                  #fc49c0 0%,
                  rgba(255, 127, 240, 0) 100%
                ),
              /* top-left */
              radial-gradient(
                  366px 366px at -99px -238px,
                  #ff00b8 0%,
                  rgba(255, 0, 153, 0) 100%
                ),
              /* top-down light */
              radial-gradient(93.95% 101.67% at 45.05% 0%, #1a968c 4.17%, #002522 120%);
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
          color: var(--green-40);
          text-align: center;
          margin: 0;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  )
}
