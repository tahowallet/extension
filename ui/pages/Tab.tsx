import React, { ReactElement } from "react"
import { Provider } from "react-redux"
import { HashRouter, Route, Switch } from "react-router-dom"
import { Store } from "webext-redux"
import BrowserTabContainer from "../components/BrowserTab/BrowserTabContainer"
import Ledger from "./Ledger/Ledger"
import TabbedOnboardingAddWallet from "./Onboarding/TabbedOnboardingAddWallet"
import TabbedOnboardingDone from "./Onboarding/TabbedOnboardingDone"
import TabbedOnboardingImportSeed from "./Onboarding/TabbedOnboardingImportSeed"
import TabbedOnboardingSetPassword from "./Onboarding/TabbedOnboardingSetPassword"
import TabbedOnboardingSaveSeed from "./Onboarding/TabbedOnboardingSaveSeed"
import TabbedOnboardingVerifySeed from "./Onboarding/TabbedOnboardingVerifySeed"
import TabbedOnboardingInfoIntro from "./Onboarding/TabbedOnboardingInfoIntro"
import TabbedOnboardingViewOnlyWallet from "./Onboarding/TabbedOnboardingViewOnlyWallet"
import TabNotFound from "./TabNotFound"

/**
 * Entry point for UI shown in browser tabs.
 */
export default function Tab({ store }: { store: Store }): ReactElement {
  return (
    <>
      <Provider store={store}>
        {/* HashRouter seems the only choice supporting safe page reloads. */}
        <HashRouter>
          <Switch>
            <Route path="/onboarding" exact>
              <BrowserTabContainer>
                <TabbedOnboardingInfoIntro />
              </BrowserTabContainer>
            </Route>
            <Route path="/onboarding/add-wallet" exact>
              <BrowserTabContainer>
                <TabbedOnboardingAddWallet />
              </BrowserTabContainer>
            </Route>
            <Route path="/onboarding/import-seed/set-password" exact>
              <BrowserTabContainer>
                <TabbedOnboardingSetPassword nextPage="/onboarding/import-seed" />
              </BrowserTabContainer>
            </Route>
            <Route path="/onboarding/import-seed" exact>
              <BrowserTabContainer>
                <TabbedOnboardingImportSeed nextPage="/onboarding/done" />
              </BrowserTabContainer>
            </Route>
            <Route path="/onboarding/new-seed/set-password" exact>
              <BrowserTabContainer>
                <TabbedOnboardingSetPassword nextPage="/onboarding/new-seed" />
              </BrowserTabContainer>
            </Route>
            <Route path="/onboarding/new-seed" exact>
              <BrowserTabContainer>
                <TabbedOnboardingSaveSeed />
              </BrowserTabContainer>
            </Route>
            <Route path="/onboarding/new-seed/verify" exact>
              <BrowserTabContainer>
                <TabbedOnboardingVerifySeed />
              </BrowserTabContainer>
            </Route>
            <Route path="/onboarding/view-only-wallet" exact>
              <BrowserTabContainer>
                <TabbedOnboardingViewOnlyWallet />
              </BrowserTabContainer>
            </Route>
            <Route path="/onboarding/done" exact>
              <BrowserTabContainer>
                <TabbedOnboardingDone />
              </BrowserTabContainer>
            </Route>
            <Route path="/ledger" exact>
              <BrowserTabContainer>
                <Ledger />
              </BrowserTabContainer>
            </Route>
            <Route>
              <TabNotFound />
            </Route>
          </Switch>
        </HashRouter>
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
