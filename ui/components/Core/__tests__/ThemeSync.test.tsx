import React from "react"
import { act } from "@testing-library/react"
import {
  initialState as uiInitialState,
  setThemePreference,
  ThemePreference,
} from "@tallyho/tally-background/redux-slices/ui"
import ThemeSync from "../ThemeSync"
import { renderWithProviders } from "../../../tests/test-utils"
import { THEME_STORAGE_KEY } from "../../../utils/theme"

/** A controllable prefers-color-scheme. */
function mockSystemScheme(initiallyDark: boolean) {
  let matches = initiallyDark
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    addEventListener: (_: string, listener: never) => listeners.add(listener),
    removeEventListener: (_: string, listener: never) =>
      listeners.delete(listener),
  })) as unknown as typeof window.matchMedia

  return (dark: boolean) => {
    matches = dark
    listeners.forEach((listener) =>
      listener({ matches: dark } as MediaQueryListEvent),
    )
  }
}

const renderWithTheme = (theme: ThemePreference) =>
  renderWithProviders(<ThemeSync />, {
    preloadedState: {
      ui: {
        ...uiInitialState,
        settings: { ...uiInitialState.settings, theme },
      },
    },
  })

describe("ThemeSync", () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    delete document.documentElement.dataset.theme
    window.localStorage.clear()
  })

  it("applies an explicit theme and mirrors the preference", () => {
    mockSystemScheme(true)
    renderWithTheme("light")

    expect(document.documentElement.dataset.theme).toBe("light")
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")
  })

  it("follows the system scheme live when set to system", () => {
    const setSystemDark = mockSystemScheme(true)
    renderWithTheme("system")

    expect(document.documentElement.dataset.theme).toBe("dark")

    act(() => setSystemDark(false))
    expect(document.documentElement.dataset.theme).toBe("light")

    act(() => setSystemDark(true))
    expect(document.documentElement.dataset.theme).toBe("dark")
  })

  it("ignores the system scheme for an explicit choice", () => {
    const setSystemDark = mockSystemScheme(false)
    const { store } = renderWithTheme("dark")

    act(() => setSystemDark(false))
    expect(document.documentElement.dataset.theme).toBe("dark")

    act(() => {
      store.dispatch(setThemePreference("system"))
    })
    expect(document.documentElement.dataset.theme).toBe("light")
  })
})
