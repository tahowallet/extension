import { useEffect, useState } from "react"
import { selectThemePreference } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundSelector } from "./redux-hooks"
import {
  DARK_SCHEME_QUERY,
  ResolvedTheme,
  applyTheme,
  resolveTheme,
  storeThemePreference,
  systemPrefersDark,
} from "../utils/theme"

/** Tracks the browser's colour scheme as it changes. */
export function useSystemPrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  useEffect(() => {
    const query = window.matchMedia?.(DARK_SCHEME_QUERY)
    if (!query) return undefined

    const onChange = (event: MediaQueryListEvent) =>
      setPrefersDark(event.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  return prefersDark
}

/** The theme the UI is drawn in, with "system" resolved. */
export function useResolvedTheme(): ResolvedTheme {
  const preference = useBackgroundSelector(selectThemePreference)
  return resolveTheme(preference, useSystemPrefersDark())
}

/**
 * Applies the stored theme preference to the page and mirrors it for the
 * next page load.
 */
export function useThemeSync(): ResolvedTheme {
  const preference = useBackgroundSelector(selectThemePreference)
  const theme = useResolvedTheme()

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    storeThemePreference(preference)
  }, [preference])

  return theme
}
