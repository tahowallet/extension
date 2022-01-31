import React, { ReactElement, useState, useRef } from "react"
import { MemoryRouter as Router, Switch, Route } from "react-router-dom"
import classNames from "classnames"
import {
  setRouteHistoryEntries,
  Location,
} from "@tallyho/tally-background/redux-slices/ui"

import { Store } from "webext-redux"
import { Provider } from "react-redux"
import { TransitionGroup, CSSTransition } from "react-transition-group"
import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"
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

import pageList from "../routes/routes"

const pagePreferences = Object.fromEntries(
  pageList.map((item) => [
    item.path,
    { hasTabBar: item.hasTabBar, hasTopBar: item.hasTopBar },
  ])
)

function transformLocation(inputLocation: Location): Location {
  // The inputLocation is not populated with the actual query string — even though it should be
  // so I need to grab it from the window
  const params = new URLSearchParams(window.location.search)
  const maybePage = params.get("page")

  let { pathname } = inputLocation
  if (
    isAllowedQueryParamPage(maybePage) &&
    !inputLocation.pathname.includes("/keyring/")
  ) {
    pathname = maybePage
  }

  return {
    ...inputLocation,
    pathname,
  }
}

export function Main(): ReactElement {
  const dispatch = useBackgroundDispatch()

  const isDappPopup = useIsDappPopup()
  const [shouldDisplayDecoy, setShouldDisplayDecoy] = useState(false)
  const [isDirectionRight, setIsDirectionRight] = useState(true)
  const [showTabBar, setShowTabBar] = useState(true)
  const renderCount = useRef(0)

  const routeHistoryEntries = useBackgroundSelector((state) => {
    return state.ui.routeHistoryEntries
  })

  function saveHistoryEntries(routeHistoryEntities: Location[]) {
    const isNotOnKeyringRelatedPage =
      routeHistoryEntities[routeHistoryEntities.length - 1].pathname !==
        "/signTransaction" &&
      !routeHistoryEntities[routeHistoryEntities.length - 1].pathname.includes(
        "/keyring/"
      )

    // Initial extension load takes two renders because of setting
    // animation control states. `initialEntries` needs to be a reversed
    // version of route history entities. Without avoiding the initial load,
    // entries will keep reversing.
    if (renderCount.current > 1 && isNotOnKeyringRelatedPage) {
      const entries = routeHistoryEntities
        .reduce((agg: Partial<Location>[], entity) => {
          const { ...entityCopy } = entity as Partial<Location>
          delete entityCopy.hash
          delete entityCopy.key
          agg.push(entityCopy)
          return agg
        }, [])
        .reverse()

      dispatch(setRouteHistoryEntries(entries))
    }
  }

  return (
    <>
      <div className="top_menu_wrap_decoy">
        <TopMenu />
      </div>
      <div className="community_edition_label">Community Edition</div>
      <Router initialEntries={routeHistoryEntries}>
        <Route
          render={(routeProps) => {
            const transformedLocation = transformLocation(routeProps.location)
            // @ts-expect-error TODO: fix the typing
            saveHistoryEntries(routeProps?.history?.entries)

            const normalizedPathname =
              transformedLocation.pathname !== "/wallet"
                ? transformedLocation.pathname
                : "/"

            setAnimationConditions(
              routeProps,
              pagePreferences,
              setShouldDisplayDecoy,
              setIsDirectionRight
            )
            setShowTabBar(pagePreferences[normalizedPathname].hasTabBar)
            renderCount.current += 1

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
                    {/* @ts-expect-error TODO: fix the typing when the feature works */}
                    <Switch location={transformedLocation}>
                      {pageList.map(
                        ({ path, Component, hasTabBar, hasTopBar }) => {
                          return (
                            <Route path={path} key={path}>
                              <CorePage
                                hasTabBar={hasTabBar}
                                hasTopBar={hasTopBar}
                              >
                                <Component location={transformedLocation} />
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
            body {
              width: 384px;
              height: 594px;
              scrollbar-width: none;
            }

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
            .community_edition_label {
              width: 140px;
              height: 20px;
              left: 24px;
              position: fixed;
              background-color: var(--gold-60);
              color: var(--hunter-green);
              font-weight: 500;
              text-align: center;
              border-bottom-left-radius: 4px;
              border-bottom-right-radius: 4px;
              font-size: 14px;
              z-index: 1000;
              top: 0px;
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
