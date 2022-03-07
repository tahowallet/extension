import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"
import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
  PermissionRequest,
} from "@tallyho/provider-bridge-shared"
import { sameEVMAddress } from "../../lib/utils"
import { HexString } from "../../types"

export function checkPermissionSignTypedData(
  params: unknown[],
  enablingPermission: PermissionRequest
): void {
  const walletAddress = params[0] as HexString

  if (!sameEVMAddress(walletAddress, enablingPermission.accountAddress)) {
    throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized)
  }
}

export function checkPermissionSign(
  params: unknown[],
  enablingPermission: PermissionRequest
): void {
  const walletAddress = params[1] as HexString

  if (!sameEVMAddress(walletAddress, enablingPermission.accountAddress)) {
    throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized)
  }
}

export function checkPermissionSignTransaction(
  params: unknown[],
  enablingPermission: PermissionRequest
): void {
  const transactionRequest = params[0] as EthersTransactionRequest

  if (
    !sameEVMAddress(transactionRequest.from, enablingPermission.accountAddress)
  ) {
    throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized)
  }
}
