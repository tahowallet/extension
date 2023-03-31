import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { HexString } from "../../types"
import { LedgerDeviceState } from "../ledger"

export const selectLedgerDeviceByAddresses = createSelector(
  (state: RootState) => state.ledger.devices,
  (ledgerDevices) => {
    const ledgerEntries = Object.values(ledgerDevices).flatMap((device) =>
      Object.values(device.accounts).flatMap(
        (account): [[HexString, LedgerDeviceState]] | [] => {
          if (account.address === null) return []

          return [[account.address, device]]
        }
      )
    )

    return Object.fromEntries(ledgerEntries)
  }
)

export const selectLedgerDerivationPath = createSelector(
  (state: RootState) => state.ledger.derivationPath,
  (path) => path
)

export default {}
