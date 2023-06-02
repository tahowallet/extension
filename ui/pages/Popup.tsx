import React, { ReactElement, useState, useEffect } from "react"
import { MemoryRouter as Router, Switch, Route } from "react-router-dom"
import { ErrorBoundary } from "react-error-boundary"

import {
  setRouteHistoryEntries,
  userActivityEncountered,
} from "@tallyho/tally-background/redux-slices/ui"

import { Store } from "webext-redux"
import { Provider } from "react-redux"
import { TransitionGroup, CSSTransition } from "react-transition-group"
import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"
import { runtime } from "webextension-polyfill"
import { popupMonitorPortName } from "@tallyho/tally-background/main"
import {
  getAddressCount,
  selectCurrentAddressNetwork,
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
    !inputLocation.pathname.includes("/internal-signer/")
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
  const [isDirectionRight, setIsDirectionRight] = useState(true)

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
      <GlobalModal id="meet_taho" />
      <Router initialEntries={routeHistoryEntries}>
        <Route
          render={(routeProps) => {
            const transformedLocation = transformLocation(
              routeProps.location,
              isTransactionPendingSignature,
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

            setAnimationConditions(routeProps, setIsDirectionRight)

            return (
              <TransitionGroup>
                <CSSTransition
                  timeout={300}
                  classNames="page-transition"
                  key={
                    routeProps.location.pathname.includes("onboarding") ||
                    routeProps.location.pathname.includes("internal-signer")
                      ? ""
                      : transformedLocation.key
                  }
                >
                  <div>
                    <Switch location={transformedLocation}>
                      {pageList.map(
                        ({ path, Component, hasTopBar, hasTabBar }) => (
                          <Route path={path} key={path}>
                            <CorePage
                              hasTopBar={hasTopBar}
                              hasTabBar={hasTabBar}
                            >
                              <ErrorBoundary FallbackComponent={ErrorFallback}>
                                <Component location={transformedLocation} />
                              </ErrorBoundary>
                            </CorePage>
                          </Route>
                        )
                      )}
                    </Switch>
                  </div>
                </CSSTransition>
              </TransitionGroup>
            )
          }}
        />
      </Router>
      <style jsx global>
        {`
          ::-webkit-scrollbar {
            width: 0px;
            background: transparent;
          }

          ${animationStyles(isDirectionRight)}

          .hide {
            opacity: 0;
          }

          ${isDappPopup &&
          `
            body {
              height: 100%;
            }
           `}
        `}
      </style>
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
