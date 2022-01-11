import React, { ReactElement } from "react"
import Wallet from "../pages/Wallet"
import SignTransaction from "../pages/SignTransaction"
import OnboardingSaveSeed from "../pages/Onboarding/OnboardingSaveSeed"
import OnboardingVerifySeed from "../pages/Onboarding/OnboardingVerifySeed"
import OnboardingImportMetamask from "../pages/Onboarding/OnboardingImportMetamask"
import OnboardingViewOnlyWallet from "../pages/Onboarding/OnboardingViewOnlyWallet"
import OnboardingInfoIntro from "../pages/Onboarding/OnboardingInfoIntro"
import OnboardingAddWallet from "../pages/Onboarding/OnboardingAddWallet"
import Overview from "../pages/Overview"
import SingleAsset from "../pages/SingleAsset"
import Earn from "../pages/Earn"
import EarnDeposit from "../pages/EarnDeposit"
import Menu from "../pages/Menu"
import Send from "../pages/Send"
import Swap from "../pages/Swap"
import DAppPermissionRequest from "../pages/DAppConnectRequest"
import KeyringUnlock from "../components/Keyring/KeyringUnlock"
import KeyringSetPassword from "../components/Keyring/KeyringSetPassword"

const pageList = [
  {
    path: "/keyring/set-password",
    Component: KeyringSetPassword,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/keyring/unlock",
    Component: KeyringUnlock,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/singleAsset",
    Component: SingleAsset,
    hasTabBar: true,
    hasTopBar: true,
  },
  {
    path: "/onboarding/importMetamask",
    Component: (): ReactElement => <OnboardingImportMetamask nextPage="/" />,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/onboarding/viewOnlyWallet",
    Component: OnboardingViewOnlyWallet,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/onboarding/infoIntro",
    Component: OnboardingInfoIntro,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/onboarding/addWallet",
    Component: OnboardingAddWallet,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/signTransaction",
    Component: SignTransaction,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/overview",
    Component: Overview,
    hasTabBar: true,
    hasTopBar: false,
  },
  {
    path: "/earn/deposit",
    Component: EarnDeposit,
    hasTabBar: true,
    hasTopBar: true,
  },
  {
    path: "/earn",
    Component: Earn,
    hasTabBar: true,
    hasTopBar: true,
  },
  {
    path: "/menu",
    Component: Menu,
    hasTabBar: true,
    hasTopBar: false,
  },
  {
    path: "/send",
    Component: Send,
    hasTabBar: true,
    hasTopBar: true,
  },
  {
    path: "/swap",
    Component: Swap,
    hasTabBar: true,
    hasTopBar: true,
  },
  {
    path: "/dapp-permission",
    Component: DAppPermissionRequest,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/onboarding/saveSeed",
    Component: OnboardingSaveSeed,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/onboarding/verifySeed",
    Component: OnboardingVerifySeed,
    hasTabBar: false,
    hasTopBar: false,
  },
  {
    path: "/",
    Component: Wallet,
    hasTabBar: true,
    hasTopBar: true,
  },
]

export default pageList
