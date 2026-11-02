import type { operations } from "./validate/0x/openapi"

type GetPrice = operations["swap::allowanceHolder::getPrice"]
type GetQuote = operations["swap::allowanceHolder::getQuote"]

export type GetPriceParams = GetPrice["parameters"]["query"]
export type GetQuoteParams = GetQuote["parameters"]["query"]

export type SwapPriceResponse =
  GetPrice["responses"][200]["content"]["application/json"]
export type SwapQuoteResponse =
  GetQuote["responses"][200]["content"]["application/json"]

export type LiquidSwapPrice = Extract<
  SwapPriceResponse,
  { liquidityAvailable: true }
>
export type LiquidSwapQuote = Extract<
  SwapQuoteResponse,
  { liquidityAvailable: true }
>

export type SwapRouteFill = Extract<
  LiquidSwapPrice,
  { mode: "exact-in" }
>["route"]["fills"][number]
