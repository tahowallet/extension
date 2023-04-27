import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { lockInternalSigners } from "@tallyho/tally-background/redux-slices/internal-signer"
import { selectInternalSignerStatus } from "@tallyho/tally-background/redux-slices/selectors"
import { clearSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { useEffect } from "react"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useBackgroundSelector } from "./redux-hooks"

/**
 * Checks and returns whether the internal signers service is currently unlocked, redirecting
 * to unlock if requested.
 *
 * If `redirectIfNot` is `true`, this hook will use react-router to redirect
 * the page to either the set-password page (if key vaults are uninitialized)
 * or the unlock page (if vaults are initialized and locked).
 *
 * If `redirectIfNot` is `false`, or if the vaults are unlocked, the unlocked
 * status is returned and no further action is taken.
 */
export const useAreInternalSignersUnlocked = (
  redirectIfNot: boolean
): boolean => {
  const lockStatus = useBackgroundSelector(selectInternalSignerStatus)
  const history = useHistory()

  let redirectTarget: string | undefined
  if (lockStatus === "uninitialized") {
    redirectTarget = "/internal-signer/set-password"
  } else if (lockStatus === "locked") {
    redirectTarget = "/internal-signer/unlock"
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

  return lockStatus === "unlocked"
}

export function useIsSignerLocked(signer: AccountSigner | null): boolean {
  const needInternalSigner = isEnabled(FeatureFlags.USE_UPDATED_SIGNING_UI)
    ? false
    : signer?.type === "keyring" || signer?.type === "privateKey"
  const areInternalSignersUnlocked =
    useAreInternalSignersUnlocked(needInternalSigner)
  return needInternalSigner && !areInternalSignersUnlocked
}

/**
 * Silently lock wallet when a given component becomes visible
 */
export const useLockWallet = (): void => {
  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    const lockWallet = async () => {
      await dispatch(lockInternalSigners())
      // No need to show that signing got locked
      dispatch(clearSnackbarMessage())
    }
    lockWallet()
  }, [dispatch])
}
