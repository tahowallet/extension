import React, {
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { Router, Switch, Route } from "react-router-dom"
import { ErrorBoundary, FallbackProps } from "react-error-boundary"

import {
  setRouteHistoryEntries,
  userActivityEncountered,
} from "@tallyho/tally-background/redux-slices/ui"

import { Store } from "webext-redux"
import { Provider } from "react-redux"
import { TransitionGroup, CSSTransition } from "react-transition-group"
import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"
import { runtime } from "webextension-polyfill"
import { POPUP_MONITOR_PORT_NAME } from "@tallyho/tally-background/constants"
import {
  getAddressCount,
  selectCurrentAddressNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectIsTransactionPendingSignature } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { createMemoryHistory, Location } from "history"
import {
  useIsDappPopup,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../hooks"

import getTransitionDirection from "../utils/pageTransition"

import CorePage from "../components/Core/CorePage"
import ErrorFallback from "./ErrorFallback"

import pageList from "../routes/routes"

const pagePreferences = Object.fromEntries(
  pageList.map(({ path, persistOnClose }) => [path, { persistOnClose }]),
)

/** Shows the error page when a page fails outside its own content. */
function PageErrorFallback(props: FallbackProps): ReactElement {
  return (
    <CorePage>
      <ErrorFallback {...props} />
    </CorePage>
  )
}

type PageTransitionProps = {
  children: ReactNode
  // Set by TransitionGroup.
  in?: boolean
  enter?: boolean
  exit?: boolean
  onExited?: () => void
}

/** A page entering or leaving the popup. */
function PageTransition({
  children,
  ...transitionProps
}: PageTransitionProps): ReactElement {
  const nodeRef = useRef<HTMLDivElement>(null)

  return (
    <CSSTransition
      {...transitionProps}
      nodeRef={nodeRef}
      timeout={300}
      classNames="page-transition"
    >
      <div ref={nodeRef}>{children}</div>
    </CSSTransition>
  )
}

function transformLocation(
  inputLocation: Location,
  isTransactionPendingSignature: boolean,
  hasAccounts: boolean,
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
    const port = runtime.connect(undefined, { name: POPUP_MONITOR_PORT_NAME })

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

  const routeHistoryEntries = useBackgroundSelector(
    (state) => state.ui.routeHistoryEntries,
  )
  // Restored entries only seed the history; later changes come from it.
  const [history] = useState(() =>
    createMemoryHistory({ initialEntries: routeHistoryEntries }),
  )

  const isTransactionPendingSignature = useBackgroundSelector(
    selectIsTransactionPendingSignature,
  )
  const hasAccounts = useBackgroundSelector(
    (state) => getAddressCount(state) > 0,
  )

  // Restoring the saved entries is a "POP", so only a "PUSH" is a navigation
  // worth saving. Entries are saved reversed, the order `initialEntries`
  // expects on the next open. Going back with history.goBack() is a "POP" and
  // is not saved.
  useEffect(
    () =>
      history.listen((location, action) => {
        const { pathname } = transformLocation(
          location,
          isTransactionPendingSignature,
          hasAccounts,
        )
        const normalizedPathname = pagePreferences[pathname] ? pathname : "/"
        if (
          action !== "PUSH" ||
          !pagePreferences[normalizedPathname]?.persistOnClose
        ) {
          return
        }

        const entries = history.entries
          .map(({ hash: _hash, key: _key, ...entry }) => entry)
          .reverse()
        if (JSON.stringify(routeHistoryEntries) !== JSON.stringify(entries)) {
          dispatch(setRouteHistoryEntries(entries))
        }
      }),
    [
      dispatch,
      hasAccounts,
      history,
      isTransactionPendingSignature,
      routeHistoryEntries,
    ],
  )

  useConnectPopupMonitor()

  return (
    <>
      <Router history={history}>
        <Route
          render={(routeProps) => {
            const transformedLocation = transformLocation(
              routeProps.location,
              isTransactionPendingSignature,
              hasAccounts,
            )

            const direction = getTransitionDirection(history)

            return (
              <TransitionGroup className={`pages page_slide_${direction}`}>
                <PageTransition
                  key={
                    routeProps.location.pathname.includes("onboarding") ||
                    routeProps.location.pathname.includes("internal-signer")
                      ? ""
                      : transformedLocation.key
                  }
                >
                  <Switch location={transformedLocation}>
                    {pageList.map(({ path, Component }) => (
                      <Route path={path} key={path}>
                        <ErrorBoundary FallbackComponent={PageErrorFallback}>
                          <Component location={transformedLocation} />
                        </ErrorBoundary>
                      </Route>
                    ))}
                  </Switch>
                </PageTransition>
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

          .pages {
            display: grid;
            height: 100%;
          }
          .pages > * {
            grid-area: 1 / 1;
            min-height: 0;
          }
          .page_slide_right {
            --page-slide-from: -7px;
          }
          .page_slide_left {
            --page-slide-from: 7px;
          }
          .page-transition-enter > section > main {
            opacity: 0.3;
            transform: translateX(var(--page-slide-from));
          }
          .page-transition-enter-active > section > main {
            opacity: 1;
            transform: translateX(0px);
            transition:
              transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms,
              opacity 250ms;
          }
          .page-transition-exit {
            opacity: 1;
          }
          .page-transition-exit-active {
            opacity: 0;
            pointer-events: none;
          }

          .hide {
            opacity: 0;
          }

          ${
            isDappPopup &&
            `
            body {
              height: 100%;
            }
           `
          }
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
