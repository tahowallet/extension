import { createSlice } from "@reduxjs/toolkit"
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
import { removeAssetReferences, updateAccountAssetReferences } from "./accounts"
import { createBackgroundAsyncThunk } from "./utils"
import { isBaseAssetForNetwork, isSameAsset } from "./utils/asset-utils"
import { getProvider } from "./utils/contract-utils"

export type SingleAssetState = AnyAsset

export type AssetsState = SingleAssetState[]

export const initialState: AssetsState = []

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
      // For loading scope `network`, any network mentioned in `newAssets` is a
      // complete set and thus should replace data currently in the store.
      const networksToReset =
        loadingScope === "network"
          ? newAssets.reduce<EVMNetwork[]>((uniqueNetworks, asset) => {
              const lastNetwork = uniqueNetworks.at(-1)
              return "homeNetwork" in asset &&
                // Eliminate contiguous duplicates, which should generally be
                // all duplicates.
                (uniqueNetworks.length === 0 ||
                  (lastNetwork && !sameNetwork(asset.homeNetwork, lastNetwork)))
                ? [...uniqueNetworks, asset.homeNetwork]
                : uniqueNetworks
            }, [])
          : []

      // The goal here is to update the Immer state in such a way that minimal
      // object identity differences occur; this ensures that any diffing of
      // the state will produce reduced differences. To do this, we iterate all
      // existing assets, see if there is an update for those assets, and then
      // update the asset's properties. New assets that are used to update
      // existing assets in this way are deleted from the new asset list.
      //
      // When we are using a loading scope of `network` or `all`, we also mark
      // any existing assets that are _not_ in the incoming set for deletion.
      // We then delete everything at the end in batched `splice` operations.
      //
      // Finally, we insert any new assets that weren't used to update existing
      // assets.

      const newAssetsBySymbol: { [sym: string]: SingleAssetState[] } = {}

      newAssets.forEach((asset) => {
        newAssetsBySymbol[asset.symbol] ??= []

        newAssetsBySymbol[asset.symbol].push(asset)
      })

      const pruneIndexes: number[] = []
      immerState.forEach((existingAsset, i) => {
        const matchingNewAssets = (
          newAssetsBySymbol[existingAsset.symbol] ?? []
        ).filter((newAsset) => isSameAsset(existingAsset, newAsset))

        const assetOnAResettingNetwork =
          loadingScope === "network" &&
          networksToReset.some(
            (network) =>
              "homeNetwork" in existingAsset &&
              sameNetwork(existingAsset.homeNetwork, network),
          )

        // If there are no matching new assets, then we have a couple of
        // options.
        if (matchingNewAssets.length === 0) {
          // For network loads and full loads, no match means pruning if the
          // asset is on one of the included networks.
          if (
            loadingScope === "all" ||
            (loadingScope === "network" && assetOnAResettingNetwork)
          ) {
            pruneIndexes.push(i)
            return
          }
          // For incremental loads, no match means no action.
          return
        }

        // If there are matching new assets, then we have a couple of options.
        if (
          loadingScope === "all" ||
          (loadingScope === "network" && assetOnAResettingNetwork)
        ) {
          // If we're replacing all assets or this network's asset, assign all
          // data from the first matching new asset to the entry for the
          // existing asset.
          Object.assign(existingAsset, matchingNewAssets[0])
        } else {
          // If we're doing an incremental update, only update metadata from the
          // duplicate.
          immerState[i].metadata = matchingNewAssets[0].metadata
        }

        // Remove all matching assets from the matchingNewAssets list; for
        // incremental updates, this just means not adding duplicates later,
        // while for asset list replacements, this means any other duplicates
        // in existing and new lists both will be pruned.
        newAssetsBySymbol[existingAsset.symbol] = newAssetsBySymbol[
          existingAsset.symbol
        ].filter((newAsset) => !matchingNewAssets.includes(newAsset))
      })

      // Prune all indexes that were flagged for pruning.
      if (pruneIndexes.length === 1) {
        immerState.splice(pruneIndexes[0], 1)
      } else if (pruneIndexes.length > 1) {
        // Splice out contiguous index runs.
        const currentRun = { runStart: pruneIndexes[0], runLength: 1 }
        for (let i = 1; i < pruneIndexes.length; i += 1) {
          if (pruneIndexes[i] === currentRun.runStart + currentRun.runLength) {
            currentRun.runLength += 1
          } else {
            immerState.splice(currentRun.runStart, currentRun.runLength)

            currentRun.runStart = pruneIndexes[i]
            currentRun.runLength = 1
          }
        }
      }

      // Any remaining new assets had no duplicates in the existing asset list
      // and can be safely added.
      Object.values(newAssetsBySymbol)
        .flat()
        .forEach((newAsset) => {
          immerState.push(newAsset)
        })
    },
    removeAsset: (
      immerState,
      { payload: removedAsset }: { payload: AnyAsset },
    ) => immerState.filter((asset) => !isSameAsset(asset, removedAsset)),
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
    // Update assets slice
    await dispatch(
      assetsLoaded({ assets: [asset], loadingScope: "incremental" }),
    )
    // Update accounts slice cached data about this asset
    await dispatch(updateAccountAssetReferences([asset]))
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
