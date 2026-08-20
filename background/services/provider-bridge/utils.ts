import {
  PermissionRequest,
  EIP1193Error,
  EIP1193_ERROR_CODES,
  isEIP1193Error,
  EIP1193ErrorPayload,
  RPCRequest,
} from "@tallyho/provider-bridge-shared"
import { AddEthereumChainParameter } from "../internal-ethereum-provider"
import { sameEVMAddress } from "../../lib/utils"
import { HexString } from "../../types"

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
  permissionMap?: PermissionMap,
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

export function parsedRPCErrorResponse(error: { body: string }):
  | {
      code: number
      message: string
    }
  | undefined {
  try {
    const parsedError = JSON.parse(error.body).error
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
  } catch (err) {
    return undefined
  }
}

export function handleRPCErrorResponse(error: unknown): unknown {
  let response
  if (typeof error === "object" && error !== null) {
    /**
     * Get error per the RPC method’s specification
     */
    if ("eip1193Error" in error) {
      const { eip1193Error } = error as {
        eip1193Error: EIP1193ErrorPayload
      }
      if (isEIP1193Error(eip1193Error)) {
        response = eip1193Error
      }
      /**
       * In the case of a non-matching error message, the error is returned without being nested in an object.
       * This is due to the error handling implementation.
       * Check the code for more details https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts#L96:L130
       */
    } else if ("body" in error) {
      response = parsedRPCErrorResponse(error as { body: string })
    } else if ("error" in error) {
      response = parsedRPCErrorResponse(
        (error as { error: { body: string } }).error,
      )
    }
  }
  /**
   * If no specific error is obtained return a user rejected request error
   */
  return (
    response ??
    new EIP1193Error(EIP1193_ERROR_CODES.userRejectedRequest).toJSON()
  )
}

// Lets start with all required and work backwards
export type ValidatedAddEthereumChainParameter = {
  chainId: string
  blockExplorerUrl: string
  chainName: string
  iconUrl?: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls: string[]
}

/**
 * The icon URL a dapp offers for a chain it is asking the wallet to add, if
 * and only if it is an absolute `http:`/`https:` URL.
 *
 * This value is dapp-controlled and ends up in wallet UI as an image source,
 * so anything that is not plainly fetchable web content is dropped rather
 * than sanitized: `javascript:` and `data:` URLs, relative paths, and strings
 * crafted to break out of the surrounding markup or CSS all yield
 * `undefined`. What is accepted is returned in its parsed, normalized form,
 * so the stored value can never carry raw control characters or unencoded
 * delimiters even if a render site later mishandles it.
 */
function validatedChainIconUrl(iconUrls?: string[]): string | undefined {
  const [iconUrl] = iconUrls ?? []

  if (typeof iconUrl !== "string") {
    return undefined
  }

  try {
    const parsedIconUrl = new URL(iconUrl)

    return parsedIconUrl.protocol === "http:" ||
      parsedIconUrl.protocol === "https:"
      ? parsedIconUrl.href
      : undefined
  } catch {
    // Not a parseable absolute URL at all.
    return undefined
  }
}

export const validateAddEthereumChainParameter = ({
  chainId,
  chainName,
  blockExplorerUrls,
  iconUrls,
  nativeCurrency,
  rpcUrls,
}: AddEthereumChainParameter): ValidatedAddEthereumChainParameter => {
  // @TODO Use AJV
  if (
    !chainId ||
    !chainName ||
    !nativeCurrency ||
    !blockExplorerUrls ||
    !blockExplorerUrls.length ||
    !rpcUrls ||
    !rpcUrls.length
  ) {
    throw new Error("Missing Chain Property")
  }

  if (
    !nativeCurrency.decimals ||
    !nativeCurrency.name ||
    !nativeCurrency.symbol
  ) {
    throw new Error("Missing Currency Property")
  }

  return {
    chainId: chainId.startsWith("0x") ? String(parseInt(chainId, 16)) : chainId,
    chainName,
    nativeCurrency,
    blockExplorerUrl: blockExplorerUrls[0],
    iconUrl: validatedChainIconUrl(iconUrls),
    rpcUrls,
  }
}

/**
 * Try to fix request params for dapps that are sending requests with flipped params order.
 * For now it only affects eth_call and personal_sign as message and address order is sometimes reversed.
 *
 * @returns JSON RPC request's params - unchanged or flipped
 */
export function parseRPCRequestParams(
  enablingPermission: PermissionRequest,
  method: string,
  params: RPCRequest["params"],
): RPCRequest["params"] {
  switch (method) {
    case "eth_sign":
      return sameEVMAddress(
        params[0] as HexString,
        enablingPermission.accountAddress,
      )
        ? params
        : [params[1], params[0]]

    case "personal_sign":
      return sameEVMAddress(
        params[1] as HexString,
        enablingPermission.accountAddress,
      )
        ? params
        : [params[1], params[0]]

    default:
      return params
  }
}
