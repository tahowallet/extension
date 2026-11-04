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
      chartRange: "day" | "week" | "month" | "quarter" | "year"
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

/**
 * Adds the value charts' range setting, starting everyone at a month, which
 * is what charts showed before the setting existed.
 */
export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...prevState,
    ui: {
      ...typedPrevState.ui,
      settings: {
        ...typedPrevState.ui.settings,
        chartRange: "month",
      },
    },
  }
}
