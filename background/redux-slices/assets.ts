import { createSelector, createSlice } from "@reduxjs/toolkit"
import { ethers } from "ethers"
import {
  AnyAsset,
  AnyAssetAmount,
  AssetMetadata,
  flipPricePoint,
  isFungibleAsset,
  isSmartContractFungibleAsset,
  PricePoint,
  SmartContractFungibleAsset,
} from "../assets"
import { AddressOnNetwork } from "../accounts"
import { findClosestAssetIndex } from "../lib/asset-similarity"
import { normalizeEVMAddress, sameEVMAddress } from "../lib/utils"
import { createBackgroundAsyncThunk } from "./utils"
import {
  isBuiltInNetworkBaseAsset,
  sameBuiltInNetworkBaseAsset,
} from "./utils/asset-utils"
import { getProvider } from "./utils/contract-utils"
import { EVMNetwork, sameNetwork } from "../networks"
import { ERC20_INTERFACE } from "../lib/erc20"
import logger from "../lib/logger"
import {
  BUILT_IN_NETWORK_BASE_ASSETS,
  FIAT_CURRENCIES_SYMBOL,
} from "../constants"
import { convertFixedPoint } from "../lib/fixed-point"
import { updateAssetReferences } from "./accounts"
import { NormalizedEVMAddress } from "../types"
import type { RootState } from "."

export type AssetWithRecentPrices<T extends AnyAsset = AnyAsset> = T & {
  recentPrices: {
    [assetSymbol: string]: PricePoint
  }
}

export type SingleAssetState = AssetWithRecentPrices

export type AssetsState = SingleAssetState[]

export const initialState = [] as AssetsState

const assetsSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {
    assetsLoaded: (
      immerState,
      { payload: newAssets }: { payload: AnyAsset[] }
    ) => {
      const mappedAssets: { [sym: string]: SingleAssetState[] } = {}
      // bin existing known assets
      immerState.forEach((asset) => {
        if (mappedAssets[asset.symbol] === undefined) {
          mappedAssets[asset.symbol] = []
        }
        // if an asset is already in state, assume unique checks have been done
        // no need to check network, contract address, etc
        mappedAssets[asset.symbol].push(asset)
      })
      // merge in new assets
      newAssets.forEach((newAsset) => {
        if (mappedAssets[newAsset.symbol] === undefined) {
          mappedAssets[newAsset.symbol] = [{ ...newAsset, recentPrices: {} }]
        } else {
          const duplicates = mappedAssets[newAsset.symbol].filter(
            (existingAsset) =>
              ("homeNetwork" in newAsset &&
                "contractAddress" in newAsset &&
                "homeNetwork" in existingAsset &&
                "contractAddress" in existingAsset &&
                existingAsset.homeNetwork.name === newAsset.homeNetwork.name &&
                normalizeEVMAddress(existingAsset.contractAddress) ===
                  normalizeEVMAddress(newAsset.contractAddress)) ||
              // Only match base assets by name - since there may be
              // many assets that share a name and symbol across L2's
              BUILT_IN_NETWORK_BASE_ASSETS.some(
                (baseAsset) =>
                  sameBuiltInNetworkBaseAsset(baseAsset, newAsset) &&
                  sameBuiltInNetworkBaseAsset(baseAsset, existingAsset)
              )
          )
          // if there aren't duplicates, add the asset
          if (duplicates.length === 0) {
            mappedAssets[newAsset.symbol].push({
              ...newAsset,
              recentPrices: {},
            })
          }
          // TODO if there are duplicates... when should we replace assets?
        }
      })

      return Object.values(mappedAssets).flat()
    },
    newPricePoint: (
      immerState,
      { payload: pricePoint }: { payload: PricePoint }
    ) => {
      const fiatCurrency = pricePoint.pair.find((asset) =>
        FIAT_CURRENCIES_SYMBOL.includes(asset.symbol)
      )
      const [pricedAsset] = pricePoint.pair.filter(
        (asset) => asset !== fiatCurrency
      )
      if (fiatCurrency && pricedAsset) {
        const index = findClosestAssetIndex(pricedAsset, immerState)
        if (typeof index !== "undefined") {
          immerState[index].recentPrices[fiatCurrency.symbol] = pricePoint
        }
      }
    },
    updateAssetMetadata: (
      immerState,
      {
        payload: [targetAsset, metadata],
      }: { payload: [SmartContractFungibleAsset, Partial<AssetMetadata>] }
    ) => {
      immerState.forEach((asset) => {
        if (
          isSmartContractFungibleAsset(asset) &&
          sameEVMAddress(targetAsset.contractAddress, asset.contractAddress) &&
          targetAsset.homeNetwork.chainID === asset.homeNetwork.chainID
        ) {
          // eslint-disable-next-line no-param-reassign
          asset.metadata ??= {}
          Object.assign(asset.metadata, metadata)
        }
      })
    },
  },
})

export const { assetsLoaded, newPricePoint, updateAssetMetadata } =
  assetsSlice.actions

export default assetsSlice.reducer

const selectAssetsState = (state: AssetsState) => state
const selectAsset = (_: AssetsState, asset: AnyAsset) => asset

const selectPairedAssetSymbol = (
  _: AssetsState,
  _2: AnyAsset,
  pairedAssetSymbol: string
) => pairedAssetSymbol

export const updateAssetTrustStatus = createBackgroundAsyncThunk(
  "assets/updateAssetTrustStatus",
  async (
    { asset, trusted }: { asset: SmartContractFungibleAsset; trusted: boolean },
    { dispatch, extra: { main } }
  ) => {
    await main.setAssetTrustStatus(asset, trusted)
    // Update assets slice
    await dispatch(updateAssetMetadata([asset, { trusted }]))
    // Update accounts slice cached data about this asset
    await dispatch(
      updateAssetReferences({
        ...asset,
        metadata: { ...asset.metadata, trusted },
      })
    )
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

    if (isBuiltInNetworkBaseAsset(assetAmount.asset, fromNetwork)) {
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

/**
 * Selects a particular asset price point given the asset symbol and the paired
 * asset symbol used to price it.
 *
 * For example, calling `selectAssetPricePoint(state.assets, ETH, "USD")`
 * will return the ETH-USD price point, if it exists. Note that this selector
 * guarantees that the returned price point will have the pair in the specified
 * order, so even if the store price point has amounts in the order [USD, ETH],
 * the selector will return them in the order [ETH, USD].
 */
export const selectAssetPricePoint = createSelector(
  [selectAssetsState, selectAsset, selectPairedAssetSymbol],
  (assets, assetToFind, pairedAssetSymbol) => {
    const hasRecentPriceData = (asset: SingleAssetState): boolean =>
      pairedAssetSymbol in asset.recentPrices &&
      asset.recentPrices[pairedAssetSymbol].pair.some(
        ({ symbol }) => symbol === assetToFind.symbol
      )

    let pricedAsset: SingleAssetState | undefined

    /* If we're looking for a smart contract, try to find an exact price point */
    if (isSmartContractFungibleAsset(assetToFind)) {
      pricedAsset = assets.find(
        (asset): asset is AssetWithRecentPrices<SmartContractFungibleAsset> =>
          isSmartContractFungibleAsset(asset) &&
          asset.contractAddress === assetToFind.contractAddress &&
          asset.homeNetwork.chainID === assetToFind.homeNetwork.chainID &&
          hasRecentPriceData(asset)
      )

      /* Don't do anything else if this is an untrusted asset and there's no exact match */
      if (
        (assetToFind.metadata?.tokenLists?.length ?? 0) < 1 &&
        !isBuiltInNetworkBaseAsset(assetToFind, assetToFind.homeNetwork)
      ) {
        return undefined
      }
    }

    /* Otherwise, find a best-effort match by looking for assets with the same symbol  */
    if (!pricedAsset) {
      pricedAsset = assets.find(
        (asset) =>
          asset.symbol === assetToFind.symbol && hasRecentPriceData(asset)
      )
    }

    if (pricedAsset) {
      let pricePoint = pricedAsset.recentPrices[pairedAssetSymbol]

      // Flip it if the price point looks like USD-ETH
      if (pricePoint.pair[0].symbol !== assetToFind.symbol) {
        pricePoint = flipPricePoint(pricePoint)
      }

      const assetDecimals = isFungibleAsset(assetToFind)
        ? assetToFind.decimals
        : 0
      const pricePointAssetDecimals = isFungibleAsset(pricePoint.pair[0])
        ? pricePoint.pair[0].decimals
        : 0

      if (assetDecimals !== pricePointAssetDecimals) {
        const { amounts } = pricePoint
        pricePoint = {
          ...pricePoint,
          amounts: [
            convertFixedPoint(
              amounts[0],
              pricePointAssetDecimals,
              assetDecimals
            ),
            amounts[1],
          ],
        }
      }

      return pricePoint
    }

    // If no matching priced asset was found, return undefined.
    return undefined
  }
)

export const importAccountCustomToken = createBackgroundAsyncThunk(
  "assets/importAccountCustomToken",
  async (
    {
      asset,
    }: {
      asset: SmartContractFungibleAsset
    },
    { getState, extra: { main } }
  ) => {
    const state = getState() as RootState
    const currentAccount = state.ui.selectedAccount

    await main.importAccountCustomToken({
      asset,
      addressNetwork: currentAccount,
    })
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
