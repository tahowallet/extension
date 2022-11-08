import React, { ReactElement, useEffect } from "react"
import {
  selectCurrentAccountActivities,
  selectCurrentAccountBalances,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { checkAlreadyClaimed } from "@tallyho/tally-background/redux-slices/claim"

import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { useTranslation } from "react-i18next"
import { NETWORKS_SUPPORTING_NFTS } from "@tallyho/tally-background/nfts"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useSwitchablePanels,
} from "../hooks"
import WalletAssetList from "../components/Wallet/WalletAssetList"
import WalletActivityList from "../components/Wallet/WalletActivityList"
import WalletAccountBalanceControl from "../components/Wallet/WalletAccountBalanceControl"
import OnboardingOpenClaimFlowBanner from "../components/Onboarding/OnboardingOpenClaimFlowBanner"
import NFTsWallet from "../components/NFTs/NFTsWallet"
import WalletToggleDefaultBanner from "../components/Wallet/WalletToggleDefaultBanner"
import WalletBanner from "../components/Wallet/Banner/WalletBanner"
import CorePage from "../components/Core/CorePage"
import WalletAnalyticsNotificationBanner from "../components/Wallet/WalletAnalyticsNotificationBanner"

export default function Wallet(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "wallet" })

  const dispatch = useBackgroundDispatch()

  //  accountLoading, hasWalletErrorCode
  const accountData = useBackgroundSelector(selectCurrentAccountBalances)
  const claimState = useBackgroundSelector((state) => state.claim)
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  useEffect(() => {
    dispatch(
      checkAlreadyClaimed({
        claimState,
      })
    )
  }, [claimState, dispatch])

  useEffect(() => {
    // On network switch from top menu reset ui back to assets tab
    if (!NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID)) {
      // setPanelNumber(0)
    }
  }, [selectedNetwork.chainID])

  const { assetAmounts, totalMainCurrencyValue } = accountData ?? {
    assetAmounts: [],
    totalMainCurrencyValue: undefined,
  }

  const currentAccountActivities = useBackgroundSelector(
    selectCurrentAccountActivities
  )

  const initializationLoadingTimeExpired = useBackgroundSelector(
    (background) => background.ui?.initializationLoadingTimeExpired
  )

  const panels = useSwitchablePanels([
    ...[
      {
        name: t("pages.assets"),
        panelElement: () => (
          <WalletAssetList
            assetAmounts={assetAmounts}
            initializationLoadingTimeExpired={initializationLoadingTimeExpired}
          />
        ),
      },
    ],
    ...(NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID)
      ? [
          {
            name: t("pages.NFTs"),
            panelElement: () => (
              <>
                <NFTsWallet />
              </>
            ),
          },
        ]
      : []),
    ...[
      {
        name: t("pages.activity"),
        panelElement: () => (
          <WalletActivityList activities={currentAccountActivities ?? []} />
        ),
      },
    ],
  ])

  return (
    <CorePage hasTabBar hasTopBar handleScrolling={false}>
      <WalletToggleDefaultBanner />
      <WalletAnalyticsNotificationBanner />
      <WalletAccountBalanceControl
        balance={totalMainCurrencyValue}
        initializationLoadingTimeExpired={initializationLoadingTimeExpired}
      />
      {isEnabled(FeatureFlags.SUPPORT_ACHIEVEMENTS_BANNER) && <WalletBanner />}
      {!isEnabled(FeatureFlags.HIDE_TOKEN_FEATURES) && (
        <OnboardingOpenClaimFlowBanner />
      )}
      <div className="panels">{panels}</div>
      <style jsx>
        {`
          .page_content {
            width: 100%;
            height: inherit;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .panels {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            overflow: hidden;

            padding-top: 35px;
          }
          .panels > :global(nav + *) {
            overflow-y: auto;
          }
        `}
      </style>
    </CorePage>
  )
}
