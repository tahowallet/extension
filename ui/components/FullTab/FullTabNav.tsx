import React, { ReactElement } from "react"
import { Link, NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import FullTabHelpMenu from "./FullTabHelpMenu"
import FullTabAccountGroups from "./FullTabAccountGroups"

function NavItem({
  to,
  icon,
  children,
}: {
  to: string
  icon?: string
  children: React.ReactNode
}): ReactElement {
  return (
    <NavLink to={to} className="nav_item" activeClassName="active">
      {icon && (
        <span
          className="nav_icon"
          style={{ maskImage: `url("./images/${icon}")` }}
        />
      )}
      {children}
    </NavLink>
  )
}

/**
 * Renders the full-tab view's left navigation, which links to the portfolio,
 * connected dApps, each of the wallet's accounts, and settings, with the help
 * menu at the bottom.
 */
export default function FullTabNav(): ReactElement {
  const { t } = useTranslation()

  return (
    <nav aria-label="Main">
      <div className="logo">
        <img src="./images/doggo_gold.svg" alt="" width={36} height={36} />
        <span className="wordmark">Taho</span>
      </div>
      <div className="scroll">
        <div className="group">
          <NavItem to="/portfolio" icon="portfolio.svg">
            {t("tabs.portfolio")}
          </NavItem>
          <NavItem to="/dapps" icon="icons/m/connected.svg">
            {t("settings.connectedWebsites")}
          </NavItem>
        </div>
        <div className="group">
          <div className="group_header">
            <h3>{t("overview.accounts")}</h3>
            <Link className="manage" to="/manage-accounts">
              {t("fullTab.nav.manageAccounts")}
            </Link>
          </div>
          <FullTabAccountGroups />
        </div>
        <div className="group">
          <h3>{t("settings.mainMenu")}</h3>
          <NavItem to="/settings/general" icon="settings.svg">
            {t("settings.group.general")}
          </NavItem>
          <NavItem to="/settings/networks-assets" icon="icons/m/list.svg">
            {t("settings.group.walletOptions")}
          </NavItem>
        </div>
      </div>
      <div className="footer">
        <FullTabHelpMenu />
      </div>
      <style jsx>{`
        nav {
          width: 280px;
          flex-shrink: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--green-120);
          border-right: 1px solid var(--green-95);
          box-sizing: border-box;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 24px 24px 16px;
        }
        .wordmark {
          font-family: "Quincy CF", serif;
          font-size: 28px;
          color: var(--green-20);
        }
        .scroll {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }
        .group {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 20px;
        }
        h3 {
          margin: 0;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--green-60);
        }
        .group_header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-right: 12px;
        }
        .group_header :global(.manage) {
          font-size: 12px;
          font-weight: 600;
          color: var(--green-40);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .group_header :global(.manage:hover) {
          color: var(--trophy-gold);
        }
        .group :global(.nav_item) {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          height: 40px;
          padding: 0 12px;
          border-radius: 8px;
          color: var(--green-40);
          font-size: 16px;
          font-weight: 500;
          white-space: nowrap;
          text-decoration: none;
          transition:
            background-color 0.2s ease,
            color 0.2s ease;
        }
        .group :global(.nav_item::before) {
          content: "";
          position: absolute;
          left: -12px;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--trophy-gold);
          transform: scaleY(0);
          transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .group :global(.nav_item:hover) {
          background: var(--green-95);
          color: var(--green-20);
        }
        .group :global(.nav_item.active) {
          background: var(--green-95);
          color: var(--trophy-gold);
        }
        .group :global(.nav_item.active::before) {
          transform: scaleY(1);
        }
        .group :global(.nav_icon) {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          mask-size: cover;
          background-color: currentColor;
        }
        .group :global(.account_name) {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .group :global(.account_total) {
          font-size: 14px;
          color: var(--green-60);
          font-variant-numeric: tabular-nums;
        }
        .footer {
          padding: 16px 24px 24px;
        }
        @media (max-width: 1180px) {
          nav {
            width: 232px;
          }
        }
      `}</style>
    </nav>
  )
}
