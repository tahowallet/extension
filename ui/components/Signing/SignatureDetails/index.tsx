import React, { ReactElement } from "react"
import { TransactionRequest } from "@tallyho/tally-background/networks"
import {
  rejectDataSignature,
  signData,
  SignOperation,
  SignOperationType,
  signTypedData,
} from "@tallyho/tally-background/redux-slices/signing"
import {
  rejectTransactionSignature,
  signTransaction,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import {
  SignDataRequest,
  SignTypedDataRequest,
} from "@tallyho/tally-background/utils/signing"
import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import { AnyAction } from "redux"
import TransactionSignatureDetails from "./TransactionSignatureDetails"

/**
 * Details regarding a signature request, resolved for a signer ahead of time
 * based on the type of signature, the account whose signature is being
 * requested, and the network on which that signature is taking place; see
 * `resolveSignatureDetails`.
 */
export type ResolvedSignatureDetails = {
  signer: AccountSigner
  signingAddress: AddressOnNetwork
  renderedSigningData: ReactElement
  signingActionLabel: string
  signActionCreator: () => AnyAction
  rejectActionCreator: () => AnyAction
}

export function resolveTransactionSignatureDetails({
  request,
  accountSigner,
}: SignOperation<TransactionRequest>): ResolvedSignatureDetails {
  return {
    signer: accountSigner,
    signingAddress: { address: request.from, network: request.network },
    signingActionLabel: "Sign",
    renderedSigningData: (
      <TransactionSignatureDetails transactionRequest={request} />
    ),
    signActionCreator: () => signTransaction({ request, accountSigner }),
    rejectActionCreator: rejectTransactionSignature,
  }
}
export function resolveDataSignatureDetails({
  request,
  accountSigner,
}: SignOperation<SignDataRequest>): ResolvedSignatureDetails {
  // TODO Render signing data accordingly.

  return {
    signer: accountSigner,
    signingAddress: request.account,
    signingActionLabel: "Sign Data",
    renderedSigningData: <></>,
    signActionCreator: () => signData({ request, accountSigner }),
    rejectActionCreator: rejectDataSignature,
  }
}

export function resolveTypedDataSignatureDetails({
  request,
  accountSigner,
}: SignOperation<SignTypedDataRequest>): ResolvedSignatureDetails {
  // TODO Render signing data accordingly.

  return {
    signer: accountSigner,
    signingAddress: request.account,
    signingActionLabel: "Sign Data",
    renderedSigningData: <></>,
    signActionCreator: () => signTypedData({ request, accountSigner }),
    rejectActionCreator: rejectDataSignature,
  }
}

// Takes a signing request and resolves the signer that should be used to sign
// it and the details of signing data for user presentation.
export function resolveSignatureDetails<T extends SignOperationType>({
  request,
  accountSigner,
}: SignOperation<T>): ResolvedSignatureDetails {
  if ("signingData" in request) {
    return resolveDataSignatureDetails({ request, accountSigner })
  }
  if ("typedData" in request) {
    return resolveTypedDataSignatureDetails({ request, accountSigner })
  }
  return resolveTransactionSignatureDetails({ request, accountSigner })
}

export function useResolvedSignatureDetails<T extends SignOperationType>(
  signOperation: SignOperation<T> | undefined
): ResolvedSignatureDetails | undefined {
  return signOperation === undefined
    ? undefined
    : resolveSignatureDetails(signOperation)
}
