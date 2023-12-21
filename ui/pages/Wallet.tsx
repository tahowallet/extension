import React, { ReactElement, useEffect, useMemo, useState } from "react"
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
import { selectShowUnverifiedAssets } from "@tallyho/tally-background/redux-slices/ui"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import { SwappableAsset } from "@tallyho/tally-background/assets"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import WalletAssetList from "../components/Wallet/WalletAssetList"
import WalletActivityList from "../components/Wallet/WalletActivityList"
import WalletAccountBalanceControl from "../components/Wallet/WalletAccountBalanceControl"
import OnboardingOpenClaimFlowBanner from "../components/Onboarding/OnboardingOpenClaimFlowBanner"
import WalletBanner from "../components/Wallet/Banner/WalletBanner"
import WalletAnalyticsNotificationBanner from "../components/Wallet/WalletAnalyticsNotificationBanner"
import NFTListCurrentWallet from "../components/NFTs/NFTListCurrentWallet"
import WalletHiddenAssets from "../components/Wallet/WalletHiddenAssets"
import SharedButton from "../components/Shared/SharedButton"
import SharedIcon from "../components/Shared/SharedIcon"
import PortalBanner from "../components/Wallet/Banner/PortalBanner"
import WalletSubspaceLink from "../components/Wallet/WalletSubscapeLink"

export default function Wallet(): ReactElement {
  const { t } = useTranslation()
  const [panelNumber, setPanelNumber] = useState(0)

  const dispatch = useBackgroundDispatch()
  const history = useHistory()

  //  accountLoading, hasWalletErrorCode
  const accountData = useBackgroundSelector(selectCurrentAccountBalances)
  const claimState = useBackgroundSelector((state) => state.claim)
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  const showUnverifiedAssets = useBackgroundSelector(selectShowUnverifiedAssets)

  useEffect(() => {
    dispatch(
      checkAlreadyClaimed({
        claimState,
      }),
    )
  }, [claimState, dispatch])

  useEffect(() => {
    // On network switch from top menu reset ui back to assets tab
    if (!NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID)) {
      setPanelNumber(0)
    }
  }, [selectedNetwork.chainID])

  const { assetAmounts, unverifiedAssetAmounts, totalMainCurrencyValue } =
    accountData ?? {
      assetAmounts: [],
      unverifiedAssetAmounts: [],
      totalMainCurrencyValue: undefined,
    }

  const currentAccountActivities = useBackgroundSelector(
    selectCurrentAccountActivities,
  )

  useEffect(() => {
    const locationState = history.location.state
    if (locationState) {
      const { goTo } = locationState as { goTo?: string }
      if (goTo === "activity-page") {
        if (!NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID)) {
          setPanelNumber(1)
        } else {
          setPanelNumber(2)
        }
      }
    }
  }, [history, selectedNetwork.chainID])

  const initializationLoadingTimeExpired = useBackgroundSelector(
    (background) => background.ui?.initializationLoadingTimeExpired,
  )

  const showHiddenAssets = useMemo(
    () => showUnverifiedAssets && unverifiedAssetAmounts.length > 0,
    [showUnverifiedAssets, unverifiedAssetAmounts.length],
  )

  const panelNames = [t("wallet.pages.assets")]

  if (NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID)) {
    panelNames.push(t("wallet.pages.NFTs"))
  }

  panelNames.push(t("wallet.pages.activity"))

  return (
    <>
      <div className="page_content">
        {!isEnabled(FeatureFlags.HIDE_ISLAND_UI) && <WalletSubspaceLink />}
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
        {!isEnabled(FeatureFlags.HIDE_ISLAND_UI) && <PortalBanner />}
        <div className="section">
          <SharedPanelSwitcher
            setPanelNumber={setPanelNumber}
            panelNumber={panelNumber}
            panelNames={panelNames}
          />
          <div
            className={classNames("panel standard_width", {
              no_padding:
                panelNumber === 1 &&
                NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID),
            })}
          >
            {panelNumber === 0 && (
              <>
                <WalletAssetList
                  assetAmounts={
                    // FIXME: Refactor AnyAsset type
                    assetAmounts as CompleteAssetAmount<SwappableAsset>[]
                  }
                  initializationLoadingTimeExpired={
                    initializationLoadingTimeExpired
                  }
                />
                <div
                  className={classNames("add_custom_asset", {
                    line: showHiddenAssets,
                  })}
                >
                  <span>{t("wallet.activities.addCustomAssetPrompt")}</span>
                  <SharedButton
                    size="medium"
                    onClick={() => history.push("/settings/add-custom-asset")}
                    type="tertiary"
                  >
                    <SharedIcon
                      width={16}
                      height={16}
                      style={{ marginRight: 4 }}
                      icon="icons/s/add.svg"
                      color="currentColor"
                    />
                    {t("wallet.activities.addCustomAssetAction")}
                  </SharedButton>
                </div>
                {showHiddenAssets && (
                  <WalletHiddenAssets
                    assetAmounts={
                      // FIXME: Refactor AnyAsset type
                      unverifiedAssetAmounts as CompleteAssetAmount<SwappableAsset>[]
                    }
                  />
                )}
              </>
            )}
            {panelNumber === 1 &&
              NETWORKS_SUPPORTING_NFTS.has(selectedNetwork.chainID) && (
                <NFTListCurrentWallet />
              )}
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
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            overflow-x: hidden;
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
          .add_custom_asset {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 0;
            margin: 0px 16px;
          }
          .add_custom_asset span {
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            letter-spacing: 0em;
            text-align: left;
            color: var(--green-40);
          }
          .line {
            border-bottom: 1px solid var(--green-80);
            margin-bottom: 8px;
          }
        `}
      </style>
    </>
  )
}
