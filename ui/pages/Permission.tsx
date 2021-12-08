import { selectPendingPermissionRequests } from "@tallyho/tally-background/redux-slices/selectors/providerBridgeSelectors"
import React, { ReactElement, useCallback } from "react"
import {
  permissionDenyOrRevoke,
  permissionGrant,
  PermissionRequest,
} from "@tallyho/tally-background/redux-slices/provider-bridge"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"

function PermissionRow({ permission }: { permission: PermissionRequest }) {
  const dispatch = useBackgroundDispatch()

  const grant = useCallback(async () => {
    await dispatch(permissionGrant({ ...permission, state: "allow" }))
    window.close()
  }, [dispatch, permission])

  const deny = useCallback(async () => {
    await dispatch(permissionDenyOrRevoke({ ...permission, state: "deny" }))
    window.close()
  }, [dispatch, permission])

  return (
    <li>
      <div>{permission.favIconUrl}</div>
      <div>{permission.url}</div>
      <button type="button" onClick={grant}>
        Grant permission
      </button>
      <button type="button" onClick={deny}>
        Deny permission
      </button>
    </li>
  )
}

export default function Permission(): ReactElement {
  const pendingPermissions = useBackgroundSelector(
    selectPendingPermissionRequests
  )

  return (
    <section>
      <ul>
        {pendingPermissions.map((permission) => (
          <PermissionRow permission={permission} />
        ))}
      </ul>
    </section>
  )
}
