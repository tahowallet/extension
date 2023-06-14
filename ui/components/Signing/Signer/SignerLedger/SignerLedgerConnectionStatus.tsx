import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { SigningLedgerState } from "../../../../hooks"
import LedgerDisconnectedSvg from "./LedgerDisconnectedSvg"
import LedgerCheckErrorSvg from "./LedgerCheckErrorSvg"
import LedgerConnectedSvg from "./LedgerConnectedSvg"

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
          <LedgerCheckErrorSvg
            text={t("state.error")}
            alt={t("availableButNoSigning")}
          />
        )
      }
      return (
        <LedgerConnectedSvg
          text={t("state.connected")}
          alt={t("readyToSign")}
        />
      )
    case "no-ledger-connected":
      return (
        <LedgerDisconnectedSvg
          text={t("state.disconnected")}
          alt={t("disconnected")}
        />
      )

    case "wrong-ledger-connected":
      return (
        <LedgerCheckErrorSvg text={t("state.error")} alt={t("wrongLedger")} />
      )

    case "multiple-ledgers-connected":
      return (
        <LedgerCheckErrorSvg
          text={t("state.error")}
          alt={t("multipleLedgers")}
        />
      )
    case "busy":
      return <LedgerCheckErrorSvg text={t("state.error")} alt={t("busy")} />
    default:
      return assertUnreachable(ledgerState)
  }
}
