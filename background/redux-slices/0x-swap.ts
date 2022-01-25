import { createSelector, createSlice } from "@reduxjs/toolkit"
import { fetchJson } from "@ethersproject/web"
import { BigNumber, ethers, utils } from "ethers"

import { createBackgroundAsyncThunk } from "./utils"
import {
  SmartContractFungibleAsset,
  isSmartContractFungibleAsset,
} from "../assets"
import logger from "../lib/logger"
import { isValidSwapQuoteResponse, ValidatedType } from "../lib/validate"
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

type SwapQuoteRequest = {
  assets: SwapAssets
  amount: SwapAmount
  isFinal: boolean
}

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

export const fetchSwapData = createBackgroundAsyncThunk(
  "0x-swap/fetchQuote",
  async (
    { assets, amount, isFinal }: SwapQuoteRequest,
    { dispatch }
  ): Promise<{ quote: ZrxQuote; needsApproval: boolean } | undefined> => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const tradeAddress = await signer.getAddress()

    const tradeAmount = utils.parseUnits(
      "buyAmount" in amount ? amount.buyAmount : amount.sellAmount,
      "buyAmount" in amount
        ? assets.buyAsset.decimals
        : assets.sellAsset.decimals
    )

    // When available, use smart contract addresses. Once non-smart contract
    // assets are added (e.g., ETH), switch to `.symbol` for those.
    const sellToken = assets.sellAsset.contractAddress
    const buyToken = assets.buyAsset.contractAddress

    // Depending on whether the set amount is buy or sell, request the trade.
    const tradeField = "buyAmount" in amount ? "buyAmount" : "sellAmount"
    const apiData = await fetchJson(
      `https://api.0x.org/swap/v1/quote?` +
        `sellToken=${sellToken}&` +
        `buyToken=${buyToken}&` +
        `${tradeField}=${tradeAmount}` +
        `${isFinal ? `&intentOnFilling=true&takerAddress=${tradeAddress}` : ""}`
    )

    if (!isValidSwapQuoteResponse(apiData)) {
      logger.warn(
        "Swap quote API call didn't validate, did the 0x API change?",
        apiData,
        isValidSwapQuoteResponse.errors
      )

      logger.log("Booyak")
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
        tradeAddress,
        quote.allowanceTarget
      )

    const needsApproval = existingAllowance.lt(quote.sellAmount)

    if (isFinal) {
      dispatch(setFinalSwapQuote(apiData))
    } else {
      dispatch(setLatestQuoteRequest({ assets, amount, isFinal }))
    }

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
