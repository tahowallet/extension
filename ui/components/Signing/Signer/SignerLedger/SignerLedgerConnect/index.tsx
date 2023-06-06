import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"
import React, { ReactElement } from "react"
import { SigningLedgerState } from "../../../../../hooks"
import LedgerActivateBlindSigning from "./ActivateBlindSigning"
import LedgerBusy from "./LedgerBusy"
import LedgerNotConnected from "./LedgerNotConnected"
import MultipleLedgersConnected from "./MultipleLedgersConnected"
import WrongLedgerConnected from "./WrongLedgerConnected"

type SignerLedgerConnectProps = {
  signingLedgerState: SigningLedgerState
}

export default function SignerLedgerConnect({
  signingLedgerState,
}: SignerLedgerConnectProps): ReactElement {
  switch (signingLedgerState.state) {
    case "no-ledger-connected":
      return <LedgerNotConnected />
    case "wrong-ledger-connected":
      return (
        <WrongLedgerConnected
          requiredAddress={signingLedgerState.requiredAddress}
        />
      )
    case "multiple-ledgers-connected":
      return <MultipleLedgersConnected />
    case "busy":
      return <LedgerBusy />
    case "available":
      // Note that if the ledger is available, this component expects to only
      // be rendered if arbitrary data signing is required AND disabled. We
      // don't guard with an additional check here, as the parent is expected
      // to verify for us.
      return <LedgerActivateBlindSigning />
    default:
      return assertUnreachable(signingLedgerState)
  }
}
