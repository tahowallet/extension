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
      chartRange: "day" | "week" | "month" | "quarter" | "year" | "all"
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

/** Adds the value charts' range setting, starting everyone at a month. */
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
