import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"
import { RootState, BackgroundDispatch } from "@tallyho/tally-background"
import { selectKeyringStatus } from "@tallyho/tally-background/redux-slices/selectors"
import { useHistory } from "react-router-dom"

import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux"
import { useState, useEffect } from "react"

export const useBackgroundDispatch = (): BackgroundDispatch =>
  useDispatch<BackgroundDispatch>()
export const useBackgroundSelector: TypedUseSelectorHook<RootState> =
  useSelector

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
    if (redirectIfNot && typeof redirectTarget !== "undefined") {
      history.push(redirectTarget)
    }
  })

  return keyringStatus === "unlocked"
}

export function useIsPopup(): boolean {
  const [isPopup, setIsPopup] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const maybePage = params.get("page")
    if (isAllowedQueryParamPage(maybePage)) {
      setIsPopup(true)
    } else {
      setIsPopup(false)
    }
  }, [])

  return isPopup
}
