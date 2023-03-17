import { createSelector, OutputSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { Keyring, PrivateKey } from "../../services/keyring"
import { HexString } from "../../types"

export const selectKeyringStatus = createSelector(
  (state: RootState) => state.keyrings.status,
  (status) => status
)

export const selectKeyringByAddress = (
  address: string
): OutputSelector<
  RootState,
  Keyring | undefined,
  (res: Keyring[]) => Keyring | undefined
> =>
  createSelector(
    [(state: RootState) => state.keyrings.keyrings],
    (keyrings) => {
      const kr = keyrings.find((keyring) => keyring.addresses.includes(address))
      return kr
    }
  )

export const selectKeyringsByAddresses = createSelector(
  (state: RootState) => state.keyrings.keyrings,
  (
    keyrings
  ): {
    [address: HexString]: Keyring
  } =>
    Object.fromEntries(
      keyrings.flatMap((keyring) =>
        keyring.addresses.map((address) => [address, keyring])
      )
    )
)

export const selectWalletsByAddress = createSelector(
  (state: RootState) => state.keyrings.privateKeys,
  (pkWallets): { [address: HexString]: PrivateKey } =>
    Object.fromEntries(pkWallets.map((wallet) => [wallet.addresses[0], wallet]))
)

export const selectSourcesByAddress = createSelector(
  (state: RootState) => state.keyrings.keyrings,
  (state: RootState) => state.keyrings.metadata,
  (
    keyrings,
    keyringMetadata
  ): {
    [address: HexString]: "import" | "internal"
  } =>
    Object.fromEntries(
      keyrings
        // get rid of "Loading" keyrings
        .filter((keyring) => !!keyring.id)
        .flatMap((keyring) =>
          keyring.addresses.map((address) => [
            address,
            // Guaranteed to exist by the filter above
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            keyringMetadata[keyring.id!]?.source,
          ])
        )
    )
)
