import { SigningMethod } from "@tallyho/tally-background/redux-slices/signing"
import { useBackgroundSelector } from "../../hooks"

export type SigningLedgerState =
  | "no-ledger-connected"
  | "wrong-ledger-connected"
  | "busy"
  | "available"
  | "multiple-ledgers-connected"
  | "activate-blind-signing"

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
    if (state.ledger.usbDeviceCount > 1) return "multiple-ledgers-connected"

    const txHasData =
      state.transactionConstruction.transactionRequest?.input !== null &&
      state.transactionConstruction.transactionRequest?.input !== undefined &&
      state.transactionConstruction.transactionRequest?.input.length > 0

    const device = state.ledger.devices[deviceID]

    switch (device.status) {
      case "available":
        if (txHasData && !device.isBlindSigner) return "activate-blind-signing"
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
