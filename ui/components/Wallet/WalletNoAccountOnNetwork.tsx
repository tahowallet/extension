import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import type { AnyNetwork } from "@tallyho/tally-background/networks"
import SharedButton from "../Shared/SharedButton"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"
import { ONBOARDING_ROOT } from "../../pages/Onboarding/Tabbed/Routes"

/**
 * Shown in place of the wallet when the selected network has no account yet
 * (e.g. a Spark network before a Spark account is added), with a way into
 * the onboarding flow that adds one.
 */
export default function WalletNoAccountOnNetwork({
  network,
}: {
  network: AnyNetwork
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.noAccountOnNetwork",
  })

  return (
    <section data-testid="wallet_no_account_on_network">
      <SharedNetworkIcon network={network} size={56} />
      <h2>{t("title", { network: network.name })}</h2>
      <p>{t("body")}</p>
      <SharedButton
        type="primary"
        size="large"
        // Same entry as the accounts panel's Add Wallet: onboarding opens
        // on its add-wallet options, which offer EVM and Bitcoin accounts.
        onClick={() => window.open(ONBOARDING_ROOT)}
      >
        {t("add")}
      </SharedButton>
      <style jsx>{`
        section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
          padding: 40px 24px;
        }
        h2 {
          margin: 0;
          color: var(--white);
          font-size: 20px;
        }
        p {
          margin: 0;
          color: var(--green-40);
        }
      `}</style>
    </section>
  )
}
