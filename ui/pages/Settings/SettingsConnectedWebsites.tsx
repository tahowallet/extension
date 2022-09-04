import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { denyOrRevokePermission } from "@tallyho/tally-background/redux-slices/dapp"
import { selectAllowedPages } from "@tallyho/tally-background/redux-slices/selectors"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import SharedIcon from "../../components/Shared/SharedIcon"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

type ConnectedWebsiteItemProps = {
  permission: PermissionRequest
}

const ConnectedWebsiteItem = (
  props: ConnectedWebsiteItemProps
): React.ReactElement => {
  const { t } = useTranslation("translation", { keyPrefix: "settings" })

  const { permission } = props
  const { origin, title, faviconUrl: icon } = permission

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
          color="var(--error)"
          width={32}
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

export default function SettingsConnectedWebsites(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "settings" })
  const allowedPages = useBackgroundSelector(selectAllowedPages)
  const dappsByOrigin = useMemo(() => {
    const seen = new Set()

    return allowedPages.filter((permission) => {
      if (seen.has(permission.origin)) return false

      seen.add(permission.origin)

      return true
    })
  }, [allowedPages])

  return (
    <div className="standard_width_padded wrapper">
      <SharedPageHeader withoutBackText>
        {t(`connectedWebsitesSettings.title`)}
      </SharedPageHeader>
      <section>
        <ul>
          {dappsByOrigin.map((permission) => (
            <li key={permission.origin}>
              <ConnectedWebsiteItem permission={permission} />
            </li>
          ))}
        </ul>
      </section>
      <style jsx>{`
        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
      `}</style>
    </div>
  )
}
