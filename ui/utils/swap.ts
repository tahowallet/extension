import {
  isSmartContractFungibleAsset,
  SwappableAsset,
} from "@tallyho/tally-background/assets"
import { EIP_1559_COMPLIANT_CHAIN_IDS } from "@tallyho/tally-background/constants"
import { fixedPointNumberToString } from "@tallyho/tally-background/lib/fixed-point"
import logger from "@tallyho/tally-background/lib/logger"
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
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import {
  isSameAsset,
  isTrustedAsset,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import { useValueRef, useIsMounted, useSetState } from "../hooks/react-hooks"

const UPDATE_SWAP_QUOTE_DEBOUNCE_TIME = 300

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

export type QuoteUpdateResult =
  | QuoteUpdate
  | { error: string; previousQuote?: QuoteUpdate }

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; retryInterval: number },
): Promise<T> {
  const attemptFn = async (attempt: number): Promise<T> => {
    try {
      return await fn()
    } catch (error) {
      if (attempt < options.maxRetries) {
        const backoffTime = options.retryInterval * 2 ** (attempt - 1)
        await new Promise<void>((resolve) => {
          setTimeout(resolve, backoffTime)
        })
        return attemptFn(attempt + 1)
      }
      throw error
    }
  }

  return attemptFn(1)
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
    quoteRequest: SwapQuoteRequest,
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
  retryOptions?: {
    maxRetries: number
    retryInterval: number
  }
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
    useSwapConfig.initialSwapSettings,
  )

  const [quoteRequestState, setQuoteRequestState] = useSetState<{
    quote: QuoteUpdate | null
    loading: boolean
    loadingType?: QuoteType
    lastError?: string
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

      const retryOptions = useSwapConfig.retryOptions || {
        maxRetries: 3,
        retryInterval: 1000,
      }

      const { type, amount, sellAsset, buyAsset } = config

      const requestContext = requestContextRef.current
      const transactionSettings =
        config.transactionSettings ?? requestContext.initialTransactionSettings

      if (
        !sellAsset ||
        !buyAsset ||
        amount.trim() === "" ||
        Number(amount) === 0
      ) {
        return
      }

      setQuoteRequestState({ loading: true, loadingType: type })

      const id = requestId.current + 1
      requestId.current = id

      try {
        const result = await withRetry(
          () =>
            fetchQuote({
              type,
              amount,
              sellAsset,
              buyAsset,
              getQuoteFn: (quoteRequest) =>
                dispatch(
                  fetchSwapPrice({ quoteRequest }),
                ) as unknown as Promise<
                  AsyncThunkFulfillmentType<typeof fetchSwapPrice>
                >,
              network: requestContext.network,
              settings: transactionSettings,
            }),
          retryOptions,
        )

        const hasPendingRequests = requestId.current !== id

        setQuoteRequestState({
          quote: result,
          lastError: undefined,
          ...(hasPendingRequests
            ? { loading: true }
            : { loading: false, loadingType: undefined }),
        })
      } catch (error) {
        logger.error("Error fetching quote!", error)

        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch quote"

        if (requestId.current === id) {
          setQuoteRequestState({
            lastError: errorMessage,
            loading: false,
            loadingType: undefined,
          })
        }
      }
    },
    [
      mountedRef,
      useSwapConfig.retryOptions,
      requestContextRef,
      setQuoteRequestState,
      dispatch,
    ],
  )

  const [debouncedRequest] = useState(() =>
    debounce(requestQuoteUpdate, UPDATE_SWAP_QUOTE_DEBOUNCE_TIME, {
      leading: false,
      trailing: true,
    }),
  )

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

export function getOwnedSellAssetAmounts(
  assetAmounts: CompleteAssetAmount[] | undefined,
  currentNetwork: EVMNetwork,
): CompleteAssetAmount<SwappableAsset>[] {
  return (
    assetAmounts?.filter(
      (assetAmount): assetAmount is CompleteAssetAmount<SwappableAsset> =>
        (isSmartContractFungibleAsset(assetAmount.asset) ||
          assetAmount.asset.symbol === currentNetwork.baseAsset.symbol) &&
        assetAmount.decimalAmount > 0 &&
        isTrustedAsset(assetAmount.asset),
    ) ?? []
  )
}

export function getSellAssetAmounts(
  ownedSellAssetAmounts: CompleteAssetAmount<SwappableAsset>[],
  sellAsset?: SwappableAsset,
  buyAsset?: SwappableAsset,
): CompleteAssetAmount<SwappableAsset>[] {
  return (
    ownedSellAssetAmounts.some(
      ({ asset }) =>
        typeof sellAsset !== "undefined" && isSameAsset(asset, sellAsset),
    )
      ? ownedSellAssetAmounts
      : ownedSellAssetAmounts.concat(
          typeof sellAsset === "undefined"
            ? []
            : [
                {
                  asset: sellAsset,
                  amount: 0n,
                  decimalAmount: 0,
                  localizedDecimalAmount: "0",
                },
              ],
        )
  ).filter(
    (sellAssetAmount) => sellAssetAmount.asset.symbol !== buyAsset?.symbol,
  )
}
