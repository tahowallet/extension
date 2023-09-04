import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { selectAllowedPages } from "@tallyho/tally-background/redux-slices/selectors"
import { browser } from "@tallyho/tally-background"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useBackgroundSelector } from "../../hooks"
import ActiveDAppConnection from "./ActiveDAppConnection"
import DAppConnectionDefaultToggle from "./DAppConnectionDefaultToggle"

export default function DAppConnection(): ReactElement {
  const [isConnectedToDApp, setIsConnectedToDApp] = useState(false)
  const [currentPermission, setCurrentPermission] = useState<
    PermissionRequest | undefined
  >(undefined)

  const allowedPages = useBackgroundSelector(selectAllowedPages)

  const initPermissionAndOrigin = useCallback(async () => {
    const { url } = await browser.tabs
      .query({
        active: true,
        lastFocusedWindow: true,
      })
      .then((tabs) =>
        tabs[0] ? tabs[0] : { url: "", favIconUrl: "", title: "" },
      )
    if (!url) return

    const { origin } = new URL(url)

    const allowPermission = allowedPages.find(
      (permission) => permission.origin === origin,
    )

    if (allowPermission) {
      setCurrentPermission(allowPermission)
      setIsConnectedToDApp(true)
    } else {
      setIsConnectedToDApp(false)
    }
  }, [allowedPages, setCurrentPermission])

  useEffect(() => {
    initPermissionAndOrigin()
  }, [initPermissionAndOrigin])

  return (
    <section>
      <ActiveDAppConnection
        isConnectedToDApp={isConnectedToDApp}
        currentPermission={currentPermission}
        allowedPages={allowedPages}
      />

      <DAppConnectionDefaultToggle />
      <style jsx>{`
        section {
          background-color: var(--green-120);
          padding: 10px 16px 10px 4px;

          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>
    </section>
  )
}
