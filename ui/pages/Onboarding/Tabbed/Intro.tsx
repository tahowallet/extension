import { onboardingStarted } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../../../components/Shared/SharedButton"
import { useBackgroundDispatch } from "../../../hooks"
import OnboardingRoutes from "./Routes"

export default function Intro(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.intro",
  })
  const dispatch = useBackgroundDispatch()

  return (
    <section className="fadeIn">
      <header>
        <div className="illustration" />
        <h1>{t("title")}</h1>
      </header>
      <div className="actions">
        <SharedButton
          type="primary"
          size="large"
          linkTo={OnboardingRoutes.ADD_WALLET}
          onClick={() => dispatch(onboardingStarted())}
          center
          style={{
            fontSize: "20px",
            lineHeight: "24px",
            fontWeight: 500,
          }}
        >
          {t("useExisting")}
        </SharedButton>
        <SharedButton
          type="secondary"
          size="large"
          linkTo={OnboardingRoutes.NEW_SEED}
          onClick={() => dispatch(onboardingStarted())}
          center
          style={{
            fontSize: "20px",
            lineHeight: "24px",
            fontWeight: 500,
          }}
        >
          {t("createNew")}
        </SharedButton>
      </div>
      <style jsx>
        {`
          section {
            max-width: 348px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 65px;
            justify-content: center;
            align-items: center;
            --fade-in-duration: 300ms;
          }

          .illustration {
            background: url("./images/doggo_intro.svg");
            background-size: cover;
            width: 80px;
            height: 80px;
            margin: 0 auto;
          }

          header {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          header h1 {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 36px;
            line-height: 42px;
            margin: 0;
          }

          .actions {
            width: 100%;
            box-sizing: border-box;
            border-radius: 16px;
            background: var(--green-95);
            padding: 32px;
            display: flex;
            flex-direction: column;
            gap: 28px;
          }
        `}
      </style>
    </section>
  )
}
