import React, { ReactElement } from "react"
import { Provider } from "react-redux"
import { HashRouter, Route, Switch } from "react-router-dom"
import { Store } from "webext-redux"
import Container from "../components/BrowserTab/BrowserTabContainer"
import Snackbar from "../components/Snackbar/Snackbar"
import TabbedOnboardingRoot from "./Onboarding/Tabbed/Root"

import TabNotFound from "./TabNotFound"

/**
 * Entry point for UI shown in browser tabs.
 */
export default function Tab({ store }: { store: Store }): ReactElement {
  return (
    <>
      <Provider store={store}>
        {/* HashRouter seems the only choice supporting safe page reloads. */}
        <Container>
          <HashRouter>
            <Switch>
              <Route path="/onboarding">
                <TabbedOnboardingRoot />
              </Route>
              <Route>
                <TabNotFound />
              </Route>
            </Switch>
          </HashRouter>
        </Container>
        <Snackbar isTabbedOnboarding />
      </Provider>
      <>
        <style jsx global>
          {`
            body,
            #tally-root {
              height: 100%;
            }
          `}
        </style>
      </>
    </>
  )
}
