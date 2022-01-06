import { JTDDataType, ValidateFunction } from "ajv/dist/jtd"

/* eslint-disable @typescript-eslint/no-var-requires, global-require */
export const isValidAlchemyAssetTransferResponse: ValidateFunction<
  JTDDataType<typeof alchemyGetAssetTransfersJTD>
> = require("./jtd-validators")["alchemy-get-asset-transfers.jtd.schema.json"]

export const isValidAlchemyTokenBalanceResponse: ValidateFunction<
  JTDDataType<typeof alchemyTokenBalanceJTD>
> = require("./jtd-validators")["alchemy-token-balance.jtd.schema.json"]

export const isValidAlchemyTokenMetadataResponse: ValidateFunction<
  JTDDataType<typeof alchemyTokenMetadataJTD>
> = require("./jtd-validators")["alchemy-token-metadata.jtd.schema.json"]
/* eslint-enable @typescript-eslint/no-var-requires, global-require */

// JSON Type Definition for the Alchemy assetTransfers API.
// https://docs.alchemy.com/alchemy/documentation/enhanced-apis/transfers-api
export const alchemyAssetTransferJTD = {
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
