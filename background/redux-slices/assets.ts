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
import { EVMNetwork, NetworkBaseAsset, sameNetwork } from "../networks"
import { NormalizedEVMAddress } from "../types"
import { removeAssetReferences, updateAssetReferences } from "./accounts"
import { createBackgroundAsyncThunk } from "./utils"
import {
  FullAssetID,
  getFullAssetID,
  isBaseAssetForNetwork,
  isBaselineTrustedAsset,
  isNetworkBaseAsset,
} from "./utils/asset-utils"
import { getProvider } from "./utils/contract-utils"

export type SingleAssetState = AnyAsset

export type AssetsState = { [assetID: FullAssetID]: SingleAssetState }

export const initialState: AssetsState = {}

const assetsSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {
    assetsLoaded: (
      immerState,
      {
        payload: newAssets,
      }: { payload: (NetworkBaseAsset | SmartContractFungibleAsset)[] }
    ) => {
      newAssets.forEach((newAsset) => {
        const newAssetId = getFullAssetID(newAsset)

        const existing = immerState[newAssetId]
        if (existing) {
          // Update all properties except metadata for network base assets
          if (isNetworkBaseAsset(existing)) {
            const { metadata: _, ...rest } = newAsset
            Object.assign(existing, rest)
          }

          if (isSmartContractFungibleAsset(existing) && newAsset.metadata) {
            existing.metadata ??= {}

            // Update verified status, token lists or discovery txs for custom assets
            if (!isBaselineTrustedAsset(existing)) {
              existing.metadata.verified = (<SmartContractFungibleAsset>(
                newAsset
              ))?.metadata?.verified

              if (newAsset.metadata?.tokenLists?.length) {
                existing.metadata.tokenLists = newAsset.metadata.tokenLists
              }

              if ("discoveryTxHash" in newAsset.metadata) {
                existing.metadata.discoveryTxHash =
                  newAsset.metadata.discoveryTxHash
              }
            }
          }
        } else {
          immerState[newAssetId] = newAsset
        }
      })
    },
    removeAsset: (
      immerState,
      {
        payload: removedAsset,
      }: { payload: NetworkBaseAsset | SmartContractFungibleAsset }
    ) => {
      delete immerState[getFullAssetID(removedAsset)]
    },
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
    { extra: { main } }
  ) => {
    await main.updateAssetMetadata(asset, metadata)
  }
)

export const refreshAsset = createBackgroundAsyncThunk(
  "assets/refreshAsset",
  async (
    {
      asset,
    }: {
      asset: SmartContractFungibleAsset
    },
    { dispatch }
  ) => {
    // Update assets slice
    await dispatch(assetsLoaded([asset]))
    // Update accounts slice cached data about this asset
    await dispatch(updateAssetReferences(asset))
  }
)

export const hideAsset = createBackgroundAsyncThunk(
  "assets/hideAsset",
  async (
    {
      asset,
    }: {
      asset: SmartContractFungibleAsset
    },
    { extra: { main } }
  ) => {
    await main.hideAsset(asset)
  }
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
    { dispatch }
  ) => {
    await dispatch(removeAsset(asset))
    await dispatch(removeAssetReferences(asset))
  }
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
          `${fromAddress} to ${toAddress} as a base asset transfer.`
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
          `${fromAddress} to ${toAddress} as an ERC20 transfer.`
      )
      const token = new ethers.Contract(
        assetAmount.asset.contractAddress,
        ERC20_INTERFACE,
        signer
      )

      const transactionDetails = await token.populateTransaction.transfer(
        toAddress,
        assetAmount.amount
      )

      await signer.sendUncheckedTransaction({
        ...transactionDetails,
        gasLimit: gasLimit ?? transactionDetails.gasLimit,
        nonce,
      })
    } else {
      throw new Error(
        "Only base and fungible smart contract asset transfers are supported for now."
      )
    }
  }
)

export const importCustomToken = createBackgroundAsyncThunk(
  "assets/importCustomToken",
  async (
    {
      asset,
    }: {
      asset: SmartContractFungibleAsset
    },
    { extra: { main } }
  ) => {
    return { success: await main.importCustomToken(asset) }
  }
)

export const checkTokenContractDetails = createBackgroundAsyncThunk(
  "assets/checkTokenContractDetails",
  async (
    {
      contractAddress,
      network,
    }: { contractAddress: NormalizedEVMAddress; network: EVMNetwork },
    { getState, extra: { main } }
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
  }
)
