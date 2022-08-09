import { createSelector, createSlice } from "@reduxjs/toolkit"
import { ethers } from "ethers"
import {
  AnyAsset,
  AnyAssetAmount,
  isSmartContractFungibleAsset,
  PricePoint,
} from "../assets"
import { AddressOnNetwork } from "../accounts"
import { findClosestAssetIndex } from "../lib/asset-similarity"
import { normalizeEVMAddress } from "../lib/utils"
import { createBackgroundAsyncThunk } from "./utils"
import { isNetworkBaseAsset } from "./utils/asset-utils"
import { getProvider } from "./utils/contract-utils"
import { sameNetwork } from "../networks"
import { ERC20_INTERFACE } from "../lib/erc20"
import logger from "../lib/logger"
import { FIAT_CURRENCIES_SYMBOL } from "../constants"

type SingleAssetState = AnyAsset & {
  recentPrices: {
    [assetSymbol: string]: PricePoint
  }
}

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
      newAssets.forEach((asset) => {
        if (mappedAssets[asset.symbol] === undefined) {
          mappedAssets[asset.symbol] = [{ ...asset, recentPrices: {} }]
        } else {
          const duplicates = mappedAssets[asset.symbol].filter(
            (a) =>
              ("homeNetwork" in asset &&
                "contractAddress" in asset &&
                "homeNetwork" in a &&
                "contractAddress" in a &&
                a.homeNetwork.name === asset.homeNetwork.name &&
                normalizeEVMAddress(a.contractAddress) ===
                  normalizeEVMAddress(asset.contractAddress)) ||
              asset.name === a.name
          )
          // if there aren't duplicates, add the asset
          if (duplicates.length === 0) {
            mappedAssets[asset.symbol].push({
              ...asset,
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
  },
})

export const { assetsLoaded, newPricePoint } = assetsSlice.actions

export default assetsSlice.reducer

const selectAssetsState = (state: AssetsState) => state
const selectAssetSymbol = (_: AssetsState, assetSymbol: string) => assetSymbol

const selectPairedAssetSymbol = (
  _: AssetsState,
  _2: string,
  pairedAssetSymbol: string
) => pairedAssetSymbol

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
  }: {
    fromAddressNetwork: AddressOnNetwork
    toAddressNetwork: AddressOnNetwork
    assetAmount: AnyAssetAmount
    gasLimit?: bigint
  }) => {
    if (!sameNetwork(fromNetwork, toNetwork)) {
      throw new Error("Only same-network transfers are supported for now.")
    }

    const provider = getProvider()
    const signer = provider.getSigner()

    if (isNetworkBaseAsset(assetAmount.asset, fromNetwork)) {
      logger.debug(
        `Sending ${assetAmount.amount} ${assetAmount.asset.symbol} from ` +
          `${fromAddress} to ${toAddress} as a base asset transfer.`
      )
      await signer.sendTransaction({
        from: fromAddress,
        to: toAddress,
        value: assetAmount.amount,
        gasLimit,
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
 * For example, calling `selectAssetPricePoint(state.assets, "ETH", "USD")`
 * will return the ETH-USD price point, if it exists. Note that this selector
 * guarantees that the returned price point will have the pair in the specified
 * order, so even if the store price point has amounts in the order [USD, ETH],
 * the selector will return them in the order [ETH, USD].
 */
export const selectAssetPricePoint = createSelector(
  [selectAssetsState, selectAssetSymbol, selectPairedAssetSymbol],
  (assets, assetSymbol, pairedAssetSymbol) => {
    const pricedAsset = assets.find(
      (asset) =>
        asset.symbol === assetSymbol &&
        pairedAssetSymbol in asset.recentPrices &&
        asset.recentPrices[pairedAssetSymbol].pair
          .map(({ symbol }) => symbol)
          .includes(assetSymbol)
    )

    if (pricedAsset) {
      const pricePoint = pricedAsset.recentPrices[pairedAssetSymbol]
      const { pair, amounts, time } = pricePoint

      if (pair[0].symbol === assetSymbol) {
        return pricePoint
      }

      const flippedPricePoint: PricePoint = {
        pair: [pair[1], pair[0]],
        amounts: [amounts[1], amounts[0]],
        time,
      }

      return flippedPricePoint
    }

    // If no matching priced asset was found, return undefined.
    return undefined
  }
)
