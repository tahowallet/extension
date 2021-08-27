import React, { ReactElement } from "react"
import { Router } from "react-chrome-extension-router"
import { Store } from "webext-redux"
import { Provider } from "react-redux"

import Wallet from "./Wallet"

import OnboardingImportMetamask from "../components/Onboarding/OnboardingImportMetamask"
import Onboarding from "./Onboarding"
import Overview from "./Overview"
import Earn from "./Earn"
import Menu from "./Menu"
import Send from "./Send"
import Swap from "./Swap"

export default function Popup({ store }: { store: Store }): ReactElement {
  return (
    <Provider store={store}>
      <Router>
        <Wallet />
      </Router>
    </Provider>
  )
}
