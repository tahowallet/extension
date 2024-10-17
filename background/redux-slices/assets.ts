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
import { removeAssetReferences, updateAssetReferences } from "./accounts"
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
          ? newAssets.flatMap((asset) =>
              "homeNetwork" in asset ? [asset.homeNetwork] : [],
            )
          : []

      const existingAssetsBySymbol: { [sym: string]: SingleAssetState[] } = {}

      // If loadingScope is `all`, mappedAssets is left empty as the incoming
      // asset list is comprehensive. Otherwise, bin existing known assets so
      // their data can be updated.
      if (loadingScope !== "all") {
        immerState.forEach((asset) => {
          existingAssetsBySymbol[asset.symbol] ??= []

          existingAssetsBySymbol[asset.symbol].push(asset)
        })
      }

      // merge in new assets
      newAssets.forEach((newAsset) => {
        if (existingAssetsBySymbol[newAsset.symbol] === undefined) {
          existingAssetsBySymbol[newAsset.symbol] = [
            {
              ...newAsset,
            },
          ]
        } else {
          const duplicateIndexes = existingAssetsBySymbol[
            newAsset.symbol
          ].reduce<number[]>((acc, existingAsset, id) => {
            if (isSameAsset(newAsset, existingAsset)) {
              acc.push(id)
            }
            return acc
          }, [])

          // if there aren't duplicates, add the asset
          if (duplicateIndexes.length === 0) {
            existingAssetsBySymbol[newAsset.symbol].push({
              ...newAsset,
            })
          } else if (
            "homeNetwork" in newAsset &&
            networksToReset.some(
              (network) => newAsset.homeNetwork.chainID === network.chainID,
            )
          ) {
            // When a network is being reset, replace all the data at all
            // duplicate indices, but not the objects themselves, so that
            // diffing continues to identify the objects in the array as
            // unchanged (though their properties might be).
            duplicateIndexes.forEach((id) => {
              // Update only the metadata for the duplicate
              Object.keys(newAsset).forEach((key) => {
                ;(
                  existingAssetsBySymbol[newAsset.symbol][id] as Record<
                    string,
                    unknown
                  >
                )[key] = (newAsset as Record<string, unknown>)[key]
              })
            })
          } else {
            // TODO if there are duplicates... when should we replace assets?
            duplicateIndexes.forEach((id) => {
              // Update only the metadata for the duplicate
              existingAssetsBySymbol[newAsset.symbol][id] = {
                ...existingAssetsBySymbol[newAsset.symbol][id],
                metadata: newAsset.metadata,
              }
            })
          }
        }
      })

      return Object.values(existingAssetsBySymbol).flat()
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
    await dispatch(updateAssetReferences(asset))
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
