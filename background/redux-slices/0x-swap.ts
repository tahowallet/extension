import { createSlice } from "@reduxjs/toolkit"
import { BigNumber, ethers } from "ethers"

import {
  isSmartContractFungibleAsset,
  PricePoint,
  SwappableAsset,
} from "../assets"
import { getPrice, getQuote } from "../lib/0x-swap"
import { SwapPriceResponse, SwapQuoteResponse } from "../lib/0x-swap-types"
import { ERC20_ABI } from "../lib/erc20"
import logger from "../lib/logger"
import { getUSDPriceForTokens } from "../lib/priceOracle"
import { getPricePoint } from "../lib/prices"
import { PricesState, selectAssetPricePoint } from "./prices"
import { setSnackbarMessage } from "./ui"
import { createBackgroundAsyncThunk } from "./utils"
import { PriceDetails, SwapQuoteRequest } from "./utils/0x-swap-utils"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  isNetworkBaseAsset,
} from "./utils/asset-utils"
import { getProvider } from "./utils/contract-utils"

export interface SwapState {
  latestQuoteRequest?: SwapQuoteRequest | undefined
  finalQuote?: SwapQuoteResponse | undefined
  inProgressApprovalContract?: string
}

export const initialState: SwapState = {
  inProgressApprovalContract: undefined,
}

const swapSlice = createSlice({
  name: "0x-swap",
  initialState,
  reducers: {
    setFinalSwapQuote: (
      state,
      { payload: finalQuote }: { payload: SwapQuoteResponse },
    ) => ({
      ...state,
      finalQuote,
    }),

    setLatestQuoteRequest: (
      state,
      { payload: quoteRequest }: { payload: SwapQuoteRequest },
    ) => ({
      ...state,
      latestQuoteRequest: quoteRequest,
    }),

    setInProgressApprovalContract: (
      state,
      { payload: approvingContractAddress }: { payload: string },
    ) => ({
      ...state,
      inProgressApprovalContract: approvingContractAddress,
    }),

    clearInProgressApprovalContract: (state) => ({
      ...state,
      inProgressApprovalContract: undefined,
    }),

    clearSwapQuote: (state) => ({
      ...state,
      finalQuote: undefined,
      latestQuoteRequest: undefined,
    }),
  },
})

const {
  setLatestQuoteRequest,
  setInProgressApprovalContract: setApprovalInProgress,
} = swapSlice.actions

export const {
  setFinalSwapQuote,
  clearSwapQuote,
  clearInProgressApprovalContract: clearApprovalInProgress,
} = swapSlice.actions

export default swapSlice.reducer

/**
 * This async thunk fetches an firm RFQ-T quote for a swap. The quote request
 * specifies the swap assets as well as one end of the swap, and the returned
 * price quote includes the amount on the other side of the swap, as well as
 * information on sources that would be used to fulfill the swap and all data
 * needed to make a (pre-EIP1559) transaction for the swap to execute.
 */
export const fetchSwapQuote = createBackgroundAsyncThunk(
  "0x-swap/fetchQuote",
  async (quoteRequest: SwapQuoteRequest, { dispatch }) => {
    const signer = getProvider().getSigner()
    const tradeAddress = await signer.getAddress()

    // TODO: Handle lack of liquidity, errors

    const apiData = await getQuote({
      ...quoteRequest,
      taker: tradeAddress,
    })

    if (!apiData) {
      return null
    }

    dispatch(setFinalSwapQuote(apiData))

    return apiData
  },
)

/**
 * This async thunk fetches an indicative RFQ-T price for a swap. The quote
 * request specifies the swap assets as well as one end of the swap, and the
 * returned price quote includes the amount on the other side of the swap, as
 * well as information on sources that would be used to fulfill the swap and an
 * indicator as to whether a successful execution of the swap requires an ERC20
 * `approve` transaction for the sell asset.
 */
export const fetchSwapPrice = createBackgroundAsyncThunk(
  "0x-swap/fetchPrice",
  async (
    {
      quoteRequest,
    }: {
      quoteRequest: SwapQuoteRequest
    },
    { dispatch, getState },
  ): Promise<
    | {
        quote: Extract<SwapPriceResponse, { liquidityAvailable: true }>
        needsApproval: boolean
        priceDetails: PriceDetails
      }
    | undefined
  > => {
    const signer = getProvider().getSigner()
    const taker = await signer.getAddress()
    const { prices } = getState() as {
      prices: PricesState
    }

    const getPriceDetails = async (
      quote: Extract<SwapPriceResponse, { liquidityAvailable: true }>,
    ) => {
      const { buyAsset, sellAsset } = quoteRequest.assets

      let [buyAssetPricePoint, sellAssetPricePoint] = [] as (
        | PricePoint
        | undefined
      )[]

      const assetPricesByContract = await getUSDPriceForTokens(
        [quoteRequest.assets.buyAsset, quoteRequest.assets.sellAsset].filter(
          isSmartContractFungibleAsset,
        ),
        quoteRequest.network,
        getProvider(),
      )

      if (isNetworkBaseAsset(buyAsset)) {
        buyAssetPricePoint = selectAssetPricePoint(prices, buyAsset, "USD")
      } else if (assetPricesByContract[buyAsset.contractAddress]) {
        buyAssetPricePoint = getPricePoint(
          buyAsset,
          assetPricesByContract[buyAsset.contractAddress],
        )
      }

      if (isNetworkBaseAsset(sellAsset)) {
        sellAssetPricePoint = selectAssetPricePoint(prices, sellAsset, "USD")
      } else if (assetPricesByContract[sellAsset.contractAddress]) {
        sellAssetPricePoint = getPricePoint(
          sellAsset,
          assetPricesByContract[sellAsset.contractAddress],
        )
      }

      return {
        // FIXME: deprecated, possibly coming back on 0x api
        priceImpact: 0,
        buyCurrencyAmount: buyAssetPricePoint
          ? enrichAssetAmountWithMainCurrencyValues(
              { asset: buyAsset, amount: BigInt(quote.buyAmount) },
              buyAssetPricePoint,
              2,
            ).localizedMainCurrencyAmount
          : undefined,
        sellCurrencyAmount: sellAssetPricePoint
          ? enrichAssetAmountWithMainCurrencyValues(
              { asset: sellAsset, amount: BigInt(quote.sellAmount) },
              sellAssetPricePoint,
              2,
            ).localizedMainCurrencyAmount
          : undefined,
      }
    }

    let quote: Awaited<ReturnType<typeof getPrice>> | null = null

    try {
      quote = await getPrice({ ...quoteRequest, taker })

      if (!quote || quote.liquidityAvailable === false) {
        dispatch(setSnackbarMessage("Insufficient liquidity for this trade"))
        return undefined
      }

      const priceDetails = getPriceDetails(quote)

      let needsApproval = false
      // If we aren't selling ETH, check whether we need an approval to swap
      // TODO Handle other non-ETH base assets
      if (
        quote.allowanceTarget !== null &&
        quote.sellToken !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      ) {
        const assetContract = new ethers.Contract(
          quote.sellToken,
          ERC20_ABI,
          signer,
        )

        const existingAllowance: BigNumber =
          await assetContract.callStatic.allowance(
            await signer.getAddress(),
            quote.allowanceTarget,
          )

        needsApproval = existingAllowance.lt(quote.sellAmount)
      }

      dispatch(setLatestQuoteRequest(quoteRequest))

      return { quote, needsApproval, priceDetails: await priceDetails }
    } catch (error) {
      logger.warn("Swap price API call threw an error!", quote, error)

      try {
        if (typeof error === "object" && error !== null && "body" in error) {
          // TODO: i18n this string
          dispatch(setSnackbarMessage("Error while fetching swap prices"))
        }
      } catch (e) {
        logger.warn("0x Api Response Parsing Failed")
      }

      return undefined
    }
  },
)

/**
 * This async thunk prepares and executes an ERC20 `approve` transaction for
 * the specified contract address and approval target (typically a smart
 * contract address). It is used to approve an allowanceTarget in a 0x swap
 * prior to executing the swap.
 */
export const approveTransfer = createBackgroundAsyncThunk(
  "0x-swap/approveTransfer",
  async (
    {
      assetContractAddress,
      approvalTarget,
    }: {
      assetContractAddress: string
      approvalTarget: string
    },
    { dispatch },
  ) => {
    dispatch(setApprovalInProgress(assetContractAddress))

    try {
      const provider = getProvider()
      const signer = provider.getSigner()

      const assetContract = new ethers.Contract(
        assetContractAddress,
        ERC20_ABI,
        signer,
      )
      const approvalTransactionData =
        await assetContract.populateTransaction.approve(
          approvalTarget,
          ethers.constants.MaxUint256, // infinite approval :(
        )

      logger.debug("Issuing approval transaction", approvalTransactionData)
      const transactionHash = await signer.sendUncheckedTransaction(
        approvalTransactionData,
      )

      // Wait for transaction to mine before indicating approval is complete.
      const receipt = await provider.waitForTransaction(transactionHash)
      logger.debug("Approval transaction mined", receipt)
    } catch (error) {
      logger.error("Approval transaction failed: ", error)
    } finally {
      dispatch(clearApprovalInProgress())
    }
  },
)

/**
 * This async thunk prepares and executes a 0x swap transaction based on a
 * quote.
 */
export const executeSwap = createBackgroundAsyncThunk(
  "0x-swap/executeSwap",
  async (
    quote: Exclude<SwapQuoteResponse, { liquidityAvailable: false }> & {
      sellAsset: SwappableAsset
      buyAsset: SwappableAsset
      chainId: string
    },
    { dispatch },
  ) => {
    const provider = getProvider()
    const signer = provider.getSigner()

    const sellAssetAmount = enrichAssetAmountWithDecimalValues(
      {
        asset: quote.sellAsset,
        amount: BigInt(quote.sellAmount),
      },
      2,
    )
    const buyAssetAmount = enrichAssetAmountWithDecimalValues(
      {
        asset: quote.buyAsset,
        amount: BigInt(quote.buyAmount),
      },
      2,
    )

    // Clear the swap quote, then request signature + broadcast.
    dispatch(clearSwapQuote())

    await signer.sendTransaction({
      chainId: Number(quote.chainId),
      data: quote.transaction.data,
      gasLimit: BigNumber.from(quote.transaction.gas),
      gasPrice: BigNumber.from(quote.transaction.gasPrice),
      to: quote.transaction.to,
      value: BigNumber.from(quote.transaction.value),
      type: 1 as const,
      annotation: {
        type: "asset-swap",
        fromAssetAmount: sellAssetAmount,
        toAssetAmount: buyAssetAmount,
        estimatedPriceImpact: 0, // disabled on v2
        sources: quote.route.fills
          .map(({ source, proportionBps }) => ({
            name: source,
            percentage:
              typeof proportionBps === "string"
                ? parseFloat(proportionBps) / 100
                : 0,
          }))
          .filter(({ percentage }) => percentage > 0),
        timestamp: Date.now(),
        blockTimestamp: undefined,
      },
    })
  },
)
