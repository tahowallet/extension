import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"

/**
 * Bitcoin tab content for add-account steps that can't derive Spark keys
 * (private keys, Ledger): Spark accounts come from a recovery phrase.
 */
export default function OnboardingBitcoinNeedsRecoveryPhrase(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.accountFamily",
  })
  return (
    <p data-testid="bitcoin_needs_recovery_phrase">
      {t("bitcoinNeedsRecoveryPhrase")}
      <style jsx>{`
        p {
          width: 320px;
          text-align: center;
          color: var(--green-40);
          line-height: 24px;
          margin: 0 auto 40px;
        }
      `}</style>
    </p>
  )
}
