export interface Eligible {
  address: string
  earnings: BigInt
  reasons: string
}

export interface Claim {
  eligibles: Eligible[]
}
