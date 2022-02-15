import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."

export const selectKeyringStatus = createSelector(
  (state: RootState) => state.keyrings.status,
  (status) => status
)

export const selectKeyringSigningAddresses = createSelector(
  (state: RootState) => state.keyrings.keyrings,
  (keyrings) => keyrings.flatMap((keyring) => keyring.addresses)
)

export const selectAddressSources = createSelector(
  (state: RootState) => state.keyrings.keyrings,
  (
    keyrings
  ): {
    [address: string]: "import" | "newSeed"
  } =>
    Object.fromEntries(
      keyrings.flatMap((keyring) =>
        keyring.addresses.map((address) => [address, keyring.source])
      )
    )
)
