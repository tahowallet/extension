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
  dapp: {
    allowed: PermissionMap
  }
}

export default (prevState: Record<string, unknown>): NewState => {
  // Migrate the by-origin-and-address-keyed permission data in the dapp slice to be
  // a nested map of evm => chainId => address => origin.

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

      // We've made the product decision to copy Ethereum permissions to polygon as part of the
      // multi-chain feature so we do that below.

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
    dapp: {
      ...restOfOldDappPermission,
      allowed,
    },
  }

  const { dappPermission: __, ...restOfPrevState } = prevState

  return {
    ...restOfPrevState,
    ...newDappPermissionsState,
  }
}
