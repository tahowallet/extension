import dayjs from "dayjs"
import {
  SmartContractFungibleAsset,
  AnyAsset,
  isSmartContractFungibleAsset,
  AnyAssetAmount,
} from "../../assets"
import { convertToEth } from "../../lib/utils"
import { AnyEVMTransaction } from "../../networks"
import {
  AssetDecimalAmount,
  enrichAssetAmountWithDecimalValues,
} from "./asset-utils"
import { HexString } from "../../types"

function ethTransformer(
  value: string | number | bigint | null | undefined
): string {
  if (value === null || typeof value === "undefined") {
    return "(Unknown)"
  }
  return `${convertToEth(value)} ETH`
}

type FieldAdapter<T> = {
  readableName: string
  transformer: (value: T) => string
  detailTransformer: (value: T) => string
}

export type UIAdaptationMap<T> = {
  [P in keyof T]?: FieldAdapter<T[P]>
}

export type BaseContractInfo = {
  contractLogoURL?: string | undefined
}

export type ContractDeployment = BaseContractInfo & {
  type: "contract-deployment"
}

export type ContractInteraction = BaseContractInfo & {
  type: "contract-interaction"
}

export type AssetTransfer = BaseContractInfo & {
  type: "asset-transfer"
  assetAmount: AnyAssetAmount & AssetDecimalAmount
}

export type ContractInfo =
  | ContractDeployment
  | ContractInteraction
  | AssetTransfer
  | undefined

export type ActivityItem = AnyEVMTransaction & {
  contractInfo?: ContractInfo | undefined
  localizedDecimalValue: string
  timestamp?: number
  isSent?: boolean
  blockHeight: number | null
  fromTruncated: string
  toTruncated: string
  infoRows: {
    [name: string]: {
      label: string
      value: string
      valueDetail: string
    }
  }
}

/**
 * Given a map of adaptations from fields in type T, return all keys that need
 * adaptation with three fields, a label, a value, and a valueDetail, derived
 * based on the adaptation map.
 */
export function adaptForUI<T>(
  fieldAdapters: UIAdaptationMap<T>,
  item: T
): {
  [key in keyof UIAdaptationMap<T>]: {
    label: string
    value: string
    valueDetail: string
  }
} {
  // The as below is dicey but reasonable in our usage.
  return Object.keys(fieldAdapters).reduce(
    (adaptedFields, key) => {
      const knownKey = key as keyof UIAdaptationMap<T> // statically guaranteed
      const adapter = fieldAdapters[knownKey] as
        | FieldAdapter<unknown>
        | undefined

      if (typeof adapter === "undefined") {
        return adaptedFields
      }

      const { readableName, transformer, detailTransformer } = adapter

      return {
        ...adaptedFields,
        [key]: {
          label: readableName,
          value: transformer(item[knownKey]),
          valueDetail: detailTransformer(item[knownKey]),
        },
      }
    },
    {} as {
      [key in keyof UIAdaptationMap<T>]: {
        label: string
        value: string
        valueDetail: string
      }
    }
  )
}

export const keysMap: UIAdaptationMap<ActivityItem> = {
  blockHeight: {
    readableName: "Block Height",
    transformer: (height: number | null) =>
      height === null ? "(pending)" : height.toString(),
    detailTransformer: () => {
      return ""
    },
  },
  value: {
    readableName: "Amount",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  gasUsed: {
    readableName: "Gas",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  maxFeePerGas: {
    readableName: "Max Fee/Gas",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  gasPrice: {
    readableName: "Gas Price",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  timestamp: {
    readableName: "Timestamp",
    transformer: (item) => {
      if (typeof item !== "undefined") {
        return dayjs.unix(item).format("MM/DD/YYYY hh:mm a")
      }
      return "(Unknown)"
    },
    detailTransformer: () => {
      return ""
    },
  },
}

function resolveContractInfo(
  assets: AnyAsset[],
  contractAddress: HexString | undefined,
  contractInput: HexString,
  desiredDecimals: number
): ContractInfo | undefined {
  // A missing recipient means a contract deployment.
  if (typeof contractAddress === "undefined") {
    return {
      type: "contract-deployment",
    }
  }

  // See if the address matches a fungible asset.
  const matchingFungibleAsset = assets.find(
    (asset): asset is SmartContractFungibleAsset =>
      isSmartContractFungibleAsset(asset) &&
      asset.contractAddress.toLowerCase() === contractAddress.toLowerCase()
  )

  const contractLogoURL = matchingFungibleAsset?.metadata?.logoURL

  // Derive value from transaction transfer if not sending ETH
  // FIXME Move to ERC20 parsing using ethers.
  if (
    typeof matchingFungibleAsset !== "undefined" &&
    contractInput.length >= 74 &&
    contractInput.startsWith("0xa9059cbb") // transfer selector
  ) {
    return {
      type: "asset-transfer",
      contractLogoURL,
      assetAmount: enrichAssetAmountWithDecimalValues(
        {
          asset: matchingFungibleAsset,
          amount: BigInt(`0x${contractInput.slice(10, 10 + 64)}`),
        },
        desiredDecimals
      ),
    }
  }

  // Fall back on a standard contract interaction.
  return {
    type: "contract-interaction",
    contractLogoURL,
  }
}

export function enrichTransactionWithContractInfo(
  assets: AnyAsset[],
  transaction: AnyEVMTransaction,
  desiredDecimals: number
): AnyEVMTransaction & { contractInfo?: ContractInfo | undefined } {
  if (transaction.input === null || transaction.input === "0x") {
    // This is _almost certainly_ not a contract interaction, move on. Note that
    // a simple ETH send to a contract address can still effectively be a
    // contract interaction (because it calls the fallback function on the
    // contract), but for now we deliberately ignore that scenario when
    // categorizing activities.
    return transaction
  }

  return {
    ...transaction,
    contractInfo: resolveContractInfo(
      assets,
      transaction.to,
      transaction.input,
      desiredDecimals
    ),
  }
}
