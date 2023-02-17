import React, { ReactElement, useState, useEffect } from "react"
import {
  MemoryRouter as Router,
  Switch,
  Route,
  Redirect,
  matchPath,
} from "react-router-dom"
import { ErrorBoundary } from "react-error-boundary"

import classNames from "classnames"
import {
  setRouteHistoryEntries,
  userActivityEncountered,
} from "@tallyho/tally-background/redux-slices/ui"

import { Store } from "webext-redux"
import { Provider } from "react-redux"
import { TransitionGroup, CSSTransition } from "react-transition-group"
import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"
import { runtime } from "webextension-polyfill"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { popupMonitorPortName } from "@tallyho/tally-background/main"
import {
  getAddressCount,
  selectCurrentAccountSigner,
  selectCurrentAddressNetwork,
  selectKeyringStatus,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectIsTransactionPendingSignature } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { Location } from "history"
import {
  useIsDappPopup,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../hooks"

import setAnimationConditions, {
  animationStyles,
} from "../utils/pageTransition"

import TabBar from "../components/TabBar/TabBar"
import TopMenu from "../components/TopMenu/TopMenu"
import CorePage from "../components/Core/CorePage"
import ErrorFallback from "./ErrorFallback"

import pageList from "../routes/routes"
import GlobalModal from "../components/GlobalModal/GlobalModal"

const pagePreferences = Object.fromEntries(
  pageList.map(({ path, hasTabBar, hasTopBar, persistOnClose }) => [
    path,
    { hasTabBar, hasTopBar, persistOnClose },
  ])
)

function transformLocation(
  inputLocation: Location,
  isTransactionPendingSignature: boolean,
  needsKeyringUnlock: boolean,
  hasAccounts: boolean
): Location {
  // The inputLocation is not populated with the actual query string — even though it should be
  // so I need to grab it from the window
  const params = new URLSearchParams(window.location.search)
  const maybePage = params.get("page")

  let { pathname } = inputLocation
  if (
    hasAccounts &&
    isAllowedQueryParamPage(maybePage) &&
    !inputLocation.pathname.includes("/keyring/")
  ) {
    pathname = maybePage
  }

  if (isTransactionPendingSignature) {
    pathname =
      !isEnabled(FeatureFlags.USE_UPDATED_SIGNING_UI) && needsKeyringUnlock
        ? "/keyring/unlock"
        : "/sign-transaction"
  }

  return {
    ...inputLocation,
    pathname,
  }
}

function useConnectPopupMonitor() {
  useEffect(() => {
    const port = runtime.connect(undefined, { name: popupMonitorPortName })

    return () => {
      port.disconnect()
    }
  }, [])
}

export function Main(): ReactElement {
  const dispatch = useBackgroundDispatch()

  const currentAccount = useBackgroundSelector(selectCurrentAddressNetwork)
  // Emit an event when the popup page is first loaded.
  useEffect(() => {
    /**
     * Marking user activity every time this component is rerendered
     * lets us avoid edge cases where we fail to mark user activity on
     * a given account when a user has the wallet open for longer than
     * the current NETWORK_POLLING_TIMEOUT and is clicking around between
     * tabs / into assets / etc.
     */
    dispatch(userActivityEncountered(currentAccount))
  })

  const isDappPopup = useIsDappPopup()
  const [shouldDisplayDecoy, setShouldDisplayDecoy] = useState(false)
  const [isDirectionRight, setIsDirectionRight] = useState(true)
  const [showTabBar, setShowTabBar] = useState(true)

  const routeHistoryEntries = useBackgroundSelector(
    (state) => state.ui.routeHistoryEntries
  )

  // See comment above call of saveHistoryEntries
  function saveHistoryEntries(routeHistoryEntities: Location[]) {
    const entries = routeHistoryEntities
      .reduce((agg: Partial<Location>[], entity) => {
        const { ...entityCopy } = entity as Partial<Location>
        delete entityCopy.hash
        delete entityCopy.key
        agg.push(entityCopy)
        return agg
      }, [])
      .reverse()

    if (JSON.stringify(routeHistoryEntries) !== JSON.stringify(entries)) {
      dispatch(setRouteHistoryEntries(entries))
    }
  }

  const isTransactionPendingSignature = useBackgroundSelector(
    selectIsTransactionPendingSignature
  )
  const currentAccountSigner = useBackgroundSelector(selectCurrentAccountSigner)
  const keyringStatus = useBackgroundSelector(selectKeyringStatus)
  const hasAccounts = useBackgroundSelector(
    (state) => getAddressCount(state) > 0
  )

  const needsKeyringUnlock =
    isTransactionPendingSignature &&
    currentAccountSigner?.type === "keyring" &&
    keyringStatus !== "unlocked"

  useConnectPopupMonitor()

  return (
    <>
      <div className="top_menu_wrap_decoy">
        <TopMenu />
      </div>
      <GlobalModal id="meet_taho" />
      <Router initialEntries={routeHistoryEntries}>
        <Route
          render={(routeProps) => {
            const transformedLocation = transformLocation(
              routeProps.location,
              isTransactionPendingSignature,
              needsKeyringUnlock,
              hasAccounts
            )

            const normalizedPathname = pagePreferences[
              transformedLocation.pathname
            ]
              ? transformedLocation.pathname
              : "/"

            // `initialEntries` needs to be a reversed version of route history
            // entities. Without avoiding the initial load, entries will keep reversing.
            // Given that restoring our route history is a "POP" `history.action`,
            // by specifying "PUSH" we know that the most recent navigation change is by
            // the user or explicitly added. That said, we can still certainly "POP" via
            // history.goBack(). This case is not yet accounted for.
            if (
              pagePreferences[normalizedPathname]?.persistOnClose === true &&
              routeProps.history.action === "PUSH"
            ) {
              // @ts-expect-error TODO: fix the typing
              saveHistoryEntries(routeProps.history.entries)
            }

            setAnimationConditions(
              routeProps,
              pagePreferences,
              setShouldDisplayDecoy,
              setIsDirectionRight
            )
            setShowTabBar(pagePreferences[normalizedPathname].hasTabBar)

            return (
              <TransitionGroup>
                <CSSTransition
                  timeout={300}
                  classNames="page-transition"
                  key={
                    routeProps.location.pathname.includes("onboarding") ||
                    routeProps.location.pathname.includes("keyring")
                      ? ""
                      : transformedLocation.key
                  }
                >
                  <div>
                    <div
                      className={classNames("top_menu_wrap", {
                        anti_animation: shouldDisplayDecoy,
                        hide: !pagePreferences[normalizedPathname].hasTopBar,
                      })}
                    >
                      <TopMenu />
                    </div>
                    <Switch location={transformedLocation}>
                      {
                        // If there are no existing accounts, display onboarding
                        // (if we're not there already)
                        //
                        !isEnabled(FeatureFlags.SUPPORT_TABBED_ONBOARDING) &&
                          !hasAccounts &&
                          !matchPath(transformedLocation.pathname, {
                            path: [
                              "/onboarding",
                              // need to unlock or set new password to import an account
                              "/keyring",
                              // this route has it's own error message
                              "/dapp-permission",
                            ],
                            exact: false,
                          }) && <Redirect to="/onboarding/info-intro" />
                      }
                      {pageList.map(
                        ({ path, Component, hasTopBar, hasTabBar }) => {
                          return (
                            <Route path={path} key={path}>
                              <CorePage
                                hasTopBar={hasTopBar}
                                hasTabBar={hasTabBar}
                              >
                                <ErrorBoundary
                                  FallbackComponent={ErrorFallback}
                                >
                                  <Component location={transformedLocation} />
                                </ErrorBoundary>
                              </CorePage>
                            </Route>
                          )
                        }
                      )}
                    </Switch>
                  </div>
                </CSSTransition>
              </TransitionGroup>
            )
          }}
        />
        {showTabBar && (
          <div className="tab_bar_wrap">
            <TabBar />
          </div>
        )}
      </Router>
      <>
        <style jsx global>
          {`
            ::-webkit-scrollbar {
              width: 0px;
              background: transparent;
            }

            ${animationStyles(shouldDisplayDecoy, isDirectionRight)}
            .tab_bar_wrap {
              position: fixed;
              bottom: 0px;
              width: 100%;
            }
            .top_menu_wrap {
              margin: 0 auto;
              width: max-content;
              display: block;
              justify-content: center;
              z-index: 0;
              margin-top: 5px;
            }
            .hide {
              opacity: 0;
            }
          `}
        </style>
      </>
      {isDappPopup && (
        <style jsx global>
          {`
            body {
              height: 100%;
            }
          `}
        </style>
      )}
    </>
  )
}

export default function Popup({ store }: { store: Store }): ReactElement {
  return (
    <Provider store={store}>
      <Main />
    </Provider>
  )
}
