import React, { ReactElement, useState } from "react"
import { MemoryRouter as Router, Switch, Route } from "react-router-dom"

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
        <Router>
          <Route
            render={(routeProps) => {
              setAnimationConditions(
                routeProps,
                pagePreferences,
                setShouldDisplayDecoy,
                setIsDirectionRight
              )
              setShowTabBar(
                pagePreferences[
                  routeProps.location.pathname !== "/wallet"
                    ? routeProps.location.pathname
                    : "/"
                ].hasTabBar
              )

              // @ts-expect-error TODO: fix the typing when the feature works
              const transformedLocation = transformLocation(routeProps.location)

              return (
                <TransitionGroup>
                  <CSSTransition
                    timeout={300}
                    classNames="page-transition"
                    key={
                      routeProps.location.pathname.includes("onboarding")
                        ? ""
                        : transformedLocation.key
                    }
                  >
                    <div>
                      <div
                        className={`top_menu_wrap${
                          shouldDisplayDecoy ? " anti_animation" : ""
                        }`}
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
          `}
        </style>
      </>
    </>
  )
}
