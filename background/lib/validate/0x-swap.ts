// Derived from docs at https://0x.org/docs/api, alongside
// occasional direct reading of the API code at
// https://github.com/0x-project/0x-api .

// Swap prices come from the 0x /price endpoint, and provide
// information on available RFQ-T prices. Subset of the quote
// fields.
export const swapPriceJTD = {
  properties: {
    chainId: { type: "uint32" },
    price: { type: "string" },
    value: { type: "string" },
    gasPrice: { type: "string" },
    gas: { type: "string" },
    estimatedGas: { type: "string" },
    protocolFee: { type: "string" },
    minimumProtocolFee: { type: "string" },
    buyTokenAddress: { type: "string" },
    buyAmount: { type: "string" },
    sellTokenAddress: { type: "string" },
    sellAmount: { type: "string" },
    sources: {
      elements: {
        properties: {
          name: { type: "string" },
          proportion: { type: "string" },
        },
        additionalProperties: true,
      },
    },
    allowanceTarget: { type: "string" },
    sellTokenToEthRate: { type: "string" },
    buyTokenToEthRate: { type: "string" },
  },
  // Don't fail if new properties are introduced.
  additionalProperties: true,
} as const

// Swap quotes are a superset of swap prices that include data
// for generating a swap transaction. They are served by the
// 0x /quote endpoint.
export const swapQuoteJTD = {
  properties: {
    ...swapPriceJTD.properties,
    data: { type: "string" },
    guaranteedPrice: { type: "string" },
    to: { type: "string" },
    value: { type: "string" },
  },
  optionalProperties: {
    from: { type: "string" },
  },
  // Don't fail if new properties are introduced.
  additionalProperties: true,
} as const
