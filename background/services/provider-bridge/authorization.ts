import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"
import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
  Permission,
} from "@tallyho/provider-bridge-shared"
import { sameEVMAddress } from "../../lib/utils"
import { toHexChainID } from "../../networks"
import type { HexString } from "../../types"

export function checkPermissionSignTypedData(
  walletAddress: HexString,
  enablingPermission: Permission,
): void {
  if (
    enablingPermission.state !== "allow" ||
    !sameEVMAddress(walletAddress, enablingPermission.accountAddress)
  ) {
    throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized)
  }
}

export function checkPermissionSign(
  walletAddress: HexString,
  enablingPermission: Permission,
): void {
  if (
    enablingPermission.state !== "allow" ||
    !sameEVMAddress(walletAddress, enablingPermission.accountAddress)
  ) {
    throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized)
  }
}

export function checkPermissionSignTransaction(
  transactionRequest: EthersTransactionRequest,
  enablingPermission: Permission,
): void {
  if (typeof transactionRequest.chainId !== "undefined") {
    if (
      toHexChainID(transactionRequest.chainId) !==
      toHexChainID(enablingPermission.chainID)
    ) {
      throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized)
    }
  }
  if (
    enablingPermission.state !== "allow" ||
    !sameEVMAddress(transactionRequest.from, enablingPermission.accountAddress)
  ) {
    throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized)
  }
}
