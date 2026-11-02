import reducer, {
  initialState,
  selectThemePreference,
  setThemePreference,
  UIState,
} from "../ui"
import to38 from "../migrations/to-38"

describe("UI theme preference", () => {
  it("defaults to dark", () => {
    expect(initialState.settings.theme).toBe("dark")
    expect(selectThemePreference({ ui: initialState })).toBe("dark")
  })

  it.each(["light", "dark", "system"] as const)("stores %s", (theme) => {
    const state = reducer(initialState, setThemePreference(theme))

    expect(state.settings.theme).toBe(theme)
    expect(selectThemePreference({ ui: state })).toBe(theme)
  })

  it("reads dark when settings predate the preference", () => {
    const { theme: _, ...olderSettings } = initialState.settings
    const ui = { ...initialState, settings: olderSettings } as UIState

    expect(selectThemePreference({ ui })).toBe("dark")
  })

  it("migrates existing users to dark, keeping their other settings", () => {
    const migrated = to38({
      ui: { settings: { hideDust: true }, snackbarMessage: "" },
      account: {},
    })

    expect(migrated.ui.settings).toEqual({ hideDust: true, theme: "dark" })
    expect(migrated.ui.snackbarMessage).toBe("")
    expect(migrated.account).toEqual({})
  })
})
