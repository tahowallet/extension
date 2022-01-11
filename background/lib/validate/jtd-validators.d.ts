import { JTDDataType, ValidateFunction } from "ajv/dist/jtd"
import { swapAssetsJTD, swapPriceJTD, swapQuoteJTD } from "./0x-swap"
import {
  alchemyGetAssetTransfersJTD,
  alchemyTokenBalanceJTD,
  alchemyTokenMetadataJTD,
} from "./alchemy"
import { metadataJTD } from "./erc721"

export const isValidAlchemyAssetTransferResponse: ValidateFunction<
  JTDDataType<typeof alchemyGetAssetTransfersJTD>
>

export const isValidAlchemyTokenBalanceResponse: ValidateFunction<
  JTDDataType<typeof alchemyTokenBalanceJTD>
>

export const isValidAlchemyTokenMetadataResponse: ValidateFunction<
  JTDDataType<typeof alchemyTokenMetadataJTD>
>
export const isValidMetadata: ValidateFunction<JTDDataType<typeof metadataJTD>>

export const isValidSwapAssetsResponse: ValidateFunction<
  JTDDataType<typeof swapAssetsJTD>
>

export const isValidSwapPriceResponse: ValidateFunction<
  JTDDataType<typeof swapPriceJTD>
>

export const isValidSwapQuoteResponse: ValidateFunction<
  JTDDataType<typeof swapQuoteJTD>
>
