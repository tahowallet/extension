import { JSONSchemaType, ValidateFunction } from "ajv"
import { coingeckoPriceSchema } from "./prices"
import { SwapPriceResponse, SwapQuoteResponse } from "../0x-swap-types"

export const isValidCoinGeckoPriceResponse: ValidateFunction<
  JSONSchemaType<typeof coingeckoPriceSchema>
>

export const isValidUniswapTokenListResponse: (arg: unknown) => boolean

export const isValid0xSwapPriceResponse: ValidateFunction<SwapPriceResponse>
export const isValid0xSwapQuoteResponse: ValidateFunction<SwapQuoteResponse>
