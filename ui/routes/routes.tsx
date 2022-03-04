import React, { ReactElement } from "react"
import Wallet from "../pages/Wallet"
import SignTransaction from "../pages/SignTransaction"
import SignData from "../pages/SignData"
import PersonalSign from "../pages/PersonalSign"
import OnboardingSaveSeed from "../pages/Onboarding/OnboardingSaveSeed"
import OnboardingVerifySeed from "../pages/Onboarding/OnboardingVerifySeed"
import OnboardingImportMetamask from "../pages/Onboarding/OnboardingImportMetamask"
import OnboardingViewOnlyWallet from "../pages/Onboarding/OnboardingViewOnlyWallet"
import OnboardingInfoIntro from "../pages/Onboarding/OnboardingInfoIntro"
import OnboardingAddWallet from "../pages/Onboarding/OnboardingAddWallet"
import OnboardingInterstitialCreatePhrase from "../pages/Onboarding/OnboardingInterstitialCreatePhrase"
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

interface PageList {
  path: string
  // Tricky to handle all props components are
  // accepting here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: (...args: any[]) => ReactElement
  hasTabBar: boolean
  hasTopBar: boolean
  persistOnClose: boolean
}

const pageList: PageList[] = [
  {
    path: "/keyring/set-password",
    Component: KeyringSetPassword,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/keyring/unlock",
    Component: KeyringUnlock,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/singleAsset",
    Component: SingleAsset,
    hasTabBar: true,
    hasTopBar: true,
    persistOnClose: true,
  },
  {
    path: "/onboarding/importMetamask",
    Component: (): ReactElement => <OnboardingImportMetamask nextPage="/" />,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/viewOnlyWallet",
    Component: OnboardingViewOnlyWallet,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/infoIntro",
    Component: OnboardingInfoIntro,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/addWallet",
    Component: OnboardingAddWallet,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/signTransaction",
    Component: SignTransaction,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/signData",
    Component: SignData,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/personalSign",
    Component: PersonalSign,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: true,
  },
  {
    path: "/overview",
    Component: Overview,
    hasTabBar: true,
    hasTopBar: false,
    persistOnClose: true,
  },
  {
    path: "/earn/deposit",
    Component: EarnDeposit,
    hasTabBar: true,
    hasTopBar: true,
    persistOnClose: true,
  },
  {
    path: "/earn",
    Component: Earn,
    hasTabBar: true,
    hasTopBar: true,
    persistOnClose: true,
  },
  {
    path: "/menu",
    Component: Menu,
    hasTabBar: true,
    hasTopBar: false,
    persistOnClose: true,
  },
  {
    path: "/send",
    Component: Send,
    hasTabBar: true,
    hasTopBar: true,
    persistOnClose: true,
  },
  {
    path: "/swap",
    Component: Swap,
    hasTabBar: true,
    hasTopBar: true,
    persistOnClose: true,
  },
  {
    path: "/dappPermission",
    Component: DAppPermissionRequest,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/saveSeed",
    Component: OnboardingSaveSeed,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/verifySeed",
    Component: OnboardingVerifySeed,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/onboardingInterstitialCreatePhrase",
    Component: OnboardingInterstitialCreatePhrase,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/",
    Component: Wallet,
    hasTabBar: true,
    hasTopBar: true,
    persistOnClose: true,
  },
]

export default pageList
