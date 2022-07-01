export const ESTIMATED_FEE_MULTIPLIERS: { [confidence: number]: bigint } = {
  70: 11n,
  95: 13n,
  99: 18n,
  0: 20n,
}

export const ESTIMATED_FEE_MULTIPLIERS_BY_TYPE: {
  [feeType: string]: bigint
} = {
  regular: 11n,
  express: 13n,
  instant: 18n,
}

export const MAX_FEE_MULTIPLIER: { [confidence: number]: bigint } = {
  70: 13n,
  95: 15n,
  99: 20n,
  0: 20n,
}

export const ESTIMATED_SPEED_IN_READABLE_FORMAT_RELATIVE_TO_CONFIDENCE_LEVEL: {
  [confidence: number]: string
} = {
  70: "~5 min",
  95: "~1 min",
  99: "~30 sec",
  0: "-",
}

export const INSTANT = 99
export const EXPRESS = 95
export const REGULAR = 70
export const CUSTOM = 0
