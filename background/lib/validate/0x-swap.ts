import { JTDDataType, ValidateFunction } from "ajv/dist/jtd"

/* eslint-disable @typescript-eslint/no-var-requires, global-require */
export const isValidSwapAssetsResponse: ValidateFunction<
  JTDDataType<typeof swapAssetsJTD>
> = require("./jtd-validators")["swap-assets.jtd.schema.json"]

export const isValidSwapPriceResponse: ValidateFunction<
  JTDDataType<typeof swapPriceJTD>
> = require("./jtd-validators")["swap-price.jtd.schema.json"]

export const isValidSwapQuoteResponse: ValidateFunction<
  JTDDataType<typeof swapQuoteJTD>
> = require("./jtd-validators")["swap-quote.jtd.schema.json"]
/* eslint-enable @typescript-eslint/no-var-requires, global-require */

const swapAssetsJTD = {
  properties: {
    records: {
      elements: {
        properties: {
          address: { type: "string" },
          decimals: { type: "int8" },
          name: { type: "string" },
          symbol: { type: "string" },
        },
      },
    },
  },
}

const swapPriceJTD = {
  properties: {
    records: {
      elements: {
        properties: {
          price: { type: "string" },
          symbol: { type: "string" },
        },
      },
    },
    page: { type: "uint32" },
    perPage: { type: "uint32" },
    total: { type: "uint32" },
  },
}

const swapQuoteJTD = {
  properties: {
    allowanceTarget: { type: "string" },
    buyAmount: { type: "string" },
    buyTokenAddress: { type: "string" },
    buyTokenToEthRate: { type: "string" },
    chainId: { type: "uint32" },
    data: { type: "string" },
    estimatedGas: { type: "string" },
    gas: { type: "string" },
    gasPrice: { type: "string" },
    guaranteedPrice: { type: "string" },
    minimumProtocolFee: { type: "string" },
    orders: {
      elements: {
        properties: {
          makerAmount: { type: "string" },
          makerToken: { type: "string" },
          source: { type: "string" },
          sourcePathId: { type: "string" },
          takerAmount: { type: "string" },
          takerToken: { type: "string" },
          type: { type: "uint32" },
        },
      },
    },
    price: { type: "string" },
    protocolFee: { type: "string" },
    sellAmount: { type: "string" },
    sellTokenAddress: { type: "string" },
    sellTokenToEthRate: { type: "string" },
    sources: {
      elements: {
        properties: {
          name: { type: "string" },
          proportion: { type: "string" },
        },
      },
    },
    to: { type: "string" },
    value: { type: "string" },
  },
}
