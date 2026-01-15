import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { denyOrRevokePermission } from "@tallyho/tally-background/redux-slices/dapp"
import { RootState } from "@tallyho/tally-background/redux-slices"
import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import TopMenuConnectedDAppInfo from "../TopMenu/TopMenuConnectedDAppInfo"
import SharedTooltip from "../Shared/SharedTooltip"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"

type Props = {
  isConnectedToDApp: boolean
  currentPermission: PermissionRequest | undefined
  allowedPages: PermissionRequest[]
}

export default function ActiveDAppConnection({
  isConnectedToDApp,
  currentPermission,
  allowedPages,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "topMenu" })

  const dispatch = useBackgroundDispatch()

  const connectedNetwork = useBackgroundSelector((state: RootState) =>
    currentPermission?.chainID !== undefined
      ? state.networks.evmNetworks[currentPermission.chainID]
      : undefined,
  )

  const [isActiveDAppConnectionInfoOpen, setIsActiveDAppConnectionInfoOpen] =
    useState(false)

  const deny = useCallback(async () => {
    if (currentPermission !== undefined) {
      // Deletes all permissions corresponding to the currently selected
      // account and origin
      await Promise.all(
        allowedPages.map(async (permission) => {
          if (permission.origin === currentPermission.origin) {
            return dispatch(
              denyOrRevokePermission({ ...permission, state: "deny" }),
            )
          }
          return undefined
        }),
      )
    }
  }, [dispatch, currentPermission, allowedPages])

  return (
    <>
      {isActiveDAppConnectionInfoOpen ? (
        <TopMenuConnectedDAppInfo
          title={currentPermission?.title ?? ""}
          url={currentPermission?.origin ?? ""}
          faviconUrl={currentPermission?.faviconUrl ?? ""}
          network={connectedNetwork}
          close={() => {
            setIsActiveDAppConnectionInfoOpen(false)
          }}
          disconnect={deny}
          isConnected={isConnectedToDApp}
        />
      ) : null}
      <SharedTooltip
        type="dark"
        width={160}
        horizontalShift={160}
        verticalShift={-15}
        verticalPosition="bottom"
        horizontalPosition="left"
        IconComponent={() => (
          <button
            type="button"
            aria-label={t("showCurrentDappConnection")}
            className="connection_button"
            onClick={() => {
              setIsActiveDAppConnectionInfoOpen(!isActiveDAppConnectionInfoOpen)
            }}
          >
            <div className="connection_icon_wrapper">
              <div className="connection_img" />
              {connectedNetwork !== undefined && (
                <div className="network_badge">
                  <SharedNetworkIcon
                    network={connectedNetwork}
                    size={12}
                    hasBackground
                  />
                </div>
              )}
            </div>
          </button>
        )}
      >
        {t("currentDappConnection")}
      </SharedTooltip>

      <style jsx>{`
        .connection_button {
          width: 32px;
          height: 32px;

          border-right: 1px solid var(--green-60);
          height: 17px;
          padding-right: 6px;
        }
        .connection_button:hover .connection_img {
          background-color: var(--success);
        }
        .connection_icon_wrapper {
          position: relative;
          width: 32px;
          height: 32px;
          margin-top: -8px;
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
        .network_badge {
          position: absolute;
          bottom: 2px;
          right: -2px;
        }
      `}</style>
    </>
  )
}
