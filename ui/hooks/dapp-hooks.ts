import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { useCallback, useEffect, useState } from "react"
import { browser } from "@tallyho/tally-background"
import { selectAllowedPages } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "./redux-hooks"

// oxlint-disable-next-line import/prefer-default-export
export function useDappPermission(): {
  isConnected: boolean
  currentPermission: PermissionRequest | undefined
  allowedPages: PermissionRequest[]
} {
  const [isConnected, setisConnected] = useState(false)
  const [currentPermission, setCurrentPermission] = useState<
    PermissionRequest | undefined
  >(undefined)

  const allowedPages = useBackgroundSelector(selectAllowedPages)

  const initPermissionAndOrigin = useCallback(async () => {
    const { url } = await browser.tabs
      .query({
        active: true,
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
      setisConnected(true)
    } else {
      setisConnected(false)
    }
  }, [allowedPages, setCurrentPermission])

  useEffect(() => {
    initPermissionAndOrigin()
  }, [initPermissionAndOrigin])

  return {
    isConnected,
    currentPermission,
    allowedPages,
  }
}
