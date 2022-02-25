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
import { COMMUNITY_MULTISIG_ADDRESS } from "../constants"

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

    setInProgressApprovalContract: (
      state,
      { payload: approvingContractAddress }: { payload: string }
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
  clearInProgressApprovalContract: clearApprovalInProgress,
} = swapSlice.actions

export const { setFinalSwapQuote, clearSwapQuote } = swapSlice.actions
export default swapSlice.reducer

export const SWAP_FEE = 0.005

// Use gated features if there is an API key available in the build.
const zeroXApiBase =
  typeof process.env.ZEROX_API_KEY !== "undefined" &&
  process.env.ZEROX_API_KEY.trim() !== ""
    ? "gated.api.0x.org"
    : "api.0x.org"
const gatedParameters = {
  affiliateAddress: COMMUNITY_MULTISIG_ADDRESS,
  feeRecipient: COMMUNITY_MULTISIG_ADDRESS,
  buyTokenPercentageFee: SWAP_FEE,
}
const gatedHeaders: { [header: string]: string } =
  typeof process.env.ZEROX_API_KEY !== "undefined" &&
  process.env.ZEROX_API_KEY.trim() !== ""
    ? {
        "0x-api-key": process.env.ZEROX_API_KEY,
      }
    : {}

// Helper to build a URL to the 0x API for a given swap quote request. Usable
// for both /price and /quote endpoints, returns a URL instance that can be
// stringified or otherwise massaged.
function build0xUrlFromSwapRequest(
  requestPath: string,
  { assets, amount, slippageTolerance, gasPrice }: SwapQuoteRequest,
  additionalParameters?: Record<string, string>
): URL {
  const requestUrl = new URL(`https://${zeroXApiBase}/swap/v1${requestPath}`)
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
    ...gatedParameters,
    ...additionalParameters,
  }).forEach(([parameter, value]) => {
    requestUrl.searchParams.set(parameter, value.toString())
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

    const apiData = await fetchJson({
      url: requestUrl.toString(),
      headers: gatedHeaders,
    })

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
    const signer = getProvider().getSigner()
    const tradeAddress = await signer.getAddress()

    const requestUrl = build0xUrlFromSwapRequest("/price", quoteRequest, {
      takerAddress: tradeAddress,
    })

    const apiData = await fetchJson({
      url: requestUrl.toString(),
      headers: gatedHeaders,
    })

    if (!isValidSwapPriceResponse(apiData)) {
      logger.warn(
        "Swap price API call didn't validate, did the 0x API change?",
        apiData,
        isValidSwapQuoteResponse.errors
      )

      return undefined
    }

    const quote = apiData

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
    { dispatch }
  ) => {
    dispatch(setApprovalInProgress(assetContractAddress))

    try {
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

      logger.debug("Issuing approval transaction", approvalTransactionData)
      const transactionHash = await signer.sendUncheckedTransaction(
        approvalTransactionData
      )

      // Wait for transaction to mine before indicating approval is complete.
      const receipt = await provider.waitForTransaction(transactionHash)
      logger.debug("Approval transaction mined", receipt)
    } catch (error) {
      logger.error("Approval transaction failed: ", error)
    }

    dispatch(clearApprovalInProgress())
  }
)

/**
 * This async thunk prepares and executes a 0x swap transaction based on a
 * quote.
 */
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

export const selectInProgressApprovalContract = createSelector(
  (state: { swap: SwapState }) => state.swap.inProgressApprovalContract,
  (approvalInProgress) => approvalInProgress
)
