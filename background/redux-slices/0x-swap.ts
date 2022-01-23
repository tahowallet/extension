import { createSlice } from "@reduxjs/toolkit"
import { fetchJson } from "@ethersproject/web"
import { BigNumber, ethers, utils } from "ethers"

import { createBackgroundAsyncThunk } from "./utils"
import { FungibleAsset, isSmartContractFungibleAsset } from "../assets"
import logger from "../lib/logger"
import { isValidSwapQuoteResponse, ValidatedType } from "../lib/validate"
import { getProvider } from "./utils/contract-utils"
import { ERC20_ABI } from "../lib/erc20"

interface SwapAssets {
  sellAsset: FungibleAsset
  buyAsset: FungibleAsset
}

type SwapAmount =
  | {
      sellAmount: string
    }
  | {
      buyAmount: string
    }

export type ZrxQuote = ValidatedType<typeof isValidSwapQuoteResponse>

export interface SwapState {
  finalQuote?: ZrxQuote | undefined
}

export const initialState: SwapState = {
  finalQuote: undefined,
}

export const approveTransfer = createBackgroundAsyncThunk(
  "0x-swap/approveTransfer",
  async ({
    assetContractAddress,
    approvalTarget,
  }: {
    assetContractAddress: string
    approvalTarget: string
  }) => {
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
        ethers.constants.MaxUint256.sub(1) // infinite approval :(
      )

    logger.log("Populated transaction data", approvalTransactionData)

    await signer.sendTransaction(approvalTransactionData)
  }
)

export const executeSwap = createBackgroundAsyncThunk(
  "0x-swap/executeSwap",
  async (quote: ZrxQuote) => {
    const provider = getProvider()
    const signer = provider.getSigner()

    // Check if we have to approve the asset we want to swap.
    const assetContract = new ethers.Contract(
      quote.sellTokenAddress,
      ERC20_ABI,
      signer
    )
    const pendingSignedRawTransactions: Promise<string>[] = []

    const existingAllowance: BigNumber =
      await assetContract.callStatic.allowance(
        await signer.getAddress(),
        quote.allowanceTarget
      )

    logger.log("here's our existing allowance!", existingAllowance)

    if (existingAllowance.lt(quote.sellAmount)) {
      const approvalTransactionData =
        await assetContract.populateTransaction.approve(
          quote.allowanceTarget,
          ethers.constants.MaxUint256.sub(1)
        )

      logger.log("Populated transaction data", approvalTransactionData)

      pendingSignedRawTransactions.push(
        signer.signTransaction(approvalTransactionData)
      )
    }

    logger.log("send that transaction!", quote)

    pendingSignedRawTransactions.push(
      signer.signTransaction({
        chainId: quote.chainId,
        data: quote.data,
        gasLimit: quote.gas,
        gasPrice: quote.gasPrice,
        to: quote.to,
        value: quote.value,
        type: 1 as const,
      })
    )

    const signedRawTransactions = await Promise.all(
      pendingSignedRawTransactions
    )

    // Send all at once.
    await Promise.all(
      signedRawTransactions.map((rawTransaction) =>
        provider.sendTransaction(rawTransaction)
      )
    )
  }
)

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

    clearSwapQuote: (state) => {
      return { ...state, finalQuote: undefined }
    },
  },
})

export const { setFinalSwapQuote, clearSwapQuote } = swapSlice.actions
export default swapSlice.reducer

export const fetchSwapData = createBackgroundAsyncThunk(
  "0x-swap/fetchQuote",
  async (
    {
      assets,
      amount,
      isFinal,
    }: {
      assets: SwapAssets
      amount: SwapAmount
      isFinal: boolean
    },
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

    // When available, use smart contract addresses.
    const sellToken = isSmartContractFungibleAsset(assets.sellAsset)
      ? assets.sellAsset.contractAddress
      : assets.sellAsset.symbol
    const buyToken = isSmartContractFungibleAsset(assets.buyAsset)
      ? assets.buyAsset.contractAddress
      : assets.buyAsset.symbol

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
    }

    return { quote, needsApproval }
  }
)
