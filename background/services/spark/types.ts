import type { SparkNetwork } from "../../networks"
import type { SparkAddress, UNIXTime } from "../../types"

/**
 * A Spark account Taho tracks. Spark keys are derived by the Spark SDK from a
 * BIP-39 recovery phrase at `m/8797555'/<accountNumber>'/…`, so an account is
 * identified by the internal-signer keyring holding the phrase, the account
 * number and the network.
 */
export type SparkAccount = {
  /** `<chainID>:<keyringID>:<accountNumber>`; stable across restarts. */
  id: string
  keyringID: string
  accountNumber: number
  network: SparkNetwork
  address: SparkAddress
  /** Hex-encoded compressed secp256k1 identity public key. */
  identityPublicKey: string
  addedAt: UNIXTime
}

export type SparkTokenBalance = {
  /** Bech32m token identifier (`btkn1…`). */
  tokenIdentifier: string
  name: string
  ticker: string
  decimals: number
  owned: bigint
  availableToSend: bigint
}

export type SparkBalance = {
  accountID: string
  /** Satoshis that can be spent immediately. */
  available: bigint
  /** All satoshis owned, including those locked in outgoing transfers. */
  owned: bigint
  /** Inbound satoshis not yet claimed. */
  incoming: bigint
  tokens: SparkTokenBalance[]
  retrievedAt: UNIXTime
}

/**
 * How a transfer moved value, simplified from the SDK's `TransferType`.
 */
export type SparkActivityKind =
  | "spark"
  | "lightning"
  | "deposit"
  | "withdrawal"
  | "other"

export type SparkActivityItem = {
  id: string
  accountID: string
  direction: "incoming" | "outgoing"
  kind: SparkActivityKind
  /** Raw SDK transfer type, kept for display and debugging. */
  sdkType: string
  status: string
  amountSats: bigint
  counterpartyIdentityPublicKey: string
  /**
   * The counterparty's Spark address on this account's network, derived from
   * its identity public key.
   */
  counterpartyAddress?: SparkAddress
  createdAt: UNIXTime | undefined
}

export type SparkLightningInvoice = {
  accountID: string
  id: string
  encodedInvoice: string
  amountSats: number
  createdAt: UNIXTime
}

export type SparkSendResult = {
  accountID: string
  id: string
  kind: "spark" | "lightning"
  status: string
}

/**
 * Error codes surfaced to the UI. Messages from the SDK are kept as detail.
 */
export type SparkServiceErrorCode =
  | "locked"
  | "unknown-account"
  | "unknown-keyring"
  | "duplicate-account"
  | "invalid-address"
  | "network-mismatch"
  | "sdk-error"
