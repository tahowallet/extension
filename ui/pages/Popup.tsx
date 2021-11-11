import React, { ReactElement } from "react"
import {
  useHistory,
  MemoryRouter as Router,
  Switch,
  Route,
} from "react-router-dom"

import { Store } from "webext-redux"
import { Provider } from "react-redux"

import Wallet from "./Wallet"
import SignTransaction from "./SignTransaction"
import OnboardingImportMetamask from "./Onboarding/OnboardingImportMetamask"
import OnboardingViewOnlyWallet from "./Onboarding/OnboardingViewOnlyWallet"
import Onboarding from "./Onboarding/Onboarding"
import Overview from "./Overview"
import SingleAsset from "./SingleAsset"
import Earn from "./Earn"
import EarnDeposit from "./EarnDeposit"
import Menu from "./Menu"
import Send from "./Send"
import Swap from "./Swap"
import Eligible from "./Claiming/Eligible"

export default function Popup({ store }: { store: Store }): ReactElement {
  const history = useHistory()

  return (
    <Provider store={store}>
      <Router>
        <Switch>
          <Route path="/singleAsset">
            <SingleAsset />
          </Route>
          <Route path="/onboardingImportMetamask">
            <OnboardingImportMetamask onImported={() => history.push("/")} />
          </Route>
          <Route path="/onboarding/viewOnlyWallet">
            <OnboardingViewOnlyWallet />
          </Route>
          <Route path="/onboarding/:startPage">
            <Onboarding />
          </Route>
          <Route path="/signTransaction">
            <SignTransaction />
          </Route>
          <Route path="/overview">
            <Overview />
          </Route>
          <Route path="/claim">
            <Eligible />
          </Route>
          <Route path="/earn/deposit">
            <EarnDeposit />
          </Route>
          <Route path="/earn">
            <Earn />
          </Route>
          <Route path="/menu">
            <Menu />
          </Route>
          <Route path="/send">
            <Send />
          </Route>
          <Route path="/swap">
            <Swap />
          </Route>
          <Route path="/">
            <Wallet />
          </Route>
        </Switch>
      </Router>
    </Provider>
  )
}
