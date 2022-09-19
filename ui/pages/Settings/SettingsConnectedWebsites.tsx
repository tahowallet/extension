import React, { ReactElement, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { selectAllowedPages } from "@tallyho/tally-background/redux-slices/selectors"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"
import ConnectedWebsitesListItem from "./ConnectedWebsitesListItem"
import { useBackgroundSelector } from "../../hooks"
import ConnectedWebsitesListEmpty from "./ConnectedWebsitesListEmpty"

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
        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
      `}</style>
    </div>
  )
}
