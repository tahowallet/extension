import React, { ReactElement, useCallback, useEffect, useState } from "react"
import {
  selectCurrentPendingPermission,
  selectCurrentAccountTotal,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  denyOrRevokePermission,
  grantPermission,
} from "@tallyho/tally-background/redux-slices/dapp"

import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import DAppConnectPage from "./DAppConnect/DAppConnectPage"
import SwitchWalletPage from "./DAppConnect/SwitchWalletPage"

export default function DAppConnectRequest(): ReactElement {
  const dispatch = useBackgroundDispatch()

  const currentAccountTotal = useBackgroundSelector(selectCurrentAccountTotal)
  const permission = useBackgroundSelector(selectCurrentPendingPermission)

  const [showSwitchWallet, setShowSwitchWallet] = useState(false)

  useEffect(() => {
    window.onbeforeunload = () => {
      if (typeof permission !== "undefined") {
        dispatch(
          denyOrRevokePermission({
            ...permission,
            state: "deny",
          })
        )
      }
    }
  }, [dispatch, permission])

  const grant = useCallback(async () => {
    if (typeof permission !== "undefined") {
      dispatch(
        grantPermission({
          ...permission,
          state: "allow",
        })
      )
    }
    window.onbeforeunload = null
    window.close()
  }, [dispatch, permission])

  const deny = useCallback(async () => {
    // The denyOrRevokePermission will be dispatched in the onbeforeunload effect
    window.close()
  }, [])

  if (
    typeof permission === "undefined" ||
    typeof currentAccountTotal === "undefined" ||
    normalizeEVMAddress(permission.accountAddress) !==
      normalizeEVMAddress(currentAccountTotal?.address)
  ) {
    // FIXME What do we do if we end up in a weird state here? Dismiss the
    // FIXME popover? Show an error?
    return (
      <div>
        You do not seem to have an account, which is sad for a wallet :(
      </div>
    )
  }

  return (
    <div className="page">
      {showSwitchWallet ? (
        <SwitchWalletPage close={deny} />
      ) : (
        <DAppConnectPage
          permission={permission}
          currentAccountTotal={currentAccountTotal}
          switchWallet={() => setShowSwitchWallet(true)}
          denyPermission={deny}
          grantPermission={grant}
        />
      )}
      <style jsx>{`
        .page {
          background-color: var(--green-95);
          height: 100vh;
          width: 100vw;
          z-index: 1000;
        }
      `}</style>
      <style jsx global>{`
        body {
          background-color: var(--green-95);
        }
      `}</style>
    </div>
  )
}
