import {
  AnyAssetAmount,
  FungibleAsset,
  SmartContractFungibleAsset,
} from "../../assets"
import type { AccountBalance, AddressOnNetwork } from "../../accounts"
import {
  AnyEVMTransaction,
  EIP1559TransactionRequest,
  EVMNetwork,
  LegacyEVMTransactionRequest,
} from "../../networks"
import { AssetDecimalAmount } from "../../redux-slices/utils/asset-utils"
import type { HexString, UNIXTime } from "../../types"
import { SignTypedDataRequest } from "../../utils/signing"
import { ResolvedNameRecord } from "../name"
import type { AssetTransferForAddress } from "./utils"

export type BaseTransactionAnnotation = {
  /**
   * A URL to an image representing the transaction interaction, if applicable.
   */
  transactionLogoURL?: string | undefined
  /**
   * In some cases, a transaction may have internal calls that can be described
   * by annotations; these are represented as subannotations. One good example
   * are transactions that may have multiple embedded token transfers, such as
   * swaps with complex routing.
   */
  subannotations?: TransactionAnnotation[]
  /**
   * When this transaction annotation was resolved. Including this means
   * consumers can more easily upsert annotations.
   */
  timestamp: UNIXTime
  /**
   * The timestamp of the transaction's associated block if available.
   */
  blockTimestamp: UNIXTime | undefined
  /*
   *
   */
  warnings?: Warning[]
  /**
   * The revert reason reported by an off-chain simulation of a pending
   * request, if the simulation reverted and the provider supplied one.
   */
  simulationRevertReason?: string
  /**
   * The outcome of an off-chain simulation of this pending request, if one
   * ran. Distinguishes "simulated, nothing moved" from "not simulated".
   */
  simulationStatus?: "success" | "reverted"
  /**
   * When the simulated request executes a Safe transaction, the Safe whose
   * balance changes the simulation's subannotations include.
   */
  simulatedSafeAddress?: HexString
}

export type Warning =
  | "send-to-token"
  | "send-to-contract"
  | "approve-eoa"
  | "insufficient-funds"
  | "simulation-reverted"

export type ContractDeployment = BaseTransactionAnnotation & {
  type: "contract-deployment"
}

export type ContractInteraction = BaseTransactionAnnotation & {
  type: "contract-interaction"
  contractInfo: EnrichedAddressOnNetwork
}

export type AssetApproval = BaseTransactionAnnotation & {
  type: "asset-approval"
  assetAmount: AnyAssetAmount<SmartContractFungibleAsset> & AssetDecimalAmount
  spender: EnrichedAddressOnNetwork
}

export type AssetTransfer = BaseTransactionAnnotation & {
  type: "asset-transfer"
  assetAmount: AnyAssetAmount & AssetDecimalAmount
  recipient: EnrichedAddressOnNetwork
  sender: EnrichedAddressOnNetwork
}

export type AssetSwap = BaseTransactionAnnotation & {
  type: "asset-swap"
  fromAssetAmount: AnyAssetAmount<FungibleAsset> & AssetDecimalAmount
  toAssetAmount: AnyAssetAmount<FungibleAsset> & AssetDecimalAmount
  estimatedPriceImpact: number
  sources: { name: string; percentage: number }[]
  swapContractInfo?: EnrichedAddressOnNetwork
}

export type TransactionAnnotation =
  | ContractDeployment
  | ContractInteraction
  | AssetApproval
  | AssetTransfer
  | AssetSwap

export type EnrichedEVMTransaction = AnyEVMTransaction & {
  annotation?: TransactionAnnotation
}

export type EnrichedEVMTransactionSignatureRequest =
  | EnrichedEIP1559TransactionSignatureRequest
  | EnrichedLegacyTransactionSignatureRequest

export type EnrichedEIP1559TransactionSignatureRequest =
  Partial<EIP1559TransactionRequest> & {
    from: string
    annotation?: TransactionAnnotation
    network: EVMNetwork
    broadcastOnSign: boolean
  }

export type EnrichedLegacyTransactionSignatureRequest =
  Partial<LegacyEVMTransactionRequest> & {
    from: string
    annotation?: TransactionAnnotation
    network: EVMNetwork
    broadcastOnSign: boolean
  }

export type EnrichedEIP1559TransactionRequest = EIP1559TransactionRequest & {
  annotation?: TransactionAnnotation
}

export type EnrichedLegacyTransactionRequest = LegacyEVMTransactionRequest & {
  annotation?: TransactionAnnotation
}

export type EnrichedEVMTransactionRequest =
  | EnrichedEIP1559TransactionRequest
  | EnrichedLegacyTransactionRequest

type PartialEIP1559TransactionRequestWithFrom =
  Partial<EIP1559TransactionRequest> & {
    from: string
    network: EVMNetwork
    broadcastOnSign: boolean
  }

type PartialLegacyEVMTransactionRequestWithFrom =
  Partial<LegacyEVMTransactionRequest> & {
    from: string
    network: EVMNetwork
    broadcastOnSign: boolean
  }

export type PartialTransactionRequestWithFrom =
  | PartialEIP1559TransactionRequestWithFrom
  | PartialLegacyEVMTransactionRequestWithFrom

export type TypedDataField = {
  value: string
  type: "address" | "string"
}

export type EIP2612SignTypedDataAnnotation = {
  type: "EIP-2612"
  source: string
  displayFields: {
    owner: string
    tokenContract: string
    spender: string
    value: string
    nonce: number
    expiry: string
    token?: string
  }
}

/**
 * An EIP-712 `SafeTx` signature request: an owner proposing or confirming a
 * Safe transaction.
 */
export type SafeTransactionSignTypedDataAnnotation = {
  type: "safe-transaction"
  safeAddress: HexString
  /**
   * The outcome of simulating the transaction as if it had enough signatures;
   * undefined when simulation wasn't possible.
   */
  simulation?: {
    status: "success" | "reverted"
    revertReason?: string
    /** Simulated transfers into and out of the Safe. */
    balanceChanges: AssetTransferForAddress[]
  }
  /**
   * How many of the Safe's transactions must execute before this one. The
   * simulation runs against current state, so it doesn't reflect them.
   */
  queuedBefore?: number
  /** The transaction's nonce has already been used; it can never execute. */
  nonceAlreadyUsed?: boolean
}

export type SignTypedDataAnnotation =
  | EIP2612SignTypedDataAnnotation
  | SafeTransactionSignTypedDataAnnotation

export type EnrichedSignTypedDataRequest = SignTypedDataRequest & {
  annotation?: SignTypedDataAnnotation
}

export type AddressOnNetworkAnnotation = {
  /**
   * When this address/network annotation was resolved. Including this means
   * consumers can more easily upsert annotations.
   */
  timestamp: UNIXTime
  /**
   * Whether code was found at this address at the time of annotation
   * resolution.
   */
  hasCode: boolean
  /**
   * A somewhat recent account balance. Accuracy here is less important, as
   * it will mostly be used to warn on sending to 0-balanace addresses.
   */
  balance: AccountBalance
  /**
   * A reverse-resolved name record for this address, if one has been found.
   */
  nameRecord?: ResolvedNameRecord
}

export type EnrichedAddressOnNetwork = AddressOnNetwork & {
  annotation: AddressOnNetworkAnnotation
}
