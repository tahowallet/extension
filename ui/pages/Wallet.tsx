import React, { ReactElement, useEffect, useState } from "react"
import {
  selectCurrentAccountActivities,
  selectCurrentAccountBalances,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { checkAlreadyClaimed } from "@tallyho/tally-background/redux-slices/claim"

import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import classNames from "classnames"
import { useTranslation } from "react-i18next"
import { NETWORKS_SUPPORTING_NFTS } from "@tallyho/tally-background/nfts"
import { selectShowAnalyticsNotification } from "@tallyho/tally-background/redux-slices/ui"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import { SwappableAsset } from "@tallyho/tally-background/assets"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import WalletAssetList from "../components/Wallet/WalletAssetList"
import WalletActivityList from "../components/Wallet/WalletActivityList"
import WalletAccountBalanceControl from "../components/Wallet/WalletAccountBalanceControl"
import OnboardingOpenClaimFlowBanner from "../components/Onboarding/OnboardingOpenClaimFlowBanner"
import NFTsWallet from "../components/NFTs/NFTsWallet"
import SharedBanner from "../components/Shared/SharedBanner"
import WalletToggleDefaultBanner from "../components/Wallet/WalletToggleDefaultBanner"
import WalletBanner from "../components/Wallet/Banner/WalletBanner"
import WalletAnalyticsNotificationBanner from "../components/Wallet/WalletAnalyticsNotificationBanner"
import NFTListCurrentWallet from "../components/NFTS_update/NFTListCurrentWallet"

export default function Wallet(): ReactElement {
  const { t } = useTranslation()
  const [panelNumber, setPanelNumber] = useState(0)

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
      setPanelNumber(0)
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

  const showAnalyticsNotification = useBackgroundSelector(
    selectShowAnalyticsNotification
  )

  const panelNames = [t("wallet.pages.assets")]

  if (NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID)) {
    panelNames.push(t("wallet.pages.NFTs"))
  }

  panelNames.push(t("wallet.pages.activity"))

  return (
    <>
      <div className="page_content">
        {!showAnalyticsNotification && <WalletToggleDefaultBanner />}
        <WalletAnalyticsNotificationBanner />
        <div className="section">
          <WalletAccountBalanceControl
            balance={totalMainCurrencyValue}
            initializationLoadingTimeExpired={initializationLoadingTimeExpired}
          />
        </div>
        {isEnabled(FeatureFlags.SUPPORT_ACHIEVEMENTS_BANNER) && (
          <WalletBanner />
        )}
        {!isEnabled(FeatureFlags.HIDE_TOKEN_FEATURES) && (
          <OnboardingOpenClaimFlowBanner />
        )}
        <div className="section">
          <SharedPanelSwitcher
            setPanelNumber={setPanelNumber}
            panelNumber={panelNumber}
            panelNames={panelNames}
          />
          <div
            className={classNames("panel standard_width", {
              no_padding: panelNumber === 1,
            })}
          >
            {panelNumber === 0 && (
              <WalletAssetList
                assetAmounts={
                  // FIXME: Refactor AnyAsset type
                  assetAmounts as CompleteAssetAmount<SwappableAsset>[]
                }
                initializationLoadingTimeExpired={
                  initializationLoadingTimeExpired
                }
              />
            )}
            {panelNumber === 1 &&
              NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID) &&
              (isEnabled(FeatureFlags.SUPPORT_NFT_TAB) ? (
                <NFTListCurrentWallet />
              ) : (
                <>
                  <SharedBanner
                    icon="notif-announcement"
                    iconColor="var(--link)"
                    canBeClosed
                    id="nft_soon"
                    customStyles="margin: 8px 0;"
                  >
                    {t("nfts.NFTPricingComingSoon")}
                  </SharedBanner>
                  <NFTsWallet />
                </>
              ))}
            {panelNumber ===
              (NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID)
                ? 2
                : 1) && (
              <WalletActivityList activities={currentAccountActivities ?? []} />
            )}
          </div>
        </div>
      </div>
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
          .section {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }
          .panel {
            padding-top: 16px;
            box-sizing: border-box;
            height: 302px;
          }
          .panel::-webkit-scrollbar {
            display: none;
          }
          .no_padding {
            padding-top: 0;
          }
        `}
      </style>
    </>
  )
}
