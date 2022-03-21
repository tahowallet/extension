import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { SigningMethod } from "../../utils/signing"

// For consistency with similar modules:
// eslint-disable-next-line import/prefer-default-export
export const selectLedgerSigningMethodEntries = createSelector(
  (state: RootState) => state.ledger,
  (ledgerSlice) => {
    if (typeof ledgerSlice === "undefined") {
      return []
    }

    return Object.values(ledgerSlice.devices).flatMap((device) =>
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
  }
)
