import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import OnboardingTip from "./OnboardingTip"
import OnboardingRoutes from "./Routes"
import { useIsOnboarding } from "../../../hooks"
import AddWalletOptions, { AddWalletRow } from "./AddWalletOptions"

function OnboardingAddWallet(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet",
  })

  return (
    <section className="fadeIn">
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

function OnboardingAdditionalWallet(): JSX.Element {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet",
  })

  return (
    <section className="fadeIn">
      <header>
        <img
          width="80"
          height="80"
          alt="Taho Gold"
          src="./images/doggo_gold.svg"
        />
        <div className="bottom_content">
          <h1 className="bottom_title">{t("titleExisting")}</h1>
        </div>
      </header>
      <div className="actions_container">
        <div className="list_wrapper">
          <span>{t("existingListTitle")}</span>
          <ul className="list_container">
            <AddWalletOptions />
          </ul>
        </div>
        <div className="list_wrapper">
          <span>{t("newWalletTitle")}</span>
          <ul className="list_container">
            <li>
              <AddWalletRow
                icon="icons/m/wallet.svg"
                label={t("options.createNew")}
                url={OnboardingRoutes.NEW_SEED}
              />
            </li>
          </ul>
        </div>
      </div>
      <style jsx>
        {`
          .list_wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .list_wrapper span {
            font-size: 16px;
            text-align: center;
            color: var(--green-40);
          }

          .list_container {
            display: flex;
            flex-direction: column;
            background-color: var(--green-95);
            border-radius: 16px;
            padding: 24px;
            gap: 24px;
          }

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
            display: flex;
            flex-direction: column;
            gap: 28px;
            width: 100%;
            max-width: 348px;
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
