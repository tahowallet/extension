import React, { ReactElement, useCallback, useEffect, useState } from "react"

import { browser } from "@tallyho/tally-background"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import {
  selectAllowedPages,
  selectCurrentAccount,
} from "@tallyho/tally-background/redux-slices/selectors"
import { denyOrRevokePermission } from "@tallyho/tally-background/redux-slices/dapp-permission"

import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import Snackbar from "../Snackbar/Snackbar"

interface Props {
  children: React.ReactNode
  hasTabBar: boolean
  hasTopBar: boolean
}

export default function CorePage(props: Props): ReactElement {
  const { children, hasTabBar, hasTopBar } = props

  const dispatch = useBackgroundDispatch()

  const [currentPermission, setCurrentPermission] = useState<PermissionRequest>(
    {} as PermissionRequest
  )
  const [isConnectedToDApp, setIsConnectedToDApp] = useState(false)

  const allowedPages = useBackgroundSelector(selectAllowedPages)
  const currentAccount = useBackgroundSelector(selectCurrentAccount)

  const initPermissionAndOrigin = useCallback(async () => {
    const { url, favIconUrl, title } = await browser.tabs
      .query({
        active: true,
        lastFocusedWindow: true,
      })
      .then((tabs) =>
        tabs[0] ? tabs[0] : { url: "", favIconUrl: "", title: "" }
      )

    if (!url) return

    const { origin } = new URL(url)

    const allowPermission = allowedPages[`${origin}_${currentAccount.address}`]

    if (allowPermission) {
      setCurrentPermission(allowPermission)
      setIsConnectedToDApp(true)
    } else {
      setIsConnectedToDApp(false)
    }
  }, [allowedPages, setCurrentPermission, currentAccount])

  useEffect(() => {
    initPermissionAndOrigin()
  }, [initPermissionAndOrigin])

  const deny = useCallback(async () => {
    if (typeof currentPermission !== "undefined") {
      await dispatch(
        denyOrRevokePermission({ ...currentPermission, state: "deny" })
      )
    }
    window.close()
  }, [dispatch, currentPermission])

  return (
    <div className="page">
      {children}
      <Snackbar />
      <style jsx>
        {`
          .page {
            width: 100%;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            margin: 0 auto;
            align-items: center;
            background-color: var(--hunter-green);
            z-index: 10;
            height: ${hasTopBar ? "480px" : "100vh"};
            margin-top: ${hasTopBar ? "0px" : "-64px"};
          }
          .top_menu_wrap {
            z-index: 10;
            cursor: default;
          }
          .community_edition_label {
            width: 140px;
            height: 20px;
            left: 24px;
            position: fixed;
            background-color: var(--gold-60);
            color: var(--hunter-green);
            font-weight: 500;
            text-align: center;
            border-bottom-left-radius: 4px;
            border-bottom-right-radius: 4px;
            font-size: 14px;
            z-index: 1000;
          }
        `}
      </style>
    </div>
  )
}

CorePage.defaultProps = {
  hasTabBar: true,
  hasTopBar: true,
}
