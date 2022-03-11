import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"
import { RootState, BackgroundDispatch } from "@tallyho/tally-background"
import { selectKeyringStatus } from "@tallyho/tally-background/redux-slices/selectors"
import { useHistory } from "react-router-dom"

import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux"
import { RefObject, useState, useEffect, useRef } from "react"
import { SigningMethod } from "@tallyho/tally-background/redux-slices/signing"

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

export function useIsSigningMethodLocked(
  signingMethod: SigningMethod | null
): boolean {
  const needsKeyrings = signingMethod?.type === "keyring"
  const areKeyringsUnlocked = useAreKeyringsUnlocked(needsKeyrings)
  return needsKeyrings && !areKeyringsUnlocked
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

/**
 * Hook that takes any piece of content that at times may need to be updated in
 * a delayed fashion. As long as `delayCondition` is `false`, updates to the
 * passed content are returned immediately. If `delayCondition` is `true`,
 * updates to the passed content are unchanged for an additional `delayMs`,
 * then returned.
 *
 * An example usage is when wanting to delay the clearing of a piece of text so
 * that a hiding animation can occur:
 *
 * ```
 * const MESSAGE_DELAY_MS = 300
 * const storedMesage = useSelector(selectComponentMessage)
 * const shouldHide = storedMessage.trim() === ""
 * // displayMessage will be the same as storedMessage until storedMessage is
 * // cleared. Once it is cleared and 300ms has passed, displayMessage will be
 * // cleared.
 * const displayMessage = useDelayContentChange(
 *   storedMessage,
 *   shouldHide,
 *   MESSAGE_DELAY_MS
 * )
 * ```
 */
export function useDelayContentChange<T>(
  storedContent: T,
  delayCondition: boolean,
  delayMs: number
): T {
  const [delayedContent, setDelayedContent] = useState(storedContent)
  const delayedContentUpdateTimeout = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (typeof delayedContentUpdateTimeout.current !== "undefined") {
      clearTimeout(delayedContentUpdateTimeout.current)
    }

    // If the delay condition is true, update the display element after
    // delayMs. Otherwise, update it immediately.
    if (delayCondition) {
      delayedContentUpdateTimeout.current = window.setTimeout(() => {
        setDelayedContent(storedContent)
        delayedContentUpdateTimeout.current = undefined
      }, delayMs)
    } else {
      setDelayedContent(storedContent)
    }
  }, [delayCondition, delayMs, storedContent])

  if (!delayCondition) {
    return storedContent
  }

  return delayedContent
}

export function useLocalStorage(
  key: string,
  initialValue: string
): [string, React.Dispatch<React.SetStateAction<string>>] {
  const [value, setValue] = useState(() => {
    return localStorage.getItem(key) || initialValue
  })

  useEffect(() => {
    localStorage.setItem(key, value)
  }, [key, value])

  return [value, setValue]
}
