// JSON Type Definition for the Alchemy assetTransfers API.
// https://docs.alchemy.com/alchemy/documentation/enhanced-apis/transfers-api
const alchemyAssetTransferJTD = {
  properties: {
    asset: { type: "string", nullable: true },
    hash: { type: "string" },
    blockNum: { type: "string" },
    category: { enum: ["token", "internal", "external"] },
    from: { type: "string", nullable: true },
    to: { type: "string", nullable: true },
    erc721TokenId: { type: "string", nullable: true },
  },
  optionalProperties: {
    rawContract: {
      properties: {
        address: { type: "string", nullable: true },
        decimal: { type: "string", nullable: true },
        value: { type: "string", nullable: true },
      },
    },
  },
  additionalProperties: true,
} as const

export const alchemyGetAssetTransfersJTD = {
  properties: {
    transfers: {
      elements: alchemyAssetTransferJTD,
    },
  },
  additionalProperties: true,
} as const

// JSON Type Definition for the Alchemy token balance API.
// https://docs.alchemy.com/alchemy/documentation/enhanced-apis/token-api
export const alchemyTokenBalanceJTD = {
  properties: {
    address: { type: "string" },
    tokenBalances: {
      elements: {
        properties: {
          contractAddress: { type: "string" },
          tokenBalance: { type: "string", nullable: true },
          error: {},
        },
      },
    },
  },
  additionalProperties: false,
} as const

// JSON Type Definition for the Alchemy token metadata API.
// https://docs.alchemy.com/alchemy/documentation/enhanced-apis/token-api#alchemy_gettokenmetadata
export const alchemyTokenMetadataJTD = {
  properties: {
    decimals: { type: "uint32" },
    name: { type: "string" },
    symbol: { type: "string" },
    logo: { type: "string", nullable: true },
  },
  additionalProperties: false,
} as const
