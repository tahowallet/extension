import { isEnabled } from "@tallyho/tally-background/features"
import React, { ReactElement } from "react"
import { Provider } from "react-redux"
import { HashRouter, Route, Switch } from "react-router-dom"
import { Store } from "webext-redux"
import BrowserTabContainer from "../components/BrowserTab/BrowserTabContainer"
import Snackbar from "../components/Snackbar/Snackbar"
import Ledger from "./Ledger/Ledger"
import TabbedOnboardingRoot from "./Onboarding/Tabbed/Root"

import TabNotFound from "./TabNotFound"

const isTabbedOnboarding = isEnabled("SUPPORT_TABBED_ONBOARDING")

/**
 * Entry point for UI shown in browser tabs.
 */
export default function Tab({ store }: { store: Store }): ReactElement {
  const Container = isTabbedOnboarding
    ? BrowserTabContainer
    : BrowserTabContainer.Legacy

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
              {!isTabbedOnboarding && (
                <Route path="/ledger" exact>
                  <Ledger />
                </Route>
              )}
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
