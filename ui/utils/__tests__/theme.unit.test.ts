import {
  isThemePreference,
  readStoredThemePreference,
  resolveTheme,
  storeThemePreference,
  THEME_STORAGE_KEY,
} from "../theme"

describe("resolveTheme", () => {
  it("uses an explicit choice whatever the system prefers", () => {
    expect(resolveTheme("light", true)).toBe("light")
    expect(resolveTheme("dark", false)).toBe("dark")
  })

  it("follows the system for system", () => {
    expect(resolveTheme("system", true)).toBe("dark")
    expect(resolveTheme("system", false)).toBe("light")
  })
})

describe("stored theme preference", () => {
  beforeEach(() => window.localStorage.clear())

  it("round-trips through localStorage", () => {
    storeThemePreference("system")
    expect(readStoredThemePreference()).toBe("system")
  })

  it("falls back to dark when nothing valid is stored", () => {
    expect(readStoredThemePreference()).toBe("dark")
    window.localStorage.setItem(THEME_STORAGE_KEY, "sepia")
    expect(readStoredThemePreference()).toBe("dark")
  })

  it("recognises only the three preferences", () => {
    expect(isThemePreference("light")).toBe(true)
    expect(isThemePreference("system")).toBe(true)
    expect(isThemePreference("sepia")).toBe(false)
    expect(isThemePreference(undefined)).toBe(false)
  })
})
