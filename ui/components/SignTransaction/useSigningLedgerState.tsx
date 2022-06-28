import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { useBackgroundSelector } from "../../hooks"

export type SigningLedgerState =
  | {
      state:
        | "no-ledger-connected"
        | "wrong-ledger-connected"
        | "busy"
        | "multiple-ledgers-connected"
    }
  | { state: "available"; arbitraryDataEnabled: boolean }

export function useSigningLedgerState(
  accountSigner: AccountSigner | null
): SigningLedgerState | null {
  return useBackgroundSelector((state) => {
    if (accountSigner?.type !== "ledger") return null

    const { deviceID } = accountSigner

    const connectedDevices = Object.values(state.ledger.devices).filter(
      (device) => device.status !== "disconnected"
    )
    if (connectedDevices.length === 0) return { state: "no-ledger-connected" }
    if (state.ledger.usbDeviceCount > 1)
      return { state: "multiple-ledgers-connected" }

    const device = state.ledger.devices[deviceID]

    switch (device.status) {
      case "available":
        return {
          state: "available",
          arbitraryDataEnabled: device?.isArbitraryDataSigningEnabled ?? false,
        }
      case "busy":
        return { state: "busy" }
      case "disconnected":
        return { state: "wrong-ledger-connected" }
      default:
        throw new Error("unreachable")
    }
  })
}
