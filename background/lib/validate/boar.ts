// JSON Type Definition for the Boar assetTransfers API.
// Response format is compatible with Alchemy's transfers API.
const boarAssetTransferJTD = {
  properties: {
    asset: { type: "string", nullable: true },
    hash: { type: "string" },
    blockNum: { type: "string" },
    category: { enum: ["token", "internal", "external", "erc20", "erc1155"] },
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

export const boarGetAssetTransfersJTD = {
  properties: {
    transfers: {
      elements: boarAssetTransferJTD,
    },
  },
  additionalProperties: true,
} as const

// JSON Type Definition for the Boar token balance API.
export const boarTokenBalanceJTD = {
  properties: {
    address: { type: "string" },
    tokenBalances: {
      elements: {
        properties: {
          contractAddress: { type: "string" },
          error: {},
        },
        optionalProperties: {
          tokenBalance: { type: "string", nullable: true },
        },
      },
    },
  },
  optionalProperties: {
    pageKey: { type: "string" },
  },
  additionalProperties: false,
} as const

// JSON Type Definition for the Boar token metadata API.
export const boarTokenMetadataJTD = {
  properties: {
    decimals: { type: "uint32", nullable: true },
    name: { type: "string" },
    symbol: { type: "string" },
    logo: { type: "string", nullable: true },
  },
  additionalProperties: false,
} as const
