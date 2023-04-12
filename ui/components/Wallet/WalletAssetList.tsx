import React, { ReactElement, useState } from "react"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import { useTranslation } from "react-i18next"
import { useHistory } from "react-router-dom"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import WalletAssetListItem from "./WalletAssetListItem"
import AssetWarningSlideUp from "./AssetWarningSlideUp"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"

type WalletAssetListProps = {
  assetAmounts: CompleteAssetAmount[]
  initializationLoadingTimeExpired: boolean
}

export default function WalletAssetList(
  props: WalletAssetListProps
): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.activities",
  })

  const history = useHistory()

  const { assetAmounts, initializationLoadingTimeExpired } = props

  const [warnedAsset, setWarnedAsset] = useState<
    CompleteAssetAmount["asset"] | null
  >(null)

  if (!assetAmounts) return <></>

  return (
    <>
      <AssetWarningSlideUp
        asset={warnedAsset}
        close={() => setWarnedAsset(null)}
      />
      <ul>
        {assetAmounts.map((assetAmount) => (
          <WalletAssetListItem
            assetAmount={assetAmount}
            key={assetAmount.asset.symbol}
            initializationLoadingTimeExpired={initializationLoadingTimeExpired}
            onUntrustedAssetWarningClick={(asset) => setWarnedAsset(asset)}
          />
        ))}
        {!initializationLoadingTimeExpired && (
          <li className="loading">{t("loadingActivities")}</li>
        )}
        {isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORKS) && (
          <li className="add_custom_asset">
            <span>{t("addCustomAssetPrompt")}</span>
            <SharedButton
              size="medium"
              onClick={() => history.push("/settings/add-custom-asset")}
              type="tertiary"
            >
              <SharedIcon
                width={16}
                height={16}
                customStyles="margin-right: 4px"
                icon="icons/s/add.svg"
                color="currentColor"
              />
              {t("addCustomAssetAction")}
            </SharedButton>
          </li>
        )}
        <style jsx>{`
          .add_custom_asset {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 0;
          }

          .add_custom_asset span {
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            letter-spacing: 0em;
            text-align: left;
            color: var(--green-40);
          }

          .loading {
            display: flex;
            justify-content: center;
            padding-top: 5px;
            padding-bottom: 40px;
            color: var(--green-60);
            font-size: 15px;
          }
        `}</style>
      </ul>
    </>
  )
}
