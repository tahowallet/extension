import dayjs from "dayjs"
import { getNetwork } from "@ethersproject/networks"
import { AlchemyProvider } from "@ethersproject/providers"
import logger from "../../lib/logger"
import { ETH } from "../../constants/currencies"
import { SmartContractFungibleAsset, FungibleAsset } from "../../assets"
import { getTokenMetadata } from "../../lib/alchemy"
import { convertToEth, getEthereumNetwork } from "../../lib/utils"
import { AnyEVMTransaction } from "../../networks"
import { AssetDecimalAmount } from "./asset-utils"

const pollingProviders = {
  ethereum: new AlchemyProvider(
    getNetwork(Number(getEthereumNetwork().chainID)),
    process.env.ALCHEMY_KEY
  ),
}

function ethTransformer(value: string | number | bigint | null): string {
  if (value === null) {
    return "(Unknown)"
  }
  return `${convertToEth(value)} ETH`
}

export type UIAdaptationMap<T> = {
  [P in keyof T]?: {
    readableName: string
    transformer: (value: T[P]) => string
    detailTransformer: (value: T[P]) => string
  }
}

export type ActivityItem = AnyEVMTransaction & {
  timestamp?: number
  isSent: boolean
  blockHeight: number
  infoRows: {
    [name: string]: {
      label: string
      value: unknown
      valueDetail: string
    }
  }
  token: FungibleAsset
  tokenDecimalValue: AssetDecimalAmount["decimalAmount"]
  fromTruncated: string
  toTruncated: string
}

export function adaptForUI<T>(keysMap: UIAdaptationMap<T>, item: T) {
  // The as below is dicey but reasonable in our usage.
  return Object.keys(item).reduce((previousValue, key) => {
    if (key in keysMap) {
      const knownKey = key as keyof UIAdaptationMap<T> // guaranteed to be true by the `in` test
      const keyAdjustment = keysMap[knownKey]

      return keyAdjustment === undefined
        ? previousValue
        : {
            ...previousValue,
            [keyAdjustment.readableName]: keyAdjustment.transformer(
              item[knownKey]
            ),
          }
    }
    return previousValue
  }, {})
}

export const keysMap: UIAdaptationMap<ActivityItem> = {
  blockHeight: {
    readableName: "Block Height",
    transformer: (item: number) => item.toString(),
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

export async function determineToken(
  result: AnyEVMTransaction
): Promise<FungibleAsset | SmartContractFungibleAsset | null> {
  const { input } = result
  let asset = ETH
  if (input) {
    try {
      let meta: SmartContractFungibleAsset | null = null
      if (result?.to) {
        meta = await getTokenMetadata(pollingProviders.ethereum, result.to)
      }
      if (meta) {
        asset = meta
      }
    } catch (err) {
      logger.error(`Error getting token metadata`, err)
    }
  }

  return asset
}

export function determineActivityDecimalValue(
  activityItem: ActivityItem
): number {
  const { token } = activityItem
  let { value } = activityItem

  // Derive value from transaction transfer if not sending ETH
  if (value === BigInt(0) && activityItem.input) {
    value = BigInt(`0x${activityItem.input.slice(10).slice(0, 64)}`)
  }

  const decimalValue = Number(value) / 10 ** token.decimals
  return decimalValue
}
