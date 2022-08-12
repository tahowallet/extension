import { Network } from "@ethersproject/networks"
import { AnyAssetAmount, SmartContractFungibleAsset } from "../../assets"
import {
  AnyEVMTransaction,
  EIP1559TransactionRequest,
  EVMNetwork,
  LegacyEVMTransactionRequest,
} from "../../networks"
import { AssetDecimalAmount } from "../../redux-slices/utils/asset-utils"
import { HexString, UNIXTime } from "../../types"
import { SignTypedDataRequest } from "../../utils/signing"

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
}

export type Warning =
  | "send-to-token"
  | "send-to-contract"
  | "approve-eoa"
  | "insufficient-funds"

export type ContractDeployment = BaseTransactionAnnotation & {
  type: "contract-deployment"
}

export type ContractInteraction = BaseTransactionAnnotation & {
  type: "contract-interaction"
  contractName?: string
}

export type AssetApproval = BaseTransactionAnnotation & {
  type: "asset-approval"
  assetAmount: AnyAssetAmount<SmartContractFungibleAsset> & AssetDecimalAmount
  spenderAddress: HexString
  spenderName?: string
}

export type AssetTransfer = BaseTransactionAnnotation & {
  type: "asset-transfer"
  assetAmount: AnyAssetAmount & AssetDecimalAmount
  recipientAddress: HexString
  recipientName: HexString | undefined
  senderAddress: HexString
}

export type AssetSwap = BaseTransactionAnnotation & {
  type: "asset-swap"
  fromAssetAmount: AnyAssetAmount & AssetDecimalAmount
  toAssetAmount: AnyAssetAmount & AssetDecimalAmount
}

export type TransactionAnnotation =
  | ContractDeployment
  | ContractInteraction
  | AssetApproval
  | AssetTransfer
  | AssetSwap

export type ResolvedTransactionAnnotation = {
  contractInfo: TransactionAnnotation
  address: HexString
  network: Network
  resolvedAt: UNIXTime
}

export type EnrichedEVMTransaction = AnyEVMTransaction & {
  annotation?: TransactionAnnotation | undefined
}

export type EnrichedEVMTransactionSignatureRequest =
  | EnrichedEIP1559TransactionSignatureRequest
  | EnrichedLegacyTransactionSignatureRequest

export type EnrichedEIP1559TransactionSignatureRequest =
  Partial<EIP1559TransactionRequest> & {
    from: string
    annotation?: TransactionAnnotation
    network: EVMNetwork
  }

export type EnrichedLegacyTransactionSignatureRequest =
  Partial<LegacyEVMTransactionRequest> & {
    from: string
    annotation?: TransactionAnnotation
    network: EVMNetwork
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
  | Partial<EIP1559TransactionRequest> & { from: string }

type PartialLegacyEVMTransactionRequestWithFrom =
  | Partial<LegacyEVMTransactionRequest> & { from: string }

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

export type UnrecognizedSignTypedDataAnnotation = {
  type: "unrecognized"
}

export type SignTypedDataAnnotation =
  | EIP2612SignTypedDataAnnotation
  | UnrecognizedSignTypedDataAnnotation

export type EnrichedSignTypedDataRequest = SignTypedDataRequest & {
  annotation: SignTypedDataAnnotation
}
