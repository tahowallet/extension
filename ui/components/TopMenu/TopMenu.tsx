import React, { ReactElement, useState, useEffect, useCallback } from "react"
import { browser } from "@tallyho/tally-background"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { selectAllowedPages } from "@tallyho/tally-background/redux-slices/selectors"
import {
  FeatureFlags,
  isDisabled,
  isEnabled,
} from "@tallyho/tally-background/features"
import { denyOrRevokePermission } from "@tallyho/tally-background/redux-slices/dapp"
import { useTranslation } from "react-i18next"
import { setSelectedNetwork } from "@tallyho/tally-background/redux-slices/ui"
import TopMenuProtocolSwitcher from "./TopMenuProtocolSwitcher"
import TopMenuProfileButton from "./TopMenuProfileButton"

import BonusProgramModal from "../BonusProgram/BonusProgramModal"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import TopMenuConnectedDAppInfo from "./TopMenuConnectedDAppInfo"
import TopMenuProtocolList from "./TopMenuProtocolList"

import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import DAppConnection from "../DAppConnection/DAppConnection"
import AccountsNotificationPanel from "../AccountsNotificationPanel/AccountsNotificationPanel"

export default function TopMenu(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "topMenu" })

  const [isProtocolListOpen, setIsProtocolListOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isBonusProgramOpen, setIsBonusProgramOpen] = useState(false)

  const [isActiveDAppConnectionInfoOpen, setIsActiveDAppConnectionInfoOpen] =
    useState(false)

  const dispatch = useBackgroundDispatch()

  const [currentPermission, setCurrentPermission] = useState<PermissionRequest>(
    {} as PermissionRequest
  )
  const [isConnectedToDApp, setIsConnectedToDApp] = useState(false)
  const allowedPages = useBackgroundSelector((state) =>
    selectAllowedPages(state)
  )

  const initPermissionAndOrigin = useCallback(async () => {
    const { url } = await browser.tabs
      .query({
        active: true,
        lastFocusedWindow: true,
      })
      .then((tabs) =>
        tabs[0] ? tabs[0] : { url: "", favIconUrl: "", title: "" }
      )
    if (!url) return

    const { origin } = new URL(url)

    const allowPermission = allowedPages.find(
      (permission) => permission.origin === origin
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

  const deny = useCallback(async () => {
    if (typeof currentPermission !== "undefined") {
      // Deletes all permissions corresponding to the currently selected
      // account and origin
      await Promise.all(
        allowedPages.map(async (permission) => {
          if (permission.origin === currentPermission.origin) {
            return dispatch(
              denyOrRevokePermission({ ...permission, state: "deny" })
            )
          }
          return undefined
        })
      )
    }
  }, [dispatch, currentPermission, allowedPages])

  return (
    <>
      {isDisabled(FeatureFlags.ENABLE_UPDATED_DAPP_CONNECTIONS) &&
      isActiveDAppConnectionInfoOpen ? (
        <TopMenuConnectedDAppInfo
          title={currentPermission.title}
          url={currentPermission.origin}
          faviconUrl={currentPermission.faviconUrl}
          close={() => {
            setIsActiveDAppConnectionInfoOpen(false)
          }}
          disconnect={deny}
          isConnected={isConnectedToDApp}
        />
      ) : null}
      <BonusProgramModal
        isOpen={isBonusProgramOpen}
        onClose={() => {
          setIsBonusProgramOpen(false)
        }}
      />
      <SharedSlideUpMenu
        isOpen={isProtocolListOpen}
        isScrollable
        customStyles={{ display: "flex", flexDirection: "column" }}
        close={() => {
          setIsProtocolListOpen(false)
        }}
      >
        <TopMenuProtocolList
          onProtocolChange={(network) => {
            dispatch(setSelectedNetwork(network))
            setIsProtocolListOpen(false)
          }}
        />
      </SharedSlideUpMenu>
      <AccountsNotificationPanel
        isOpen={isNotificationsOpen}
        close={() => setIsNotificationsOpen(false)}
      />
      {isEnabled(FeatureFlags.ENABLE_UPDATED_DAPP_CONNECTIONS) && (
        <DAppConnection />
      )}
      <nav>
        <TopMenuProtocolSwitcher onClick={() => setIsProtocolListOpen(true)} />
        <div className="profile_group">
          {isDisabled(FeatureFlags.ENABLE_UPDATED_DAPP_CONNECTIONS) && (
            <button
              type="button"
              aria-label={t("showCurrentDappConnection")}
              className="connection_button"
              onClick={() => {
                setIsActiveDAppConnectionInfoOpen(
                  !isActiveDAppConnectionInfoOpen
                )
              }}
            >
              {isEnabled(FeatureFlags.SUPPORT_WALLET_CONNECT) &&
              isConnectedToDApp ? (
                <div className="connected-wc" />
              ) : (
                <div className="connection_img" />
              )}
            </button>
          )}
          {isDisabled(FeatureFlags.HIDE_TOKEN_FEATURES) && (
            <button
              type="button"
              aria-label={t("rewardsProgram")}
              className="gift_button"
              onClick={() => {
                setIsBonusProgramOpen(!isBonusProgramOpen)
              }}
            />
          )}
          <TopMenuProfileButton
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen)
            }}
          />
        </div>
      </nav>

      <style jsx>
        {`
          nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;

            padding: 0 16px 0 13px;
          }
          .profile_group {
            display: flex;
            align-items: center;
            min-width: 0; // Allow the account address/name to collapse to an ellipsis.
          }
          button {
            border-radius: 12px;
            border: solid 3px var(--hunter-green);
            width: 32px;
            height: 32px;
            margin-right: 2px;
          }
          button:hover {
            background-color: var(--green-80);
          }
          .connection_button:hover .connection_img {
            background-color: var(--success);
          }
          .connection_button {
            width: 32px;
            height: 32px;
          }
          .connection_img {
            mask-image: url("./images/bolt@2x.png");
            mask-repeat: no-repeat;
            mask-position: center;
            mask-size: cover;
            mask-size: 35%;
            width: 32px;
            height: 32px;
            background-color: var(
              --${isConnectedToDApp ? "success" : "green-20"}
            );
          }
          .connected-wc {
            background: url("./images/connected-wc.svg") center / 24px no-repeat;
            width: 32px;
            height: 32px;
          }
          .gift_button {
            background: url("./images/gift@2x.png") center no-repeat;
            background-size: 24px 24px;
          }
        `}
      </style>
    </>
  )
}
