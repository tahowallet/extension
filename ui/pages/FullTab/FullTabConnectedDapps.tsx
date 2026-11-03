import React, { ReactElement, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { selectAllowedPages } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../../hooks"
import FullTabSection from "../../components/FullTab/FullTabSection"
import ConnectedWebsitesListItem from "../Settings/ConnectedWebsitesListItem"
import ConnectedWebsitesListEmpty from "../Settings/ConnectedWebsitesListEmpty"

/**
 * The full-tab page listing the dApps the wallet is connected to, with one
 * card per origin. An origin connected on several networks is only listed
 * once.
 */
export default function FullTabConnectedDapps(): ReactElement {
  const { t } = useTranslation()
  const allowedPages = useBackgroundSelector(selectAllowedPages)
  const dappsByOrigin = useMemo(() => {
    const seen = new Set<string>()
    return allowedPages.filter(({ origin }) => {
      if (seen.has(origin)) return false
      seen.add(origin)
      return true
    })
  }, [allowedPages])

  return (
    <FullTabSection title={t("fullTab.nav.connectedDapps")}>
      {dappsByOrigin.length === 0 ? (
        <div className="empty">
          <ConnectedWebsitesListEmpty />
        </div>
      ) : (
        <ul>
          {dappsByOrigin.map((permission) => (
            <li key={permission.origin}>
              <ConnectedWebsitesListItem permission={permission} />
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        li {
          display: block;
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
          padding: 8px 16px;
        }
        /* Each row sits in its own card, so the row's own divider is
           removed. */
        li :global(.container) {
          border-bottom: none;
        }
        .empty {
          max-width: 400px;
        }
      `}</style>
    </FullTabSection>
  )
}
