import AjvJTD from "ajv/dist/jtd"
import AjvJSON from "ajv"
import standaloneCode from "ajv/dist/standalone"
import { writeFileSync } from "fs"
import path from "path"
import { schema } from "@uniswap/token-lists"

import { swapPriceJTD, swapQuoteJTD } from "./lib/validate/0x-swap"
import {
  alchemyGetAssetTransfersJTD,
  alchemyTokenBalanceJTD,
  alchemyTokenMetadataJTD,
} from "./lib/validate/alchemy"
import { metadataJTD } from "./lib/validate/erc721"
import { coingeckoPriceSchema } from "./lib/validate/prices"

const ajvJTD = new AjvJTD({
  allErrors: true,
  code: { source: true, es5: true },
})
  .addSchema(metadataJTD, "isValidMetadata")
  .addSchema(alchemyGetAssetTransfersJTD, "isValidAlchemyAssetTransferResponse")
  .addSchema(alchemyTokenBalanceJTD, "isValidAlchemyTokenBalanceResponse")
  .addSchema(alchemyTokenMetadataJTD, "isValidAlchemyTokenMetadataResponse")
  .addSchema(swapPriceJTD, "isValidSwapPriceResponse")
  .addSchema(swapQuoteJTD, "isValidSwapQuoteResponse")

const ajvJSON = new AjvJSON({
  allErrors: true,
  code: { source: true },
  formats: { "date-time": true, uri: true },
})
  .addSchema(coingeckoPriceSchema, "isValidCoinGeckoPriceResponse")
  .addSchema(schema, "isValidUniswapTokenListResponse")

const jtdModuleCode = standaloneCode(ajvJTD).replace(
  '/*# sourceURL="https://uniswap.org/tokenlist.schema.json" */',
  "",
)
const jsonModuleCode = standaloneCode(ajvJSON).replace(
  '/*# sourceURL="https://uniswap.org/tokenlist.schema.json" */',
  "",
)

writeFileSync(
  path.join(__dirname, "/lib/validate/jtd-validators.js"),
  jtdModuleCode,
)

writeFileSync(
  path.join(__dirname, "/lib/validate/json-validators.js"),
  jsonModuleCode,
)
