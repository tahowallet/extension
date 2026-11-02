import type { ThemePreference } from "@tallyho/tally-background/redux-slices/ui"

export type ResolvedTheme = "light" | "dark"

/**
 * localStorage mirror of the theme preference, so pages can apply it before
 * the background store answers.
 */
export const THEME_STORAGE_KEY = "taho.theme"

export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)"

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system"
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light"
  }
  return preference
}

export function systemPrefersDark(): boolean {
  return window.matchMedia?.(DARK_SCHEME_QUERY).matches ?? true
}

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme
}

export function readStoredThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : "dark"
  } catch {
    return "dark"
  }
}

export function storeThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage can be unavailable; the store still applies the theme.
  }
}
