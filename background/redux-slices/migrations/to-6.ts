// This migration transitions ledger device data to always track arbitrary data
// signing state. It is defaulted to false for existing devices for safety, and
// the flag will be updated when the Ledger is next connected.

import { LedgerState } from "../ledger"

type OldState = {
  ledger?: LedgerState
  [otherSlice: string]: unknown
}

type NewState = {
  ledger: LedgerState
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState
  const newState: NewState = {
    // A user might be upgrading from version without the `ledger` key in the redux store - so we
    // initialize it here if that is the case.
    ledger: {
      currentDeviceID: null,
      devices: {},
      usbDeviceCount: 0,
    },
    ...typedPrevState,
  }

  Object.keys(newState.ledger.devices).forEach((deviceId) => {
    newState.ledger.devices[deviceId].isArbitraryDataSigningEnabled = false
  })

  return newState
}
