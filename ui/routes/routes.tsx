import React, { ReactElement } from "react"
import Wallet from "../pages/Wallet"
import SignTransaction from "../pages/SignTransaction"
import SignData from "../pages/SignData"
import PersonalSign from "../pages/PersonalSign"
import Overview from "../pages/Overview"
import SingleAsset from "../pages/SingleAsset"
import Earn from "../pages/Earn"
import EarnDeposit from "../pages/EarnDeposit"
import Menu from "../pages/Settings"
import Send from "../pages/Send"
import Swap from "../pages/Swap"
import DAppPermissionRequest from "../pages/DAppConnectRequest"
import InternalSignerUnlock from "../components/InternalSigner/InternalSignerUnlock"
import InternalSignerSetPassword from "../components/InternalSigner/InternalSignerSetPassword"
import Eligible from "../pages/Claiming/Eligible"
import SettingsExportLogs from "../pages/Settings/SettingsExportLogs"
import SettingsAnalytics from "../pages/Settings/SettingsAnalytics"
import SettingsConnectedWebsites from "../pages/Settings/SettingsConnectedWebsites"
import HiddenDevPanel from "../components/HiddenDevPanel/HiddenDevPanel"
import FeatureFlagsPanel from "../components/HiddenDevPanel/FeatureFlagsPanel"
import NFTs from "../pages/NFTs"
import Abilities from "../pages/Abilities"
import SettingsCustomNetworks from "../pages/Settings/SettingsCustomNetworks"
import NewCustomNetworkRequest from "../pages/NewCustomNetworkRequest"
import SettingsAddCustomAsset from "../pages/Settings/SettingsAddCustomAsset"
import CorePage from "../components/Core/CorePage"

// The internal signer screens also appear inside other pages, so their routes
// supply the page frame.
function InternalSignerSetPasswordPage(): ReactElement {
  return (
    <CorePage>
      <InternalSignerSetPassword />
    </CorePage>
  )
}

function InternalSignerUnlockPage(): ReactElement {
  return (
    <CorePage>
      <InternalSignerUnlock />
    </CorePage>
  )
}

type PageList = {
  path: string
  // Tricky to handle all props components are
  // accepting here.
  // oxlint-disable-next-line typescript/no-explicit-any
  Component: (...args: any[]) => ReactElement | null
  persistOnClose: boolean
}

const pageList: PageList[] = [
  {
    path: "/internal-signer/set-password",
    Component: InternalSignerSetPasswordPage,
    persistOnClose: false,
  },
  {
    path: "/internal-signer/unlock",
    Component: InternalSignerUnlockPage,
    persistOnClose: false,
  },
  {
    path: "/singleAsset",
    Component: SingleAsset,
    persistOnClose: true,
  },
  {
    path: "/sign-transaction",
    Component: SignTransaction,
    persistOnClose: false,
  },
  {
    path: "/add-evm-chain",
    Component: NewCustomNetworkRequest,
    persistOnClose: false,
  },
  {
    path: "/sign-data",
    Component: SignData,
    persistOnClose: false,
  },
  {
    path: "/personal-sign",
    Component: PersonalSign,
    persistOnClose: true,
  },
  {
    path: "/portfolio",
    Component: Overview,
    persistOnClose: true,
  },
  {
    path: "/earn/deposit",
    Component: EarnDeposit,
    persistOnClose: true,
  },
  {
    path: "/earn",
    Component: Earn,
    persistOnClose: true,
  },
  {
    path: "/settings/export-logs",
    Component: SettingsExportLogs,
    persistOnClose: true,
  },
  {
    path: "/settings/connected-websites",
    Component: SettingsConnectedWebsites,
    persistOnClose: true,
  },
  {
    path: "/settings/analytics",
    Component: SettingsAnalytics,
    persistOnClose: true,
  },
  {
    path: "/settings/custom-networks",
    Component: SettingsCustomNetworks,
    persistOnClose: true,
  },
  {
    path: "/settings/add-custom-asset",
    Component: SettingsAddCustomAsset,
    persistOnClose: true,
  },
  {
    path: "/settings",
    Component: Menu,
    persistOnClose: true,
  },
  {
    path: "/abilities",
    Component: Abilities,
    persistOnClose: true,
  },
  {
    path: "/send",
    Component: Send,
    persistOnClose: true,
  },
  {
    path: "/swap",
    Component: Swap,
    persistOnClose: true,
  },
  {
    path: "/nfts",
    Component: NFTs,
    persistOnClose: true,
  },
  {
    path: "/dapp-permission",
    Component: DAppPermissionRequest,
    persistOnClose: false,
  },
  {
    path: "/eligible",
    Component: Eligible,
    persistOnClose: true,
  },
  {
    path: "/dev/feature-flags",
    Component: FeatureFlagsPanel,
    persistOnClose: false,
  },
  {
    path: "/dev",
    Component: HiddenDevPanel,
    persistOnClose: false,
  },
  {
    path: "/",
    Component: Wallet,
    persistOnClose: true,
  },
]

export default pageList
