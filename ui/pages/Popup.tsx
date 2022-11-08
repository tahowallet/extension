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
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { popupMonitorPortName } from "@tallyho/tally-background/main"
import {
  getAddressCount,
  selectCurrentAccountSigner,
  selectCurrentAddressNetwork,
  selectKeyringStatus,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectIsTransactionPendingSignature } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import {
  useIsDappPopup,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../hooks"

import ErrorFallback from "./ErrorFallback"

import pageList from "../routes/routes"

const pagePreferences = Object.fromEntries(
  pageList.map(({ path, hasTabBar, hasTopBar, persistOnClose }) => [
    path,
    { hasTabBar, hasTopBar, persistOnClose },
  ])
)

function transformLocation(
  inputLocation: RouterLocation,
  isTransactionPendingSignature: boolean,
  needsKeyringUnlock: boolean,
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
              saveHistoryEntries(
                // WARNING: `entries` is not exported by our known types; it is
                // an internal implementation detail of *memory* history that
                // we are relying on here.
                (routeProps.history as unknown as { entries: RouterLocation[] })
                  .entries
              )
            }

            return (
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
            :global(#tally-root) {
              display: flex;
              flex-direction: column;
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
