import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { denyOrRevokePermission } from "@tallyho/tally-background/redux-slices/dapp"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { useCallback } from "react"
import { useTranslation } from "react-i18next"
import SharedIcon from "../../components/Shared/SharedIcon"
import { useBackgroundDispatch } from "../../hooks"

type ConnectedWebsitesListItemProps = {
  permission: PermissionRequest
}

export default function ConnectedWebsitesListItem(
  props: ConnectedWebsitesListItemProps
): React.ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "settings" })

  const { permission } = props
  const { origin, title, faviconUrl } = permission

  const icon =
    faviconUrl === "" ? "./images/dapp_favicon_default@2x.png" : faviconUrl

  const { host } = new URL(origin)

  const dispatch = useBackgroundDispatch()

  const handleDisconnect = useCallback(() => {
    dispatch(denyOrRevokePermission({ ...permission, state: "deny" }))

    dispatch(setSnackbarMessage(t("connectedWebsitesSettings.disconnected")))
  }, [dispatch, permission, t])

  return (
    <div className="container">
      <div className="connected-website-item">
        <img className="logo" src={icon} width={32} alt={title} />
        <div className="connected-website-details">
          <span className="title">{title}</span>
          <span className="host">{host}</span>
        </div>
        <SharedIcon
          color="var(--green-40)"
          hoverColor="var(--error)"
          width={24}
          icon="icons/m/disconnect.svg"
          onClick={handleDisconnect}
        />
      </div>
      <style jsx>{`
        .container {
          padding: 16px 0;
          border-bottom: 1px solid var(--green-95);
          width: 100%;
        }

        .connected-website-item {
          display: flex;
          flex-direction: row;
          align-items: center;
        }

        .logo {
          margin-right: 16px;
        }

        .connected-website-details {
          display: flex;
          flex-direction: column;
          margin-right: auto;
          line-height: 1.5;
        }

        .title {
          display: block;
          font-size: 16px;
          font-weight: 500;
        }

        .host {
          display: block;
          color: var(--green-40);
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
