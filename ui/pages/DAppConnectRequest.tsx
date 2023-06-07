import React, { ReactElement, useCallback, useEffect, useState } from "react"
import {
  selectCurrentPendingPermission,
  selectCurrentAccountTotal,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  denyOrRevokePermission,
  grantPermission,
} from "@tallyho/tally-background/redux-slices/dapp"

import { Redirect } from "react-router-dom"
import { FeatureFlags, isDisabled } from "@tallyho/tally-background/features"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import DAppConnectPage from "./DAppConnect/DAppConnectPage"
import SwitchWalletPage from "./DAppConnect/SwitchWalletPage"
import ErrorFallback from "./ErrorFallback"

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
    if (
      typeof permission !== "undefined" &&
      typeof currentAccountTotal !== "undefined"
    ) {
      dispatch(
        grantPermission({
          ...permission,
          accountAddress: currentAccountTotal.address, // make sure address is matching current account
          state: "allow",
        })
      )
    }
    window.onbeforeunload = null
    window.close()
  }, [dispatch, permission, currentAccountTotal])

  const deny = useCallback(async () => {
    // The denyOrRevokePermission will be dispatched in the onbeforeunload effect
    window.close()
  }, [])

  if (typeof permission === "undefined") {
    // something went wrong with permisison request
    return <ErrorFallback />
  }

  if (typeof currentAccountTotal === "undefined") {
    // there is no account, let's onbaord first
    return <Redirect to="/onboarding/info-intro" />
  }

  return (
    <div className="page">
      {showSwitchWallet &&
      isDisabled(FeatureFlags.ENABLE_UPDATED_DAPP_CONNECTIONS) ? (
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
