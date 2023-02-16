import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"

export default function Done(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.complete",
  })

  return (
    <section>
      <div className="confetti">
        <img src="./images/confetti.svg" alt="Confetti" />
      </div>
      <div className="wrapper fadeIn">
        <header>
          <img
            width="80"
            height="80"
            alt="Taho Gold"
            src="./images/doggo_gold.svg"
            className="illustration"
          />
          <div>
            <h1>{t("title")}</h1>
            <span>{t("subtitle")}</span>
          </div>
        </header>
        <img
          width="383"
          src="./images/onboarding_pin_extension.gif"
          alt={t("animationAlt")}
        />
      </div>

      <style jsx>{`
        section {
          text-align: center;
        }
        header {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
          margin-bottom: 32px;
        }

        header div {
          max-width: 340px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        header h1 {
          display: inline-block;
          font-family: "Quincy CF";
          font-weight: 500;
          font-size: 36px;
          line-height: 42px;
          margin: 0;
          color: var(--white);
        }

        header span {
          font-family: "Segment";
          font-style: normal;
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
        }

        header img {
          border-radius: 22px;
        }

        .wrapper {
          position: relative;
          z-index: 1;
        }

        .confetti {
          position: absolute;
          display: none;
          opacity: 0.7;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </section>
  )
}
