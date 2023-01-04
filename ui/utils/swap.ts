import {
  AnyAsset,
  isSmartContractFungibleAsset,
  SwappableAsset,
} from "@tallyho/tally-background/assets"
import { EIP_1559_COMPLIANT_CHAIN_IDS } from "@tallyho/tally-background/constants"
import { fixedPointNumberToString } from "@tallyho/tally-background/lib/fixed-point"
import logger from "@tallyho/tally-background/lib/logger"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { fetchSwapPrice } from "@tallyho/tally-background/redux-slices/0x-swap"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { NetworkFeeSettings } from "@tallyho/tally-background/redux-slices/transaction-construction"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import {
  PriceDetails,
  SwapQuoteRequest,
} from "@tallyho/tally-background/redux-slices/utils/0x-swap-utils"
import { debounce, DebouncedFunc } from "lodash"
import { useState, useRef, useCallback } from "react"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import { useValueRef, useIsMounted, useSetState } from "../hooks/react-hooks"

const UPDATE_SWAP_QUOTE_DEBOUNCE_TIME = 500

export type QuoteUpdate = {
  type: QuoteType
  quote?: string
  priceDetails?: PriceDetails
  needsApproval: boolean
  approvalTarget?: string
  swapTransactionSettings: {
    slippageTolerance: number
    networkSettings: NetworkFeeSettings
  }
  sellAsset: SwappableAsset
  buyAsset: SwappableAsset
  quoteRequest: SwapQuoteRequest
  timestamp: number
  amount: string
}

export const fetchQuote = async ({
  type,
  amount,
  sellAsset,
  buyAsset,
  settings,
  network,
  getQuoteFn,
}: {
  type: QuoteType
  amount: string
  sellAsset: SwappableAsset
  buyAsset: SwappableAsset
  settings: {
    slippageTolerance: number
    networkSettings: NetworkFeeSettings
  }
  network: EVMNetwork
  getQuoteFn: (
    quoteRequest: SwapQuoteRequest
  ) => Promise<AsyncThunkFulfillmentType<typeof fetchSwapPrice>>
}): Promise<QuoteUpdate> => {
  const quoteRequest: SwapQuoteRequest = {
    assets: {
      sellAsset,
      buyAsset,
    },
    amount:
      type === "getSellAmount" ? { buyAmount: amount } : { sellAmount: amount },
    slippageTolerance: settings.slippageTolerance,
    gasPrice: EIP_1559_COMPLIANT_CHAIN_IDS.has(network.chainID)
      ? settings.networkSettings.values.maxFeePerGas
      : settings.networkSettings.values.gasPrice ?? 0n,
    network,
  }

  const updatedQuoteData = await getQuoteFn(quoteRequest)

  let requestResult: QuoteUpdate = {
    type,
    quote: undefined,
    priceDetails: undefined,
    needsApproval: false,
    approvalTarget: undefined,
    swapTransactionSettings: settings,
    quoteRequest,
    sellAsset,
    buyAsset,
    timestamp: Date.now(),
    amount,
  }

  if (updatedQuoteData) {
    if (
      settings.networkSettings.gasLimit !== BigInt(updatedQuoteData.quote.gas)
    ) {
      requestResult.swapTransactionSettings.networkSettings = {
        ...requestResult.swapTransactionSettings.networkSettings,
        gasLimit: BigInt(updatedQuoteData.quote.gas),
        suggestedGasLimit: BigInt(updatedQuoteData.quote.estimatedGas),
      }
    }

    requestResult = {
      ...requestResult,
      priceDetails: updatedQuoteData.priceDetails,
      needsApproval: updatedQuoteData.needsApproval,
      approvalTarget: updatedQuoteData.quote.allowanceTarget,
      quote:
        type === "getSellAmount"
          ? fixedPointNumberToString({
              amount: BigInt(updatedQuoteData.quote.sellAmount),
              decimals: sellAsset.decimals,
            })
          : fixedPointNumberToString({
              amount: BigInt(updatedQuoteData.quote.buyAmount),
              decimals: buyAsset.decimals,
            }),
    }
  }

  return requestResult
}

export type QuoteType = "getSellAmount" | "getBuyAmount"

// FIXME Unify once asset similarity code is unified.
export function isSameAsset(asset1: AnyAsset, asset2: AnyAsset): boolean {
  if (typeof asset1 === "undefined" || typeof asset2 === "undefined") {
    return false
  }

  if (
    isSmartContractFungibleAsset(asset1) &&
    isSmartContractFungibleAsset(asset2)
  ) {
    return (
      normalizeEVMAddress(asset1.contractAddress) ===
      normalizeEVMAddress(asset2.contractAddress)
    )
  }

  if (
    isSmartContractFungibleAsset(asset1) ||
    isSmartContractFungibleAsset(asset2)
  ) {
    return false
  }

  return asset1.symbol === asset2.symbol
}

type RequestQuoteUpdateConfig = {
  type: QuoteType
  amount: string
  sellAsset?: SwappableAsset
  buyAsset?: SwappableAsset
  transactionSettings?: QuoteUpdate["swapTransactionSettings"]
}

export function useSwapQuote(useSwapConfig: {
  savedQuoteRequest?: SwapQuoteRequest
  initialSwapSettings: QuoteUpdate["swapTransactionSettings"]
}): {
  quote: QuoteUpdate | null
  loading: boolean
  loadingSellAmount: boolean
  loadingBuyAmount: boolean
  requestQuoteUpdate: DebouncedFunc<
    (config: RequestQuoteUpdateConfig) => Promise<void>
  >
} {
  const dispatch = useBackgroundDispatch()
  const [initialTransactionSettings] = useState(
    useSwapConfig.initialSwapSettings
  )

  // Quoted amounts
  const [quoteRequestState, setQuoteRequestState] = useSetState<{
    quote: QuoteUpdate | null
    loading: boolean
    loadingType?: QuoteType
  }>({
    quote: null,
    loading: false,
  })

  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const requestContextRef = useValueRef({
    network: selectedNetwork,
    initialTransactionSettings,
  })

  const mountedRef = useIsMounted()

  const requestId = useRef(0)

  const requestQuoteUpdate = useCallback(
    async (config: RequestQuoteUpdateConfig) => {
      if (!mountedRef.current) return

      const { type, amount, sellAsset, buyAsset } = config

      const requestContext = requestContextRef.current
      const transactionSettings =
        config.transactionSettings ?? requestContext.initialTransactionSettings

      // Swap amounts can't update unless both sell and buy assets are specified.
      if (
        !sellAsset ||
        !buyAsset ||
        amount.trim() === "" ||
        Number(amount) === 0
      ) {
        // noop
        return
      }

      setQuoteRequestState({ loading: true, loadingType: type })

      const id = requestId.current + 1

      let result: QuoteUpdate | null = null

      try {
        requestId.current = id

        result = await fetchQuote({
          type,
          amount,
          sellAsset,
          buyAsset,
          getQuoteFn: (quoteRequest) =>
            dispatch(fetchSwapPrice({ quoteRequest })) as unknown as Promise<
              AsyncThunkFulfillmentType<typeof fetchSwapPrice>
            >,
          network: requestContext.network,
          settings: transactionSettings,
        })

        if (!mountedRef.current) return
      } catch (error) {
        logger.error("Error fetching quote!", error)
      } finally {
        const hasPendingRequests = requestId.current !== id

        setQuoteRequestState({
          quote: result,
          // Finish loading once the last quote is fulfilled
          ...(hasPendingRequests
            ? { loading: true }
            : { loading: false, loadingType: undefined }),
        })
      }
    },
    [dispatch, requestContextRef, mountedRef, setQuoteRequestState]
  )

  const [debouncedRequest] = useState(() => {
    const debouncedFn = debounce(
      requestQuoteUpdate,
      UPDATE_SWAP_QUOTE_DEBOUNCE_TIME,
      {
        leading: false,
        trailing: true,
      }
    )

    return debouncedFn
  })

  const loadingSellAmount = quoteRequestState.loadingType === "getSellAmount"
  const loadingBuyAmount = quoteRequestState.loadingType === "getBuyAmount"

  return {
    quote: quoteRequestState.quote,
    loading: quoteRequestState.loading,
    loadingSellAmount,
    loadingBuyAmount,
    requestQuoteUpdate: debouncedRequest,
  }
}
