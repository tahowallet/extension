// This migration transitions the by-address-keyed account data in the
// accounts slice to be keyed by account AND network chainID, as well as nested
// under an `evm` key.

import { POLYGON } from "../../constants"

type PermissionRequest = {
  key: string
  origin: string
  faviconUrl: string
  chainID: string
  title: string
  state: "request" | "allow" | "deny"
  accountAddress: string
}

type PermissionMap = {
  evm: {
    [chainID: string]: {
      [address: string]: {
        [origin: string]: PermissionRequest
      }
    }
  }
}

type OldState = {
  dappPermission: {
    allowedPages: { [origin_accountAddress_chainId: string]: PermissionRequest }
  }
}

type NewState = {
  dappPermission: {
    allowed: PermissionMap
  }
}

export default (prevState: Record<string, unknown>): NewState => {
  // Migrate the by-address-keyed account data in the accounts slice to be
  // keyed by account AND network chainID, as well as nested under an `evm`
  // key.

  const oldDappPermissionsState = prevState as OldState

  const allowed: PermissionMap = { evm: {} }

  Object.values(oldDappPermissionsState.dappPermission.allowedPages).forEach(
    (permission) => {
      // Ethereum Permissions
      allowed.evm[permission.chainID] ??= {}
      allowed.evm[permission.chainID][permission.accountAddress] ??= {}
      allowed.evm[permission.chainID][permission.accountAddress][
        permission.origin
      ] ??= permission

      // Polygon Permissions
      allowed.evm[POLYGON.chainID] ??= {}
      allowed.evm[POLYGON.chainID][permission.accountAddress] ??= {}
      allowed.evm[POLYGON.chainID][permission.accountAddress][
        permission.origin
      ] ??= permission
    }
  )

  const { allowedPages: _, ...restOfOldDappPermission } =
    oldDappPermissionsState.dappPermission

  const newDappPermissionsState: NewState = {
    dappPermission: {
      ...restOfOldDappPermission,
      allowed,
    },
  }

  return {
    ...prevState,
    ...newDappPermissionsState,
  }
}
