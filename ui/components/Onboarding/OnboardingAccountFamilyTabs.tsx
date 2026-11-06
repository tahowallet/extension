import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"

/**
 * Which kind of account an onboarding step adds: EVM accounts, or Bitcoin
 * accounts on Spark.
 */
export type AccountFamily = "evm" | "bitcoin"

const FAMILIES: AccountFamily[] = ["evm", "bitcoin"]

/**
 * EVM | Bitcoin tabs for the add-account steps, using the same panel
 * switcher as the wallet's Assets | Activity tabs.
 */
export default function OnboardingAccountFamilyTabs({
  family,
  onChange,
}: {
  family: AccountFamily
  onChange: (family: AccountFamily) => void
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.accountFamily",
  })

  return (
    <div className="panel_wrapper">
      <SharedPanelSwitcher
        panelId="account_family_tabs"
        setPanelNumber={(index) => onChange(FAMILIES[index])}
        panelNumber={FAMILIES.indexOf(family)}
        panelNames={[t("evm"), t("bitcoin")]}
      />
      <style jsx>{`
        .panel_wrapper {
          margin-bottom: 24px;
          --panel-switcher-border: var(--green-80);
          --panel-switcher-primary: var(--text-strong);
          --panel-switcher-secondary: var(--green-20);
          width: 100%;
        }
      `}</style>
    </div>
  )
}
