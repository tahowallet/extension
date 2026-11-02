import React, { ReactElement, ReactNode, useEffect, useRef } from "react"
import {
  Redirect,
  Route,
  Switch,
  matchPath,
  useHistory,
  useLocation,
} from "react-router-dom"
import { CSSTransition, TransitionGroup } from "react-transition-group"
import { ErrorBoundary } from "react-error-boundary"
import {
  getAddressCount,
  selectCurrentAccount,
  selectCurrentAddressNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectIsTransactionPendingSignature } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { userActivityEncountered } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import pageList from "../../routes/routes"
import ErrorFallback from "../ErrorFallback"
import FullTabNav from "../../components/FullTab/FullTabNav"
import FullTabEmbeddedPage from "../../components/FullTab/FullTabEmbeddedPage"
import { accountPath } from "../../components/FullTab/hooks"
import CorePage from "../../components/Core/CorePage"
import AccountsNotificationPanelAccounts from "../../components/AccountsNotificationPanel/AccountsNotificationPanelAccounts"
import FullTabPortfolio from "./FullTabPortfolio"
import FullTabConnectedDapps from "./FullTabConnectedDapps"
import FullTabAccount from "./FullTabAccount"
import FullTabUnverifiedAssets from "./FullTabUnverifiedAssets"
import FullTabSettings from "./FullTabSettings"

/**
 * Paths of popup pages that the full-tab view doesn't embed, either because
 * it has its own wide sections in their place (portfolio and settings) or
 * because they only make sense as the popup's landing page (`/`).
 */
const REPLACED_POPUP_PATHS = new Set(["/", "/portfolio", "/settings"])

const embeddedPages = pageList.filter(
  ({ path }) => !REPLACED_POPUP_PATHS.has(path),
)

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

/**
 * Wraps a section in the transition that plays as it enters or leaves the
 * content area. The transition is skipped for users who prefer reduced
 * motion.
 */
function SectionTransition({
  children,
  ...transitionProps
}: {
  children: ReactNode
  in?: boolean
  onExited?: () => void
}): ReactElement {
  const nodeRef = useRef<HTMLDivElement>(null)

  return (
    <CSSTransition
      {...transitionProps}
      nodeRef={nodeRef}
      timeout={prefersReducedMotion() ? 0 : 320}
      classNames="section_transition"
    >
      <div className="section_scroller" ref={nodeRef}>
        {children}
      </div>
    </CSSTransition>
  )
}

/**
 * Returns the transition key for the section a path belongs to. Moving
 * between sections changes the key and so plays a section transition, while
 * moving within one section (for example between an account's assets,
 * activity and NFTs views) keeps the same key and doesn't.
 */
function sectionKey(pathname: string): string {
  const unverified = matchPath<{ address: string; chainID: string }>(pathname, {
    path: "/accounts/:address/:chainID/unverified",
  })
  if (unverified) return unverified.url
  const account = matchPath(pathname, { path: "/accounts/:address" })
  if (account) return account.url
  return pathname
}

/**
 * The root of the full-tab view of the wallet, which shows a left nav beside
 * a wide content area. Sections the full-tab view has its own pages for are
 * rendered wide, while other popup pages are embedded at popup size.
 *
 * If the wallet has no accounts yet, redirects to onboarding. While a
 * transaction is pending signature, the signing page is shown in place of the
 * current location.
 */
export default function FullTabRoot(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const location = useLocation()
  const history = useHistory()
  const hasAccounts = useBackgroundSelector(
    (state) => getAddressCount(state) > 0,
  )
  const currentAccount = useBackgroundSelector(selectCurrentAccount)
  const currentAddressNetwork = useBackgroundSelector(
    selectCurrentAddressNetwork,
  )
  const isTransactionPendingSignature = useBackgroundSelector(
    selectIsTransactionPendingSignature,
  )

  // Keep balances fresh while the tab is in use, as the popup does.
  useEffect(() => {
    void dispatch(userActivityEncountered(currentAddressNetwork))
  })

  if (!hasAccounts) {
    return <Redirect to="/onboarding" />
  }

  const effectiveLocation = isTransactionPendingSignature
    ? { ...location, pathname: "/sign-transaction" }
    : location

  return (
    <div className="full_tab">
      <FullTabNav />
      <main>
        <TransitionGroup component={null}>
          <SectionTransition key={sectionKey(effectiveLocation.pathname)}>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Switch location={effectiveLocation}>
                <Route path="/portfolio">
                  <FullTabPortfolio />
                </Route>
                <Route path="/dapps">
                  <FullTabConnectedDapps />
                </Route>
                <Route path="/accounts/:address/:chainID/unverified">
                  <FullTabUnverifiedAssets />
                </Route>
                <Route path="/accounts/:address/:view(assets|nfts|activity)?">
                  <FullTabAccount />
                </Route>
                <Route path="/settings/general">
                  <FullTabSettings group="general" />
                </Route>
                <Route path="/settings/networks-assets">
                  <FullTabSettings group="walletOptions" />
                </Route>
                <Route path="/settings" exact>
                  <Redirect to="/settings/general" />
                </Route>
                <Route path="/manage-accounts">
                  <FullTabEmbeddedPage>
                    <CorePage>
                      <AccountsNotificationPanelAccounts
                        onCurrentAddressChange={(address) =>
                          history.push(accountPath(address))
                        }
                      />
                    </CorePage>
                  </FullTabEmbeddedPage>
                </Route>
                <Route path="/wallet">
                  <Redirect to={accountPath(currentAccount.address)} />
                </Route>
                {embeddedPages.map(({ path, Component }) => (
                  <Route path={path} key={path}>
                    <FullTabEmbeddedPage>
                      <Component location={effectiveLocation} />
                    </FullTabEmbeddedPage>
                  </Route>
                ))}
                <Route>
                  <Redirect to="/portfolio" />
                </Route>
              </Switch>
            </ErrorBoundary>
          </SectionTransition>
        </TransitionGroup>
      </main>
      <style jsx>{`
        .full_tab {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        main {
          flex: 1;
          min-width: 0;
          display: grid;
          overflow: hidden;
        }
        main > :global(.section_scroller) {
          grid-area: 1 / 1;
          min-height: 0;
          overflow-y: auto;
        }
        main > :global(.section_transition-enter) {
          opacity: 0;
          transform: translateY(12px);
        }
        main > :global(.section_transition-enter-active) {
          opacity: 1;
          transform: none;
          transition:
            opacity 0.32s ease,
            transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        main > :global(.section_transition-exit) {
          opacity: 1;
        }
        main > :global(.section_transition-exit-active) {
          opacity: 0;
          transform: translateY(-6px);
          transition:
            opacity 0.18s ease,
            transform 0.18s ease;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
