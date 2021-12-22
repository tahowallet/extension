import { convertToEth, weiToGwei } from "../../lib/utils"
import { EnrichedEVMTransaction } from "../../services/enrichment"

function ethTransformer(
  value: string | number | bigint | null | undefined
): string {
  if (value === null || typeof value === "undefined") {
    return "(Unknown)"
  }
  return `${convertToEth(value)} ETH`
}

function gweiTransformer(
  value: string | number | bigint | null | undefined
): string {
  if (value === null || typeof value === "undefined") {
    return "(Unknown)"
  }
  return `${weiToGwei(value)} Gwei`
}

type FieldAdapter<T> = {
  readableName: string
  transformer: (value: T) => string
  detailTransformer: (value: T) => string
}

export type UIAdaptationMap<T> = {
  [P in keyof T]?: FieldAdapter<T[P]>
}

export type ActivityItem = EnrichedEVMTransaction & {
  localizedDecimalValue: string
  timestamp?: number
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
  maxFeePerGas: {
    readableName: "Max Fee/Gas",
    transformer: gweiTransformer,
    detailTransformer: gweiTransformer,
  },
  gasPrice: {
    readableName: "Gas Price",
    transformer: gweiTransformer,
    detailTransformer: gweiTransformer,
  },
  gasUsed: {
    readableName: "Gas",
    transformer: (val) => val?.toString(),
    detailTransformer: (val) => val?.toString(),
  },
}
