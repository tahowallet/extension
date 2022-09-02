type OldState = {
  ui: {
    settings: {
      hideDust: boolean
      defaultWallet: boolean
      showTestNetworks: boolean
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  ui: {
    settings: {
      hideDust: boolean
      defaultWallet: boolean
      showTestNetworks: boolean
      collectAnalytics: boolean
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
        collectAnalytics: false,
      },
    },
  }
}
