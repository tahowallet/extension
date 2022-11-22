import React, { ReactElement, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { selectAllowedPages } from "@tallyho/tally-background/redux-slices/selectors"
import ConnectedWebsitesListItem from "./ConnectedWebsitesListItem"
import { useBackgroundSelector } from "../../hooks"
import ConnectedWebsitesListEmpty from "./ConnectedWebsitesListEmpty"
import SettingsPage from "./SettingsPage"

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
    <SettingsPage title={t(`connectedWebsitesSettings.title`)}>
      <section>
        {dappsByOrigin.length === 0 ? (
          <ConnectedWebsitesListEmpty />
        ) : (
          <ul>
            {dappsByOrigin.map((permission) => (
              <li key={permission.origin}>
                <ConnectedWebsitesListItem permission={permission} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <style jsx>{`
        section {
          align-self: center;
        }
      `}</style>
    </SettingsPage>
  )
}
