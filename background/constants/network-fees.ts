export const ESTIMATED_FEE_MULTIPLIERS: { [confidence: number]: bigint } = {
  70: 11n,
  95: 13n,
  99: 18n,
}

export const ESTIMATED_FEE_MULTIPLIERS_BY_TYPE: { [feeType: string]: bigint } =
  {
    regular: 11n,
    express: 13n,
    instant: 18n,
  }

export const MAX_FEE_MULTIPLIER: { [confidence: number]: bigint } = {
  70: 13n,
  95: 15n,
  99: 20n,
}

export const INSTANT = 99
export const EXPRESS = 95
export const REGULAR = 70
