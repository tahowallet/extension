import {
  EIP1193_ERROR_CODES,
  PermissionRequest,
} from "@tallyho/provider-bridge-shared"

export type PermissionMap = {
  evm: {
    [chainID: string]: {
      [address: string]: {
        [origin: string]: PermissionRequest
      }
    }
  }
}

export const keyPermissionsByChainIdAddressOrigin = (
  permissions: PermissionRequest[],
  permissionMap?: PermissionMap
): PermissionMap => {
  const map = permissionMap ?? { evm: {} }
  permissions.forEach((permission) => {
    map.evm[permission.chainID] ??= {}
    map.evm[permission.chainID][permission.accountAddress] ??= {}
    map.evm[permission.chainID][permission.accountAddress][permission.origin] =
      permission
  })
  return map
}

export function getRPCErrorResponser(error: unknown): {
  code: number
  message: string
} {
  const parsedError = JSON.parse((error as { body: string }).body)?.error
  return {
    /**
     * The code should be the same as for user rejected requests because otherwise it will not be displayed.
     */
    code: 4001,
    message:
      "message" in parsedError && parsedError.message
        ? parsedError.message[0].toUpperCase() + parsedError.message.slice(1)
        : EIP1193_ERROR_CODES.userRejectedRequest.message,
  }
}
