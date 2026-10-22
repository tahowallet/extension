import { createEntityAdapter, createSlice, EntityState } from "@reduxjs/toolkit"
import { ethers } from "ethers"
import type { RootState } from "."
import { AddressOnNetwork } from "../accounts"
import {
  AnyAsset,
  AnyAssetAmount,
  AnyAssetMetadata,
  isSmartContractFungibleAsset,
  SmartContractFungibleAsset,
} from "../assets"
import { ERC20_INTERFACE } from "../lib/erc20"
import logger from "../lib/logger"
import { EVMNetwork, sameNetwork } from "../networks"
import { NormalizedEVMAddress } from "../types"
import { removeAssetReferences, updateAccountBalance } from "./accounts"
import { createBackgroundAsyncThunk } from "./utils"
import { getAssetEntityID, isBaseAssetForNetwork } from "./utils/asset-utils"
import { getProvider } from "./utils/contract-utils"

export type SingleAssetState = AnyAsset

const assetsAdapter = createEntityAdapter<SingleAssetState>({
  selectId: getAssetEntityID,
})

export type AssetsState = EntityState<SingleAssetState>

export const initialState: AssetsState = assetsAdapter.getInitialState()

/**
 * Adapter-generated selectors scoped to the `assets` slice of the root state.
 */
export const {
  selectAll: selectAllAssets,
  selectById: selectAssetById,
  selectEntities: selectAssetEntities,
  selectIds: selectAssetIds,
} = assetsAdapter.getSelectors((state: RootState) => state.assets)

const assetsSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {
    assetsLoaded: (
      immerState,
      {
        payload: { assets: newAssets, loadingScope },
      }: {
        payload: {
          assets: AnyAsset[]
          loadingScope: "all" | "network" | "incremental"
        }
      },
    ) => {
      if (loadingScope === "all") {
        // Full replacement: set the entire entity table to the incoming assets.
        assetsAdapter.setAll(immerState, newAssets)
        return
      }

      if (loadingScope === "network") {
        // Determine which networks are being fully replaced.
        const networksToReset = newAssets.reduce<EVMNetwork[]>(
          (uniqueNetworks, asset) => {
            const lastNetwork = uniqueNetworks.at(-1)
            return "homeNetwork" in asset &&
              (uniqueNetworks.length === 0 ||
                (lastNetwork && !sameNetwork(asset.homeNetwork, lastNetwork)))
              ? [...uniqueNetworks, asset.homeNetwork]
              : uniqueNetworks
          },
          [],
        )

        // Remove all existing assets on the resetting networks.
        const idsToRemove = immerState.ids.filter((id) => {
          const asset = immerState.entities[id]
          return (
            asset &&
            "homeNetwork" in asset &&
            networksToReset.some((network) =>
              sameNetwork(network, asset.homeNetwork),
            )
          )
        })
        assetsAdapter.removeMany(immerState, idsToRemove)

        // Insert the new assets (any ID collisions are replaced).
        assetsAdapter.upsertMany(immerState, newAssets)
        return
      }

      // Incremental: only update metadata for existing assets; add new ones.
      const updates: {
        id: string
        changes: { metadata: AnyAsset["metadata"] }
      }[] = []
      const additions: AnyAsset[] = []

      newAssets.forEach((asset) => {
        const id = getAssetEntityID(asset)
        if (immerState.entities[id]) {
          updates.push({ id, changes: { metadata: asset.metadata } })
        } else {
          additions.push(asset)
        }
      })

      assetsAdapter.updateMany(immerState, updates)
      assetsAdapter.addMany(immerState, additions)
    },
    removeAsset: (
      immerState,
      { payload: removedAsset }: { payload: AnyAsset },
    ) => {
      assetsAdapter.removeOne(immerState, getAssetEntityID(removedAsset))
    },
  },
  extraReducers: (builder) => {
    // When account balances arrive, ensure each balance's asset is in the
    // entity table. This guarantees that selectors can always hydrate a
    // normalized balance into a full AnyAssetAmount.
    builder.addCase(updateAccountBalance, (immerState, { payload }) => {
      assetsAdapter.upsertMany(
        immerState,
        payload.balances.map((b) => b.assetAmount.asset),
      )
    })
  },
})

export const { assetsLoaded, removeAsset } = assetsSlice.actions

export default assetsSlice.reducer

export const updateAssetMetadata = createBackgroundAsyncThunk(
  "assets/updateAssetMetadata",
  async (
    {
      asset,
      metadata,
    }: {
      asset: SmartContractFungibleAsset
      metadata: AnyAssetMetadata
    },
    { extra: { main } },
  ) => {
    await main.updateAssetMetadata(asset, metadata)
  },
)

export const refreshAsset = createBackgroundAsyncThunk(
  "assets/refreshAsset",
  async (
    {
      asset,
    }: {
      asset: SmartContractFungibleAsset
    },
    { dispatch },
  ) => {
    // Update the canonical asset in the entity table; account balances
    // reference it by ID so no separate account-side update is needed.
    await dispatch(
      assetsLoaded({ assets: [asset], loadingScope: "incremental" }),
    )
  },
)

export const hideAsset = createBackgroundAsyncThunk(
  "assets/hideAsset",
  async (
    {
      asset,
    }: {
      asset: SmartContractFungibleAsset
    },
    { extra: { main } },
  ) => {
    await main.hideAsset(asset)
  },
)

/**
 * Removes the asset from the user interface.
 * The token should be removed from the assets list and all references associated with it.
 */
export const removeAssetData = createBackgroundAsyncThunk(
  "assets/removeAssetData",
  async (
    {
      asset,
    }: {
      asset: SmartContractFungibleAsset
    },
    { dispatch },
  ) => {
    await dispatch(removeAsset(asset))
    await dispatch(removeAssetReferences(asset))
  },
)

/**
 * Executes an asset transfer between two addresses, for a set amount. Supports
 * an optional fixed gas limit.
 *
 * If the from address is not a writeable address in the wallet, this signature
 * will not be possible.
 */
export const transferAsset = createBackgroundAsyncThunk(
  "assets/transferAsset",
  async ({
    fromAddressNetwork: { address: fromAddress, network: fromNetwork },
    toAddressNetwork: { address: toAddress, network: toNetwork },
    assetAmount,
    gasLimit,
    nonce,
  }: {
    fromAddressNetwork: AddressOnNetwork
    toAddressNetwork: AddressOnNetwork
    assetAmount: AnyAssetAmount
    gasLimit?: bigint
    nonce?: number
  }) => {
    if (!sameNetwork(fromNetwork, toNetwork)) {
      throw new Error("Only same-network transfers are supported for now.")
    }

    const provider = getProvider()
    const signer = provider.getSigner()

    if (isBaseAssetForNetwork(assetAmount.asset, fromNetwork)) {
      logger.debug(
        `Sending ${assetAmount.amount} ${assetAmount.asset.symbol} from ` +
          `${fromAddress} to ${toAddress} as a base asset transfer.`,
      )
      await signer.sendTransaction({
        from: fromAddress,
        to: toAddress,
        value: assetAmount.amount,
        gasLimit,
        nonce,
      })
    } else if (isSmartContractFungibleAsset(assetAmount.asset)) {
      logger.debug(
        `Sending ${assetAmount.amount} ${assetAmount.asset.symbol} from ` +
          `${fromAddress} to ${toAddress} as an ERC20 transfer.`,
      )
      const token = new ethers.Contract(
        assetAmount.asset.contractAddress,
        ERC20_INTERFACE,
        signer,
      )

      const transactionDetails = await token.populateTransaction.transfer(
        toAddress,
        assetAmount.amount,
      )

      await signer.sendUncheckedTransaction({
        ...transactionDetails,
        gasLimit: gasLimit ?? transactionDetails.gasLimit,
        nonce,
      })
    } else {
      throw new Error(
        "Only base and fungible smart contract asset transfers are supported for now.",
      )
    }
  },
)

export const importCustomToken = createBackgroundAsyncThunk(
  "assets/importCustomToken",
  async (
    {
      asset,
    }: {
      asset: SmartContractFungibleAsset
    },
    { extra: { main } },
  ) => ({ success: await main.importCustomToken(asset) }),
)

export const checkTokenContractDetails = createBackgroundAsyncThunk(
  "assets/checkTokenContractDetails",
  async (
    {
      contractAddress,
      network,
    }: { contractAddress: NormalizedEVMAddress; network: EVMNetwork },
    { getState, extra: { main } },
  ) => {
    const state = getState() as RootState
    const currentAccount = state.ui.selectedAccount

    try {
      return await main.queryCustomTokenDetails(contractAddress, {
        ...currentAccount,
        network,
      })
    } catch (error) {
      // FIXME: Rejected thunks return undefined instead of throwing
      return null
    }
  },
)
