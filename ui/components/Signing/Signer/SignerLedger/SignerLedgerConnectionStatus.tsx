import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { SigningLedgerState } from "../../../../hooks"

type SignerLedgerConnectionStatusProps = {
  ledgerState: SigningLedgerState
  mustEnableArbitraryDataSigning: boolean
}

export default function SignerLedgerConnectionStatus({
  ledgerState,
  mustEnableArbitraryDataSigning,
}: SignerLedgerConnectionStatusProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.connectionStatus",
  })

  switch (ledgerState.state) {
    case "available":
      if (mustEnableArbitraryDataSigning) {
        return (
          <img
            src="/images/connect_ledger_indicator_check.svg"
            alt={t("availableButNoSigning")}
          />
        )
      }
      return (
        <img
          src="/images/connect_ledger_indicator_connected.svg"
          alt={t("readyToSign")}
        />
      )
    case "no-ledger-connected":
      return (
        <img
          src="/images/connect_ledger_indicator_disconnected.svg"
          alt={t("disconnected")}
        />
      )
    case "wrong-ledger-connected":
      return (
        <img
          src="/images/connect_ledger_indicator_check.svg"
          alt={t("wrongLedger")}
        />
      )
    case "multiple-ledgers-connected":
      return (
        <img
          src="/images/connect_ledger_indicator_check.svg"
          alt={t("multipleLedgers")}
        />
      )
    case "busy":
      return (
        <img src="/images/connect_ledger_indicator_check.svg" alt={t("busy")} />
      )
    default:
      return assertUnreachable(ledgerState)
  }
}
