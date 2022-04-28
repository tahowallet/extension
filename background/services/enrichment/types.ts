import { Network } from "@ethersproject/networks"
import { AnyAssetAmount, SmartContractFungibleAsset } from "../../assets"
import { AnyEVMTransaction, EIP1559TransactionRequest } from "../../networks"
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
  annotatedAt: UNIXTime
}

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
  (Partial<EIP1559TransactionRequest> & { from: string }) & {
    annotation?: TransactionAnnotation
  }

export type EnrichedEIP1559TransactionRequest = EIP1559TransactionRequest & {
  annotation?: TransactionAnnotation
}

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
