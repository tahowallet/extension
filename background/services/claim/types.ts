export interface Eligible {
  address: string
  earnings: BigInt
  reasons: string
}

export interface IPFSLinkItem {
  Hash: { "/": string }
  Name: string
  Tsize: number
}
