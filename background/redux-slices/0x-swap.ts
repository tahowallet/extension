import { createSelector, createSlice } from "@reduxjs/toolkit"
import { fetchJson } from "@ethersproject/web"
import { BigNumber, ethers, utils } from "ethers"

import { createBackgroundAsyncThunk } from "./utils"
import { SmartContractFungibleAsset } from "../assets"
import logger from "../lib/logger"
import {
  isValidSwapPriceResponse,
  isValidSwapQuoteResponse,
  ValidatedType,
} from "../lib/validate"
import { getProvider } from "./utils/contract-utils"
import { ERC20_ABI } from "../lib/erc20"

interface SwapAssets {
  sellAsset: SmartContractFungibleAsset
  buyAsset: SmartContractFungibleAsset
}

type SwapAmount =
  | {
      sellAmount: string
    }
  | {
      buyAmount: string
    }

export type SwapQuoteRequest = {
  assets: SwapAssets
  amount: SwapAmount
  slippageTolerance: number
  gasPrice: bigint
}

export type ZrxPrice = ValidatedType<typeof isValidSwapPriceResponse>
export type ZrxQuote = ValidatedType<typeof isValidSwapQuoteResponse>

export interface SwapState {
  latestQuoteRequest?: SwapQuoteRequest | undefined
  finalQuote?: ZrxQuote | undefined
  approvalInProgress?: boolean
}

export const initialState: SwapState = {
  approvalInProgress: false,
}

const swapSlice = createSlice({
  name: "0x-swap",
  initialState,
  reducers: {
    setFinalSwapQuote: (
      state,
      { payload: finalQuote }: { payload: ZrxQuote }
    ) => ({
      ...state,
      finalQuote,
    }),

    setLatestQuoteRequest: (
      state,
      { payload: quoteRequest }: { payload: SwapQuoteRequest }
    ) => ({
      ...state,
      latestQuoteRequest: quoteRequest,
    }),

    setApprovalInProgress: (state) => ({
      ...state,
      approvalInProgress: true,
    }),

    clearApprovalInProgress: (state) => ({
      ...state,
      approvalInProgress: false,
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
  setApprovalInProgress,
  clearApprovalInProgress,
} = swapSlice.actions

export const { setFinalSwapQuote, clearSwapQuote } = swapSlice.actions
export default swapSlice.reducer

// Helper to build a URL to the 0x API for a given swap quote request. Usable
// for both /price and /quote endpoints, returns a URL instance that can be
// stringified or otherwise massaged.
function build0xUrlFromSwapRequest(
  requestPath: string,
  { assets, amount, slippageTolerance, gasPrice }: SwapQuoteRequest,
  additionalParameters?: Record<string, string>
): URL {
  const requestUrl = new URL(`https://api.0x.org/swap/v1${requestPath}`)
  const tradeAmount = utils.parseUnits(
    "buyAmount" in amount ? amount.buyAmount : amount.sellAmount,
    "buyAmount" in amount ? assets.buyAsset.decimals : assets.sellAsset.decimals
  )

  // When available, use smart contract addresses. Once non-smart contract
  // assets are added (e.g., ETH), switch to `.symbol` for those.
  const sellToken = assets.sellAsset.contractAddress
  const buyToken = assets.buyAsset.contractAddress

  // Depending on whether the set amount is buy or sell, request the trade.
  // The /price endpoint is for RFQ-T indicative quotes, while /quote is for
  // firm quotes, which the Tally UI calls "final" quotes that the user
  // intends to fill.
  const tradeField = "buyAmount" in amount ? "buyAmount" : "sellAmount"

  Object.entries({
    sellToken,
    buyToken,
    gasPrice: gasPrice.toString(),
    slippagePercentage: slippageTolerance.toString(),
    [tradeField]: tradeAmount.toString(),
    ...additionalParameters,
  }).forEach(([parameter, value]) => {
    requestUrl.searchParams.set(parameter, value)
  })

  return requestUrl
}

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

    const requestUrl = build0xUrlFromSwapRequest("/quote", quoteRequest, {
      intentOnFilling: "true",
      takerAddress: tradeAddress,
    })

    const apiData = await fetchJson(requestUrl.toString())

    if (!isValidSwapQuoteResponse(apiData)) {
      logger.warn(
        "Swap quote API call didn't validate, did the 0x API change?",
        apiData,
        isValidSwapQuoteResponse.errors
      )

      return
    }

    dispatch(setFinalSwapQuote(apiData))
  }
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
    quoteRequest: SwapQuoteRequest,
    { dispatch }
  ): Promise<{ quote: ZrxPrice; needsApproval: boolean } | undefined> => {
    const requestUrl = build0xUrlFromSwapRequest("/price", quoteRequest)

    const apiData = await fetchJson(requestUrl.toString())

    if (!isValidSwapPriceResponse(apiData)) {
      logger.warn(
        "Swap price API call didn't validate, did the 0x API change?",
        apiData,
        isValidSwapQuoteResponse.errors
      )

      return undefined
    }

    const quote = apiData
    const signer = getProvider().getSigner()

    // Check if we have to approve the asset we want to swap.
    const assetContract = new ethers.Contract(
      quote.sellTokenAddress,
      ERC20_ABI,
      signer
    )

    const existingAllowance: BigNumber =
      await assetContract.callStatic.allowance(
        await signer.getAddress(),
        quote.allowanceTarget
      )

    const needsApproval = existingAllowance.lt(quote.sellAmount)

    dispatch(setLatestQuoteRequest(quoteRequest))

    return { quote, needsApproval }
  }
)

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
    { dispatch }
  ) => {
    const provider = getProvider()
    const signer = provider.getSigner()

    const assetContract = new ethers.Contract(
      assetContractAddress,
      ERC20_ABI,
      signer
    )
    const approvalTransactionData =
      await assetContract.populateTransaction.approve(
        approvalTarget,
        ethers.constants.MaxUint256 // infinite approval :(
      )

    dispatch(setApprovalInProgress())
    try {
      const transactionHash = await signer.sendUncheckedTransaction(
        approvalTransactionData
      )

      // Wait for transaction to mine before indicating approval is complete.
      await provider.waitForTransaction(transactionHash)
    } catch (error) {
      logger.error("Approval transaction failed: ", error)
    }
    dispatch(clearApprovalInProgress())
  }
)

export const executeSwap = createBackgroundAsyncThunk(
  "0x-swap/executeSwap",
  async (quote: ZrxQuote, { dispatch }) => {
    const provider = getProvider()
    const signer = provider.getSigner()

    // Clear the swap quote, then request signature + broadcast.
    dispatch(clearSwapQuote())

    await signer.sendTransaction({
      chainId: quote.chainId,
      data: quote.data,
      gasLimit: BigNumber.from(quote.gas),
      gasPrice: BigNumber.from(quote.gasPrice),
      to: quote.to,
      value: BigNumber.from(quote.value),
      type: 1 as const,
    })
  }
)

export const selectLatestQuoteRequest = createSelector(
  (state: { swap: SwapState }) => state.swap.latestQuoteRequest,
  (latestQuoteRequest) => latestQuoteRequest
)

export const selectIsApprovalInProgress = createSelector(
  (state: { swap: SwapState }) => state.swap.approvalInProgress,
  (approvalInProgress) => approvalInProgress
)
