import React, { ReactElement } from "react"
import {
  useHistory,
  MemoryRouter as Router,
  Switch,
  Route,
} from "react-router-dom"

import { Store } from "webext-redux"
import { Provider } from "react-redux"
import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"

import Wallet from "./Wallet"
import SignTransaction from "./SignTransaction"
import OnboardingImportMetamask from "./Onboarding/OnboardingImportMetamask"
import OnboardingViewOnlyWallet from "./Onboarding/OnboardingViewOnlyWallet"
import OnboardingInfoIntro from "./Onboarding/OnboardingInfoIntro"
import OnboardingAddWallet from "./Onboarding/OnboardingAddWallet"
import Overview from "./Overview"
import SingleAsset from "./SingleAsset"
import Earn from "./Earn"
import EarnDeposit from "./EarnDeposit"
import Menu from "./Menu"
import Send from "./Send"
import Swap from "./Swap"
import DAppConnectRequest from "./DAppConnectRequest"
import KeyringUnlock from "../components/Keyring/KeyringUnlock"
import KeyringSetPassword from "../components/Keyring/KeyringSetPassword"
import Permission from "./Permission"

function transformLocation(inputLocation: Location): Location {
  // The inputLocation is not populated with the actual query string — even though it should be
  // so I need to grab it from the window
  const params = new URLSearchParams(window.location.search)
  const maybePage = params.get("page")

  let { pathname } = inputLocation
  if (isAllowedQueryParamPage(maybePage)) {
    pathname = maybePage
  }

  return {
    ...inputLocation,
    pathname,
  }
}

export default function Popup({ store }: { store: Store }): ReactElement {
  const history = useHistory()

  return (
    <Provider store={store}>
      <Router>
        <Route
          render={(routeProps) => (
            // @ts-expect-error TODO: fix the typing when the feature works
            <Switch location={transformLocation(routeProps.location)}>
              <Route path="/keyring/set-password">
                <KeyringSetPassword />
              </Route>
              <Route path="/keyring/unlock">
                <KeyringUnlock />
              </Route>
              <Route path="/singleAsset">
                <SingleAsset />
              </Route>
              <Route path="/onboarding/importMetamask">
                <OnboardingImportMetamask nextPage="/" />
              </Route>
              <Route path="/onboarding/viewOnlyWallet">
                <OnboardingViewOnlyWallet />
              </Route>
              <Route path="/onboarding/infoIntro">
                <OnboardingInfoIntro />
              </Route>
              <Route path="/onboarding/addWallet">
                <OnboardingAddWallet />
              </Route>
              <Route path="/signTransaction">
                <SignTransaction />
              </Route>
              <Route path="/overview">
                <Overview />
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
              <Route path="/permission">
                <Permission />
              </Route>
              <Route path="/dapp-connect">
                <DAppConnectRequest />
              </Route>
              <Route path="/">
                <Wallet />
              </Route>
            </Switch>
          )}
        />
      </Router>
    </Provider>
  )
}
