import { JSONSchemaType, ValidateFunction } from "ajv"
import { coingeckoPriceSchema } from "./prices"

export const isValidCoinGeckoPriceResponse: ValidateFunction<
  JSONSchemaType<typeof coingeckoPriceSchema>
>

export const isValidUniswapTokenListResponse: (arg: unknown) => boolean
