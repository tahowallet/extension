import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"
import React, { ReactElement } from "react"
import { SigningLedgerState } from "../../../SignTransaction/useSigningLedgerState"

type SignerLedgerConnectionStatusProps = {
  ledgerState: SigningLedgerState
  mustEnableArbitraryDataSigning: boolean
}

export default function SignerLedgerConnectionStatus({
  ledgerState,
  mustEnableArbitraryDataSigning,
}: SignerLedgerConnectionStatusProps): ReactElement {
  switch (ledgerState.state) {
    case "available":
      if (mustEnableArbitraryDataSigning) {
        return (
          <img
            src="/images/connect_ledger_indicator_disconnected.svg"
            alt="Ledger is connected but cannot sign"
          />
        )
      }
      return (
        <img
          src="/images/connect_ledger_indicator_connected.svg"
          alt="Ledger is ready to sign"
        />
      )
    case "no-ledger-connected":
      return (
        <img
          src="/images/connect_ledger_indicator_disconnected.svg"
          alt="Ledger is disconnected"
        />
      )
    case "wrong-ledger-connected":
      return (
        <img
          src="/images/connect_ledger_indicator_disconnected.svg"
          alt="Wrong Ledger connected"
        />
      )
    case "multiple-ledgers-connected":
      return (
        <img
          src="/images/connect_ledger_indicator_disconnected.svg"
          alt="Multiple ledgers connected"
        />
      )
    case "busy":
      return (
        <img
          src="/images/connect_ledger_indicator_disconnected.svg"
          alt="Ledger is busy"
        />
      )
    default:
      return assertUnreachable(ledgerState)
  }
}
