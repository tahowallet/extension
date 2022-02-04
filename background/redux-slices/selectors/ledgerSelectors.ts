import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { SigningMethod } from "../signing"

// For consistency with similar modules:
// eslint-disable-next-line import/prefer-default-export
export const selectLedgerSigningMethodEntries = createSelector(
  (state: RootState) => state.ledger.devices,
  (devices) =>
    Object.values(devices).flatMap((device) =>
      Object.values(device.accounts).flatMap(
        (account): Array<[string, SigningMethod]> => {
          if (account.address === null) return []
          return [
            [
              account.address,
              { type: "ledger", deviceID: device.id, path: account.path },
            ],
          ]
        }
      )
    )
)
