import { AnyAssetAmount } from "./assets"
import { Network } from "./networks"
import { HexString } from "./types"

/**
 * An account balance at a particular time and block height, on a particular
 * network. Flexible enough to represent base assets like ETH and BTC as well
 * application-layer tokens like ERC-20s.
 */
export type AccountBalance = {
  /*
   * The account whose balance was measured.
   */
  account: HexString
  /*
   * The measured balance and the asset in which it's denominated.
   */
  assetAmount: AnyAssetAmount
  /*
   * The network on which the account balance was measured.
   */
  network: Network
  /*
   * The block height at while the balance measurement is valid.
   */
  blockHeight?: bigint
  /*
   * When the account balance was measured, using Unix epoch timestamps.
   */
  retrievedAt: number
  /*
   * A loose attempt at tracking balance data provenance, in case providers
   * disagree and need to be disambiguated.
   */
  dataSource: "alchemy" | "local"
}

/**
 * An account on a particular network. That's it. That's the comment.
 */
export type AccountNetwork = {
  account: HexString
  network: Network
}
