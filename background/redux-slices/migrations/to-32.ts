import { MINUTE } from "../../constants"

const DEFAULT_AUTOLOCK_INTERVAL = 60 * MINUTE

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
      autoLockInterval: number
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
        autoLockInterval: DEFAULT_AUTOLOCK_INTERVAL,
      },
    },
  }
}
