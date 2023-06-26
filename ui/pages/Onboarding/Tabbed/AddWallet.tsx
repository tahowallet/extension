import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import OnboardingTip from "./OnboardingTip"
import { useIsOnboarding } from "../../../hooks"
import OnboardingAdditionalWallet from "./OnboardingAdditionalWallet"
import AddWalletOptions from "./AddWalletOptions"

function OnboardingAddWallet(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet",
  })

  return (
    <section className="fade_in">
      <header>
        <img
          width="80"
          height="80"
          alt="Taho Gold"
          src="./images/doggo_gold.svg"
        />
        <div className="bottom_content">
          <h1 className="bottom_title">{t("title")}</h1>
        </div>
      </header>
      <div className="actions_container">
        <ul className="list_container">
          <AddWalletOptions />
        </ul>
      </div>
      <OnboardingTip>{t("tip")}</OnboardingTip>
      <style jsx>
        {`
          section {
            display: flex;
            flex-direction: column;
            align-items: center;
            --fade-in-duration: 300ms;
          }

          header {
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
            margin-bottom: 42px;
          }

          header img {
            border-radius: 22px;
          }

          header h1 {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 36px;
            line-height: 42px;
            margin: 0;
          }

          .actions_container {
            margin-bottom: 24px;
            width: 100%;
            max-width: 348px;
          }

          .list_container {
            display: flex;
            flex-direction: column;
            background-color: var(--green-95);
            border-radius: 16px;
            padding: 24px;
            gap: 24px;
          }
        `}
      </style>
    </section>
  )
}

export default function AddWallet(): JSX.Element {
  const isOnboarding = useIsOnboarding()

  if (isOnboarding) return <OnboardingAddWallet />

  return <OnboardingAdditionalWallet />
}
