import React, { ReactElement, useEffect } from "react"
import {
  MemoryRouter as Router,
  Switch,
  Route,
  Redirect,
  matchPath,
} from "react-router-dom"
import { ErrorBoundary } from "react-error-boundary"

import { Location as RouterLocation } from "history"
import {
  setRouteHistoryEntries,
  userActivityEncountered,
  Location,
} from "@tallyho/tally-background/redux-slices/ui"

import { Store } from "webext-redux"
import { Provider } from "react-redux"
import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"
import { runtime } from "webextension-polyfill"
import { popupMonitorPortName } from "@tallyho/tally-background/main"
import {
  getAddressCount,
  selectCurrentAddressNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectIsTransactionPendingSignature } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { TransitionGroup, CSSTransition } from "react-transition-group"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import {
  useIsDappPopup,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../hooks"

import ErrorFallback from "./ErrorFallback"

import pageList from "../routes/routes"
import getAnimationDirection from "../utils/pageTransition"

const pagePreferences = Object.fromEntries(
  pageList.map(({ path, hasTabBar, hasTopBar, persistOnClose }) => [
    path,
    { hasTabBar, hasTopBar, persistOnClose },
  ])
)

function transformLocation(
  inputLocation: RouterLocation,
  isTransactionPendingSignature: boolean,
  hasAccounts: boolean
): RouterLocation {
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
    pathname = "/sign-transaction"
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
    dispatch(userActivityEncountered(currentAccount))
    // We explicitly do not want to reload on dependency change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isDappPopup = useIsDappPopup()

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
  const hasAccounts = useBackgroundSelector(
    (state) => getAddressCount(state) > 0
  )

  useConnectPopupMonitor()

  return (
    <>
      <Router initialEntries={routeHistoryEntries}>
        <Route
          render={(routeProps) => {
            const transformedLocation = transformLocation(
              routeProps.location,
              isTransactionPendingSignature,
              hasAccounts
            )

            const normalizedPathname =
              transformedLocation.pathname in pagePreferences
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
              saveHistoryEntries(
                // WARNING: `entries` is not exported by our known types; it is
                // an internal implementation detail of *memory* history that
                // we are relying on here.
                (routeProps.history as unknown as { entries: RouterLocation[] })
                  .entries
              )
            }

            const animationDirection = getAnimationDirection(routeProps)

            return (
              <>
                <TransitionGroup component={null}>
                  <CSSTransition
                    timeout={150}
                    classNames={`page-transition-${animationDirection}`}
                    key={transformedLocation.key}
                  >
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
                      {pageList.map(({ path, Component }) => {
                        return (
                          <Route path={path} key={path}>
                            <ErrorBoundary FallbackComponent={ErrorFallback}>
                              <Component location={transformedLocation} />
                            </ErrorBoundary>
                          </Route>
                        )
                      })}
                    </Switch>
                  </CSSTransition>
                </TransitionGroup>
              </>
            )
          }}
        />
      </Router>
      <>
        <style jsx global>
          {`
            ::-webkit-scrollbar {
              width: 0px;
              background: transparent;
            }

            /*
             * Page transition styles follow. All animations are targeted not to
             * the transitioning container, but to the 'main' element in the
             * transitioning container, generally created by the CorePage component.
             */
            .page-transition-right-enter main,
            .page-transition-left-enter main {
              opacity: 0.3;
            }
            .page-transition-right-enter main {
              transform: translateX(-7px);
            }
            .page-transition-left-enter main {
              transform: translateX(7px);
            }
            .page-transition-right-enter-active main,
            .page-transition-left-enter-active main {
              opacity: 1;
              transform: translateX(0px);
              transition: transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms,
                opacity 250ms;
            }
            .page-transition-right-exit main,
            .page-transition-left-exit main {
              opacity: 1;
              transform: translateX(0px);
            }
            .page-transition-right-exit-active main,
            .page-transition-left-exit-active main {
              opacity: 0;
              transition: transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms,
                opacity 250ms;
            }
            .page-transition-right-exit-active main {
              transform: translateX(-7px);
            }
            .page-transition-left-exit-active main {
              transform: translateX(7px);
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
