type OldState = {
  ui: {
    settings: {
      [settingsKey: string]: unknown
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  ui: {
    settings: {
      [settingsKey: string]: unknown
      theme: "light" | "dark" | "system"
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

/**
 * Adds the theme preference, keeping existing users on the dark theme they
 * have always had.
 */
export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...prevState,
    ui: {
      ...typedPrevState.ui,
      settings: {
        ...typedPrevState.ui.settings,
        theme: "dark",
      },
    },
  }
}
