import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { selectKeyringStatus } from "@tallyho/tally-background/redux-slices/selectors"
import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { useEffect } from "react"
import { useHistory } from "react-router-dom"

import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"
import { DisplayDetails } from "@tallyho/tally-background/services/ledger"
import { HexString } from "@tallyho/tally-background/types"
import { useBackgroundSelector } from "./redux-hooks"

/**
 * Checks and returns whether the keyrings are currently unlocked, redirecting
 * to unlock if requested.
 *
 * If `redirectIfNot` is `true`, this hook will use react-router to redirect
 * the page to either the set-password page (if the keyrings are uninitialized)
 * or the unlock page (if the keyrings are initialized and locked).
 *
 * If `redirectIfNot` is `false`, or if the keyrings are unlocked, the unlocked
 * status is returned and no further action is taken.
 */
export const useAreKeyringsUnlocked = (redirectIfNot: boolean): boolean => {
  const keyringStatus = useBackgroundSelector(selectKeyringStatus)
  const history = useHistory()

  let redirectTarget: string | undefined
  if (keyringStatus === "uninitialized") {
    redirectTarget = "/keyring/set-password"
  } else if (keyringStatus === "locked") {
    redirectTarget = "/keyring/unlock"
  }

  useEffect(() => {
    if (
      redirectIfNot &&
      typeof redirectTarget !== "undefined" &&
      history.location.pathname !== redirectTarget
    ) {
      history.push(redirectTarget)
    }
  })

  return keyringStatus === "unlocked"
}

// FIXME Remove after USE_UPDATED_SIGNING_UI = true
export function useIsSignerLocked(signer: AccountSigner | null): boolean {
  const needsKeyrings = isEnabled(FeatureFlags.USE_UPDATED_SIGNING_UI)
    ? false
    : signer?.type === "keyring"
  const areKeyringsUnlocked = useAreKeyringsUnlocked(needsKeyrings)
  return needsKeyrings && !areKeyringsUnlocked
}

export type SigningLedgerState =
  | {
      state: "no-ledger-connected" | "busy" | "multiple-ledgers-connected"
    }
  | { state: "wrong-ledger-connected"; requiredAddress: HexString }
  | {
      state: "available"
      arbitraryDataEnabled: boolean
      displayDetails: DisplayDetails
    }

export function useSigningLedgerState(
  signingAddress: HexString | undefined,
  accountSigner: AccountSigner | null
): SigningLedgerState | null {
  return useBackgroundSelector((state) => {
    if (signingAddress === undefined || accountSigner?.type !== "ledger") {
      return null
    }

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
          arbitraryDataEnabled: device.isArbitraryDataSigningEnabled ?? false,
          displayDetails: device.displayDetails,
        }
      case "busy":
        return { state: "busy" }
      case "disconnected":
        return {
          state: "wrong-ledger-connected",
          requiredAddress: signingAddress,
        }
      default:
        return assertUnreachable(device.status)
    }
  })
}
