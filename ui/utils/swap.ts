import {
  AnyAsset,
  isSmartContractFungibleAsset,
  SwappableAsset,
} from "@tallyho/tally-background/assets"
import { EIP_1559_COMPLIANT_CHAIN_IDS } from "@tallyho/tally-background/constants"
import { fixedPointNumberToString } from "@tallyho/tally-background/lib/fixed-point"
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
import { useValueRef, useIsMounted } from "../hooks/react-hooks"

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
  sourceAsset: SwappableAsset
  targetAsset: SwappableAsset
  quoteRequest: SwapQuoteRequest
  timestamp: number
}

export const fetchQuote = async ({
  type,
  amount,
  sourceAsset,
  targetAsset,
  settings,
  network,
  getQuoteFn,
}: {
  type: "getSourceAmount" | "getTargetAmount"
  amount: string
  sourceAsset: SwappableAsset
  targetAsset: SwappableAsset
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
      sellAsset: sourceAsset,
      buyAsset: targetAsset,
    },
    amount:
      type === "getSourceAmount"
        ? { buyAmount: amount }
        : { sellAmount: amount },
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
    sourceAsset,
    targetAsset,
    timestamp: Date.now(),
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
        type === "getSourceAmount"
          ? fixedPointNumberToString({
              amount: BigInt(updatedQuoteData.quote.sellAmount),
              decimals: sourceAsset.decimals,
            })
          : fixedPointNumberToString({
              amount: BigInt(updatedQuoteData.quote.buyAmount),
              decimals: targetAsset.decimals,
            }),
    }
  }

  return requestResult
}

export type QuoteType = "getSourceAmount" | "getTargetAmount"

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
  type: "getSourceAmount" | "getTargetAmount"
  amount: string
  sourceAsset?: SwappableAsset
  targetAsset?: SwappableAsset
  transactionSettings?: QuoteUpdate["swapTransactionSettings"]
}

export function useSwapQuote(useSwapConfig: {
  savedQuoteRequest?: SwapQuoteRequest
  initialSwapSettings: QuoteUpdate["swapTransactionSettings"]
}): {
  quote: QuoteUpdate | null
  loading: boolean
  loadingSourceAmount: boolean
  loadingTargetAmount: boolean
  requestQuoteUpdate: DebouncedFunc<
    (config: RequestQuoteUpdateConfig) => Promise<void>
  >
} {
  const dispatch = useBackgroundDispatch()
  const [initialTransactionSettings] = useState(
    useSwapConfig.initialSwapSettings
  )

  // Quoted amounts
  const [quoteRequestState, setQuoteRequestState] =
    useState<QuoteUpdate | null>(null)

  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const requestContextRef = useValueRef({
    network: selectedNetwork,
    initialTransactionSettings,
  })

  const mountedRef = useIsMounted()

  const requestId = useRef(0)
  const [loading, setLoading] = useState<QuoteType | boolean>()

  const requestQuoteUpdate = useCallback(
    async (config: RequestQuoteUpdateConfig) => {
      if (!mountedRef.current) return

      const { type, amount, sourceAsset, targetAsset } = config

      const requestContext = requestContextRef.current
      const transactionSettings =
        config.transactionSettings ?? requestContext.initialTransactionSettings

      // Swap amounts can't update unless both sell and buy assets are specified.
      if (
        !sourceAsset ||
        !targetAsset ||
        amount.trim() === "" ||
        Number(amount) === 0
      ) {
        // noop
        return
      }

      setLoading(type)

      const id = requestId.current + 1

      try {
        requestId.current = id

        const result = await fetchQuote({
          type,
          amount,
          sourceAsset,
          targetAsset,
          getQuoteFn: (quoteRequest) =>
            dispatch(fetchSwapPrice({ quoteRequest })) as unknown as Promise<
              AsyncThunkFulfillmentType<typeof fetchSwapPrice>
            >,
          network: requestContext.network,
          settings: transactionSettings,
        })

        if (!mountedRef.current) return

        setQuoteRequestState(result)
      } finally {
        // Finish loading once the last quote is fulfilled
        if (requestId.current === id) {
          setLoading(false)
        }
      }
    },
    [dispatch, requestContextRef, mountedRef]
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

  const loadingSourceAmount = loading === "getSourceAmount"
  const loadingTargetAmount = loading === "getTargetAmount"

  return {
    quote: quoteRequestState,
    loading: !!loading,
    loadingSourceAmount,
    loadingTargetAmount,
    requestQuoteUpdate: debouncedRequest,
  }
}
