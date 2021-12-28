import React, { ReactElement, useState } from "react"
import { MemoryRouter as Router, Switch, Route } from "react-router-dom"
import classNames from "classnames"

import { Store } from "webext-redux"
import { Provider } from "react-redux"
import { TransitionGroup, CSSTransition } from "react-transition-group"
import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"
import { useIsDappPopup } from "../hooks"
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

interface Location {
  key: string
  pathname: string
}

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

export default function Popup({ store }: { store: Store }): ReactElement {
  const isDappPopup = useIsDappPopup()
  const [shouldDisplayDecoy, setShouldDisplayDecoy] = useState(false)
  const [isDirectionRight, setIsDirectionRight] = useState(true)
  const [showTabBar, setShowTabBar] = useState(true)

  return (
    <>
      <Provider store={store}>
        <div className="top_menu_wrap_decoy">
          <TopMenu />
        </div>
        <div className="community_edition_label">Community Edition</div>
        <Router>
          <Route
            render={(routeProps) => {
              // @ts-expect-error TODO: fix the typing when the feature works
              const transformedLocation = transformLocation(routeProps.location)
              const normalizedPathname =
                transformedLocation.pathname !== "/wallet"
                  ? routeProps.location.pathname
                  : "/"

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
      </Provider>
      {isDappPopup && (
        <style jsx global>
          {`
            body {
              height: 100%;
            }
          `}
        </style>
      )}

      <>
        <style jsx global>
          {`
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
    </>
  )
}
