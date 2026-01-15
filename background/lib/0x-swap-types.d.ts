export type GetPriceParams = {
  /**
   * @description Chain ID. See [here](https://0x.org/docs/developer-resources/supported-chains) for the list of supported chains
   * @example 1
   */
  chainId: number
  /**
   * @description The contract address of the token to buy
   * @example 0xdac17f958d2ee523a2206206994597c13d831ec7
   */
  buyToken: string
  /**
   * @description The contract address of the token to sell
   * @example 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
   */
  sellToken: string
  /**
   * @description The amount of `sellToken` in `sellToken` base units to sell
   * @example 100000000
   */
  sellAmount: string
  /**
   * @description The address which holds the `sellToken` balance and has the allowance set for the swap
   * @example 0x70a9f34f9b34c64957b9c401a97bfed35b95049e
   */
  taker?: string
  /** @description The address of the external account that started the transaction. This is only needed if `taker` is a smart contract. */
  txOrigin?: string
  /** @description The address to receive the `buyToken`. If not provided, defaults to the taker address. Not supported for wrap/unwrap operations. */
  recipient?: string
  /** @description The wallet address to receive the specified trading fees (supports single or multiple comma-separated values). You must also specify the `swapFeeBps` in the request to use this feature. When multiple values are provided, must match length of `swapFeeBps`. */
  swapFeeRecipient?: string
  /** @description The amount in Bps of the `swapFeeToken` to charge and deliver to the `swapFeeRecipient` (supports single or multiple comma-separated values). You must also specify the `swapFeeRecipient` in the request to use this feature. For security, this field has a default limit of 1000 Bps. If your application requires a higher value, please reach out to us. */
  swapFeeBps?: string
  /** @description The contract address of the token to receive trading fees in (supports single or multiple comma-separated values). Each token must be set to the value of either the `buyToken` or the `sellToken`. If omitted, the fee token will be determined by 0x with preference to stablecoins and highly liquid assets. You must also specify the `swapFeeRecipient` and `swapFeeBps` to charge integrator fees. When multiple values are provided, must match length of `swapFeeBps`. */
  swapFeeToken?: string
  /** @description The address to receive any trade surplus. If specified, this address will receive trade surplus when applicable. Otherwise, the taker will receive the surplus. This feature is only available to selected integrators on a custom pricing plan. In other cases, the surplus will be collected by 0x. For assistance with a custom plan, please contact support. */
  tradeSurplusRecipient?: string
  /** @description The maximum trade surplus (positive slippage) that can be collected in Bps of the buy amount. If not provided, defaults to 10000 (100%). Must be used together with `tradeSurplusRecipient`. */
  tradeSurplusMaxBps?: number
  /** @description The target gas price (in wei) for the swap transaction. If not provided, the default value is based on the 0x gas price oracle */
  gasPrice?: string
  /** @description The maximum acceptable slippage of the `buyToken` in Bps. If this parameter is set to 0, no slippage will be tolerated. If not provided, the default slippage tolerance is 100Bps */
  slippageBps?: number
  /** @description Liquidity sources e.g. Uniswap_V3, SushiSwap, 0x_RFQ to exclude from the provided quote. See https://api.0x.org/sources?chainId=<chain_id> with the desired chain's ID for a full list of sources. Separate multiple sources with a comma */
  excludedSources?: string
  /** @description If set to `true`, the taker's entire `sellToken` balance will be sold during trade execution. The `sellAmount` should be the maximum estimated value, as close as possible to the actual taker's balance to ensure the best routing. Selling more than the `sellAmount` may cause the trade to revert. This feature is designed for cases where the precise sell amount is determined during execution. Learn more [here](https://0x.org/docs/0x-swap-api/advanced-topics/sell-entire-balance). */
  sellEntireBalance?: "true" | "false"
  /** @description Enable Plasma-based routing (experimental). Defaults to false */
  enablePlasma?: "true" | "false"
}

export type GetQuoteParams = {
  /**
   * @description Chain ID. See [here](https://0x.org/docs/developer-resources/supported-chains) for the list of supported chains
   * @example 1
   */
  chainId: number
  /**
   * @description The contract address of the token to buy
   * @example 0xdac17f958d2ee523a2206206994597c13d831ec7
   */
  buyToken: string
  /**
   * @description The contract address of the token to sell
   * @example 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
   */
  sellToken: string
  /**
   * @description The amount of `sellToken` in `sellToken` base units to sell
   * @example 100000000
   */
  sellAmount: string
  /**
   * @description The address which holds the `sellToken` balance and has the allowance set for the swap
   * @example 0x70a9f34f9b34c64957b9c401a97bfed35b95049e
   */
  taker: string
  /** @description The address of the external account that started the transaction. This is only needed if `taker` is a smart contract. */
  txOrigin?: string
  /** @description The address to receive the `buyToken`. If not provided, defaults to the taker address. Not supported for wrap/unwrap operations. */
  recipient?: string
  /** @description The wallet address to receive the specified trading fees (supports single or multiple comma-separated values). You must also specify the `swapFeeBps` in the request to use this feature. When multiple values are provided, must match length of `swapFeeBps`. */
  swapFeeRecipient?: string
  /** @description The amount in Bps of the `swapFeeToken` to charge and deliver to the `swapFeeRecipient` (supports single or multiple comma-separated values). You must also specify the `swapFeeRecipient` in the request to use this feature. For security, this field has a default limit of 1000 Bps. If your application requires a higher value, please reach out to us. */
  swapFeeBps?: string
  /** @description The contract address of the token to receive trading fees in (supports single or multiple comma-separated values). Each token must be set to the value of either the `buyToken` or the `sellToken`. If omitted, the fee token will be determined by 0x with preference to stablecoins and highly liquid assets. You must also specify the `swapFeeRecipient` and `swapFeeBps` to charge integrator fees. When multiple values are provided, must match length of `swapFeeBps`. */
  swapFeeToken?: string
  /** @description The address to receive any trade surplus. If specified, this address will receive trade surplus when applicable. Otherwise, the taker will receive the surplus. This feature is only available to selected integrators on a custom pricing plan. In other cases, the surplus will be collected by 0x. For assistance with a custom plan, please contact support. */
  tradeSurplusRecipient?: string
  /** @description The maximum trade surplus (positive slippage) that can be collected in Bps of the buy amount. If not provided, defaults to 10000 (100%). Must be used together with `tradeSurplusRecipient`. */
  tradeSurplusMaxBps?: number
  /** @description The target gas price (in wei) for the swap transaction. If not provided, the default value is based on the 0x gas price oracle */
  gasPrice?: string
  /** @description The maximum acceptable slippage of the `buyToken` in Bps. If this parameter is set to 0, no slippage will be tolerated. If not provided, the default slippage tolerance is 100Bps */
  slippageBps?: number
  /** @description Liquidity sources e.g. Uniswap_V3, SushiSwap, 0x_RFQ to exclude from the provided quote. See https://api.0x.org/sources?chainId=<chain_id> with the desired chain's ID for a full list of sources. Separate multiple sources with a comma */
  excludedSources?: string
  /** @description If set to `true`, the taker's entire `sellToken` balance will be sold during trade execution. The `sellAmount` should be the maximum estimated value, as close as possible to the actual taker's balance to ensure the best routing. Selling more than the `sellAmount` may cause the trade to revert. This feature is designed for cases where the precise sell amount is determined during execution. Learn more [here](https://0x.org/docs/0x-swap-api/advanced-topics/sell-entire-balance). */
  sellEntireBalance?: "true" | "false"
  /** @description Enable Plasma-based routing (experimental). Defaults to false */
  enablePlasma?: "true" | "false"
}

export type SwapPriceResponse =
  | {
      /** @description The target contract address for which the `taker` needs to have an allowance in order to be able to complete the swap. For swaps with the native asset (ie "ETH" or "BNB") as the `sellToken`, wrapping the native asset (i.e. "ETH" to "WETH") or unwrapping, no allowance is needed */
      allowanceTarget: string | null
      /** @description The block number at which the liquidity sources were sampled to generate the quote. This indicates the freshness of the quote */
      blockNumber: unknown & string
      /** @description The amount of `buyToken` (in `buyToken` units) that will be bought in the swap */
      buyAmount: unknown & string
      /** @description The contract address of the token to buy in the swap */
      buyToken: string
      /** @description Fees to be deducted in this transaction. It contains the `integratorFee`, `zeroExFee` and `gasFee` */
      fees: {
        /** @description The specified fee to charge and deliver to the `swapFeeRecipient`. */
        integratorFee: {
          /** @description The amount of token charged as the integrator fee */
          amount: unknown & string
          /** @description The address of the token charged as the integrator fee */
          token: string
          /** @enum {string} */
          type: "volume"
        } | null
        /** @description The specified fees to charge and deliver to the `swapFeesRecipient`. */
        integratorFees:
          | {
              /** @description The amount of token charged as the integrator fee */
              amount: unknown & string
              /** @description The address of the token charged as the integrator fee */
              token: string
              /** @enum {string} */
              type: "volume"
            }[]
          | null
        /** @description The fee charged by 0x for the trade. */
        zeroExFee: {
          /** @description The amount of token charged as the 0x fee */
          amount: unknown & string
          /** @description The address of the token charged as the 0x fee */
          token: string
          /** @enum {string} */
          type: "volume"
        } | null
        /** @description The gas fee to be used in submitting the transaction. */
        gasFee: {
          /** @description The amount of token charged as the gas fee */
          amount: unknown & string
          /** @description The address of the token charged as the gas fee */
          token: string
          /** @enum {string} */
          type: "gas"
        } | null
      }
      /** @description The estimated gas limit that should be used to send the transaction to guarantee settlement */
      gas: (unknown & string) | null
      /** @description The gas price (in wei) that should be used to send the transaction. The transaction needs to be sent with this `gasPrice` for the transaction to be successful */
      gasPrice: unknown & string
      /** @description An object containing potential issues discovered during 0x validation that can prevent the swap from being executed successfully by the `taker` */
      issues: {
        /** @description Details of allowances that the `taker` must set for in order to execute the swap successfully. Null if no allowance is required */
        allowance: {
          /** @description The `taker`'s current allowance of the `spender` */
          actual: unknown & string
          /** @description The address to set the allowance on */
          spender: string
        } | null
        /** @description Details of balance of the `sellToken` that the `taker` must hold. Null if the `taker` has sufficient balance */
        balance: {
          /** @description The contract address of the `sellToken` */
          token: string
          /** @description The current balance of the `sellToken` in the `taker` address */
          actual: unknown & string
          /** @description The balance of the `sellToken` required for the swap to execute successfully */
          expected: unknown & string
        } | null
        /** @description This is set to `true` when 0x cannot validate the transaction. This happens when the `taker` has an insufficient balance of the `sellToken` and 0x is unable to peform ehanced quote validation with the low balance. Note that this does not necessarily mean that the trade will revert */
        simulationIncomplete: boolean
        /** @description A list of invalid sources present in `excludedSources` request. See https://api.0x.org/sources?chainId= with the desired chain's ID for the list of valid sources */
        invalidSourcesPassed: string[]
      }
      /**
       * @description This validates the availability of liquidity for the quote requested. The rest of the fields will only be returned if `true`
       * @enum {boolean}
       */
      liquidityAvailable: true
      /** @description The price which must be met or else the entire transaction will revert. This price is influenced by the `slippageBps` parameter. On-chain sources may encounter price movements from quote to settlement */
      minBuyAmount: unknown & string
      /** @description The path of liquidity sources to be used in executing this swap */
      route: {
        /** @description Details of each segment that 0x routes the swap through */
        fills: {
          /** @description The contract address of the input token */
          from: string
          /** @description The contract address of the output token */
          to: string
          /** @description The liquidity source used in the route */
          source: string
          /** @description The proportion of the trade to be filled by the `source` */
          proportionBps: unknown & string
        }[]
        /** @description Properties of the tokens involved in the swap */
        tokens: {
          /** @description The token address. This is the unique identifier of the token */
          address: string
          /** @description The token symbol. This is not guaranteed to be unique, as multiple tokens can have the same symbol */
          symbol: string
        }[]
      }
      /** @description The amount of `sellToken` (in `sellToken` units) that will be sold in this swap */
      sellAmount: unknown & string
      /** @description The contract address of the token to sell in the swap */
      sellToken: string
      /** @description Swap-related metadata for the buy and sell token in the swap */
      tokenMetadata: {
        /** @description Swap-related metadata for the buy token */
        buyToken: {
          /** @description The buy tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          buyTaxBps: (unknown & string) | null
          /** @description The sell tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          sellTaxBps: (unknown & string) | null
          /** @description The transfer tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          transferTaxBps: (unknown & string) | null
        }
        /** @description Swap-related metadata for the sell token */
        sellToken: {
          /** @description The buy tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          buyTaxBps: (unknown & string) | null
          /** @description The sell tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          sellTaxBps: (unknown & string) | null
          /** @description The transfer tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          transferTaxBps: (unknown & string) | null
        }
      }
      /** @description The estimated total network cost of the swap. On chains where there is no L1 data cost, it is calculated as `gas` * `gasPrice`. On chains where there is an L1 data cost, it is calculated as `gas` * `gasPrice` + L1 data cost. */
      totalNetworkFee: (unknown & string) | null
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  | {
      /**
       * @description This validates the availability of liquidity for the quote requested. No other fields will be returned if it is `false`
       * @enum {boolean}
       */
      liquidityAvailable: false
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }

export type SwapQuoteResponse =
  | {
      /** @description The target contract address for which the `taker` needs to have an allowance in order to be able to complete the swap. For swaps with the native asset (ie "ETH" or "BNB") as the `sellToken`, wrapping the native asset (i.e. "ETH" to "WETH") or unwrapping, no allowance is needed */
      allowanceTarget: string | null
      /** @description The block number at which the liquidity sources were sampled to generate the quote. This indicates the freshness of the quote */
      blockNumber: unknown & string
      /** @description The amount of `buyToken` (in `buyToken` units) that will be bought in the swap */
      buyAmount: unknown & string
      /** @description The contract address of the token to buy in the swap */
      buyToken: string
      fees: {
        /** @description The specified fee to charge and deliver to the `swapFeeRecipient`. */
        integratorFee: {
          /** @description The amount of token charged as the integrator fee */
          amount: unknown & string
          /** @description The address of the token charged as the integrator fee */
          token: string
          /** @enum {string} */
          type: "volume"
        } | null
        /** @description The specified fees to charge and deliver to the `swapFeesRecipient`. */
        integratorFees:
          | {
              /** @description The amount of token charged as the integrator fee */
              amount: unknown & string
              /** @description The address of the token charged as the integrator fee */
              token: string
              /** @enum {string} */
              type: "volume"
            }[]
          | null
        /** @description The fee charged by 0x for the trade. */
        zeroExFee: {
          /** @description The amount of token charged as the 0x fee */
          amount: unknown & string
          /** @description The address of the token charged as the 0x fee */
          token: string
          /** @enum {string} */
          type: "volume"
        } | null
        /** @description The gas fee to be used in submitting the transaction. */
        gasFee: {
          /** @description The amount of token charged as the gas fee */
          amount: unknown & string
          /** @description The address of the token charged as the gas fee */
          token: string
          /** @enum {string} */
          type: "gas"
        } | null
      }
      /** @description An object containing potential issues discovered during 0x validation that can prevent the swap from being executed successfully by the `taker` */
      issues: {
        /** @description Details of allowances that the `taker` must set for in order to execute the swap successfully. Null if no allowance is required */
        allowance: {
          /** @description The `taker`'s current allowance of the `spender` */
          actual: unknown & string
          /** @description The address to set the allowance on */
          spender: string
        } | null
        /** @description Details of balance of the `sellToken` that the `taker` must hold. Null if the `taker` has sufficient balance */
        balance: {
          /** @description The contract address of the `sellToken` */
          token: string
          /** @description The current balance of the `sellToken` in the `taker` address */
          actual: unknown & string
          /** @description The balance of the `sellToken` required for the swap to execute successfully */
          expected: unknown & string
        } | null
        /** @description This is set to `true` when 0x cannot validate the transaction. This happens when the `taker` has an insufficient balance of the `sellToken` and 0x is unable to peform ehanced quote validation with the low balance. Note that this does not necessarily mean that the trade will revert */
        simulationIncomplete: boolean
        /** @description A list of invalid sources present in `excludedSources` request. See https://api.0x.org/sources?chainId= with the desired chain's ID for the list of valid sources */
        invalidSourcesPassed: string[]
      }
      /**
       * @description This validates the availability of liquidity for the quote requested. The rest of the fields will only be returned if `true`
       * @enum {boolean}
       */
      liquidityAvailable: true
      /** @description The price which must be met or else the transaction will revert. This price is influenced by the `slippageBps` parameter. On-chain sources may encounter price movements from quote to settlement */
      minBuyAmount: unknown & string
      /** @description The path of liquidity sources to be used in executing this swap */
      route: {
        /** @description Details of each segment that 0x routes the swap through */
        fills: {
          /** @description The contract address of the input token */
          from: string
          /** @description The contract address of the output token */
          to: string
          /** @description The liquidity source used in the route */
          source: string
          /** @description The proportion of the trade to be filled by the `source` */
          proportionBps: unknown & string
        }[]
        /** @description Properties of the tokens involved in the swap */
        tokens: {
          /** @description The token address. This is the unique identifier of the token */
          address: string
          /** @description The token symbol. This is not guaranteed to be unique, as multiple tokens can have the same symbol */
          symbol: string
        }[]
      }
      /** @description The amount of `sellToken` (in `sellToken` units) that will be sold in this swap */
      sellAmount: unknown & string
      /** @description The contract address of the token to sell in the swap */
      sellToken: string
      /** @description Swap-related metadata for the buy and sell token in the swap */
      tokenMetadata: {
        /** @description Swap-related metadata for the buy token */
        buyToken: {
          /** @description The buy tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          buyTaxBps: (unknown & string) | null
          /** @description The sell tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          sellTaxBps: (unknown & string) | null
          /** @description The transfer tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          transferTaxBps: (unknown & string) | null
        }
        /** @description Swap-related metadata for the sell token */
        sellToken: {
          /** @description The buy tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          buyTaxBps: (unknown & string) | null
          /** @description The sell tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          sellTaxBps: (unknown & string) | null
          /** @description The transfer tax in bps of the token. Since each token could have arbitrary implementation, this field is best effort, meaning it would be set to `null` if the system is not able to determine the tax */
          transferTaxBps: (unknown & string) | null
        }
      }
      /** @description The estimated total network cost of the swap. On chains where there is no L1 data cost, it is calculated as `gas` * `gasPrice`. On chains where there is an L1 data cost, it is calculated as `gas` * `gasPrice` + L1 data cost. */
      totalNetworkFee: (unknown & string) | null
      /** @description This object contains the details required to submit the transaction */
      transaction: {
        /** @description The address of the target contract to send call `data` to. Do NOT use this field when setting token allowances — doing so can result in lost funds. Always use `issues.allowance.spender` or `allowanceTarget` for setting allowances. */
        to: string
        /** @description The calldata containing transaction execution details to be sent to the `to` address */
        data: string
        /** @description The estimated gas limit that should be used to send the transaction to guarantee settlement */
        gas: (unknown & string) | null
        /** @description The gas price (in wei) that should be used to send the transaction */
        gasPrice: unknown & string
        /** @description The amount of ether (in wei) that should be sent with the transaction */
        value: unknown & string
      }
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  | {
      /**
       * @description This validates the availability of liquidity for the quote requested. No other fields will be returned if it is `false`
       * @enum {boolean}
       */
      liquidityAvailable: false
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }

interface Errors {
  BUY_TOKEN_NOT_AUTHORIZED_FOR_TRADE: {
    /** @enum {string} */
    name: "BUY_TOKEN_NOT_AUTHORIZED_FOR_TRADE"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  INPUT_INVALID: {
    /** @enum {string} */
    name: "INPUT_INVALID"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The list of invalid inputs */
      details: {
        /** @description The input field name */
        field: string
        /** @description The validation failure reason */
        reason: string
      }[]
    }
  }
  INSUFFICIENT_BALANCE: {
    /** @enum {string} */
    name: "INSUFFICIENT_BALANCE"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The taker of the transaction */
      taker: string
      /** @description The sell token */
      sellToken: string
      /** @description The sell amount */
      sellAmount: unknown & string
      /** @description The current balance of the taker for the sell token */
      balance: unknown & string
    }
  }
  INSUFFICIENT_BALANCE_OR_ALLOWANCE: {
    /** @enum {string} */
    name: "INSUFFICIENT_BALANCE_OR_ALLOWANCE"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The hash of the meta-transaction provided by the caller */
      metaTransactionHash: string
      /** @description The intended signer of the meta-transaction */
      taker: string
      /** @description The sell token */
      sellToken: string
      /** @description The sell amount */
      sellAmount: unknown & string
      /** @description The smaller value of the balance or the allowance of the taker */
      minBalanceOrAllowance: unknown & string
    }
  }
  INTERNAL_SERVER_ERROR: {
    /** @enum {string} */
    name: "INTERNAL_SERVER_ERROR"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  INVALID_SIGNATURE: {
    /** @enum {string} */
    name: "INVALID_SIGNATURE"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The hash of the meta-transaction provided by the caller */
      metaTransactionHash: string
      /** @description The intended signer of the meta-transaction */
      taker: string
    }
  }
  INVALID_SIGNER: {
    /** @enum {string} */
    name: "INVALID_SIGNER"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The hash of the meta-transaction provided by the caller */
      metaTransactionHash: string
      /** @description The intended signer of the meta-transaction */
      taker: string
      /** @description The signer of the meta-transaction */
      signer: string
    }
  }
  META_TRANSACTION_EXPIRY_TOO_SOON: {
    /** @enum {string} */
    name: "META_TRANSACTION_EXPIRY_TOO_SOON"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The hash of the meta-transaction provided by the caller */
      metaTransactionHash: string
      /** @description The expiry of the meta-transaction provided by the caller in ms */
      expiry: unknown & string
    }
  }
  META_TRANSACTION_INVALID: {
    /** @enum {string} */
    name: "META_TRANSACTION_INVALID"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The hash of the meta-transaction provided by the caller */
      metaTransactionHash: string
    }
  }
  META_TRANSACTION_STATUS_NOT_FOUND: {
    /** @enum {string} */
    name: "META_TRANSACTION_STATUS_NOT_FOUND"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  PENDING_TRADES_ALREADY_EXIST: {
    /** @enum {string} */
    name: "PENDING_TRADES_ALREADY_EXIST"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The hash of the meta-transaction provided by the caller */
      metaTransactionHash: string
      /** @description The list of pending meta-transaction hashes for the same taker and sell token */
      pendingMetaTransactionHashes: string[]
    }
  }
  SELL_AMOUNT_TOO_SMALL: {
    /** @enum {string} */
    name: "SELL_AMOUNT_TOO_SMALL"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The minimum sell amount required for the trade to go through */
      minSellAmount: unknown & string
    }
  }
  RECIPIENT_NOT_SUPPORTED: {
    /** @enum {string} */
    name: "RECIPIENT_NOT_SUPPORTED"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  SELL_TOKEN_NOT_AUTHORIZED_FOR_TRADE: {
    /** @enum {string} */
    name: "SELL_TOKEN_NOT_AUTHORIZED_FOR_TRADE"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  SWAP_VALIDATION_FAILED: {
    /** @enum {string} */
    name: "SWAP_VALIDATION_FAILED"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  TAKER_NOT_AUTHORIZED_FOR_TRADE: {
    /** @enum {string} */
    name: "TAKER_NOT_AUTHORIZED_FOR_TRADE"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  TOKEN_NOT_SUPPORTED: {
    /** @enum {string} */
    name: "TOKEN_NOT_SUPPORTED"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  USER_NOT_AUTHORIZED: {
    /** @enum {string} */
    name: "USER_NOT_AUTHORIZED"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  TOKEN_PAIR_NOT_SUPPORTED: {
    /** @enum {string} */
    name: "TOKEN_PAIR_NOT_SUPPORTED"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  TRADE_ALREADY_SUBMITTED: {
    /** @enum {string} */
    name: "TRADE_ALREADY_SUBMITTED"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
      /** @description The hash of the trade that was already submitted */
      tradeHash: string
    }
  }
  UNABLE_TO_CALCULATE_GAS_FEE: {
    /** @enum {string} */
    name: "UNABLE_TO_CALCULATE_GAS_FEE"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
  UNCATEGORIZED: {
    /** @enum {string} */
    name: "UNCATEGORIZED"
    message: string
    data: {
      /** @description The unique ZeroEx identifier of the request */
      zid: string
    }
  }
}

interface GetPriceErrors {
  400:
    | Errors["INPUT_INVALID"]
    | Errors["RECIPIENT_NOT_SUPPORTED"]
    | Errors["SWAP_VALIDATION_FAILED"]
    | Errors["TOKEN_NOT_SUPPORTED"]
    | Errors["USER_NOT_AUTHORIZED"]
  403: Errors["TAKER_NOT_AUTHORIZED_FOR_TRADE"]
  422:
    | Errors["BUY_TOKEN_NOT_AUTHORIZED_FOR_TRADE"]
    | Errors["SELL_TOKEN_NOT_AUTHORIZED_FOR_TRADE"]
  500: Errors["INTERNAL_SERVER_ERROR"] | Errors["UNCATEGORIZED"]
}

export type GetPriceResponseErrors = GetPriceErrors[keyof GetPriceErrors]

interface GetQuoteErrors {
  400:
    | Errors["INPUT_INVALID"]
    | Errors["RECIPIENT_NOT_SUPPORTED"]
    | Errors["SWAP_VALIDATION_FAILED"]
    | Errors["TOKEN_NOT_SUPPORTED"]
    | Errors["USER_NOT_AUTHORIZED"]
  403: Errors["TAKER_NOT_AUTHORIZED_FOR_TRADE"]

  422:
    | Errors["BUY_TOKEN_NOT_AUTHORIZED_FOR_TRADE"]
    | Errors["SELL_TOKEN_NOT_AUTHORIZED_FOR_TRADE"]
  500: Errors["INTERNAL_SERVER_ERROR"] | Errors["UNCATEGORIZED"]
}

export type GetQuoteResponseErrors = GetQuoteErrors[keyof GetQuoteErrors]
