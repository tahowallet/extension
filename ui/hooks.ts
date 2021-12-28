import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"
import { RootState, BackgroundDispatch } from "@tallyho/tally-background"
import { selectKeyringStatus } from "@tallyho/tally-background/redux-slices/selectors"
import { useHistory } from "react-router-dom"

import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux"
import { RefObject, useState, useEffect, useRef } from "react"

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

export const useOnClickOutside = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
): void => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current
      if (!el || el.contains((event?.target as Node) || null)) {
        return
      }

      handler(event) // Call the handler only if the click is outside of the element passed.
    }

    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)

    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref, handler]) // Reload only if ref or handler changes
}

export function useIsDappPopup(): boolean {
  const [isDappPopup, setIsDappPopup] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const maybePage = params.get("page")

    if (isAllowedQueryParamPage(maybePage)) {
      setIsDappPopup(true)
    } else {
      setIsDappPopup(false)
    }
  }, [])

  return isDappPopup
}

export function useRunOnFirstRender(func: () => void): void {
  const isFirst = useRef(true)

  if (isFirst.current) {
    isFirst.current = false
    func()
  }
}
