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
      showUnverified: boolean
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...prevState,
    ui: {
      ...typedPrevState.ui,
      settings: {
        ...typedPrevState.ui.settings,
        showUnverified: false,
      },
    },
  }
}
