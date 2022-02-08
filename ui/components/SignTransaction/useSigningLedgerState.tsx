import { SigningMethod } from "@tallyho/tally-background/redux-slices/signing"
import { useBackgroundSelector } from "../../hooks"

export type SigningLedgerState =
  | "no-ledger-connected"
  | "wrong-ledger-connected"
  | "busy"
  | "available"

export function useSigningLedgerState(
  signingMethod: SigningMethod | null
): SigningLedgerState | null {
  return useBackgroundSelector((state) => {
    if (signingMethod?.type !== "ledger") return null

    const { deviceID } = signingMethod

    const connectedDevices = Object.values(state.ledger.devices).filter(
      (device) => device.status !== "disconnected"
    )
    if (connectedDevices.length === 0) return "no-ledger-connected"

    const device = state.ledger.devices[deviceID]
    switch (device.status) {
      case "available":
        return "available"
      case "busy":
        return "busy"
      case "disconnected":
        return "wrong-ledger-connected"
      default:
        throw new Error("unreachable")
    }
  })
}
