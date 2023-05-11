import React from "react"
import { SmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import { isUntrustedAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { useTranslation } from "react-i18next"
import SharedIcon from "../Shared/SharedIcon"

export default function AssetTrustToggler({
  asset,
  onClick,
}: {
  asset: SmartContractFungibleAsset
  onClick: (newStatus: boolean) => void
}): JSX.Element {
  const { t } = useTranslation()

  const isTokenListAsset = !!asset?.metadata?.tokenLists?.length
  const assetHasTrustStatus = typeof asset?.metadata?.trusted !== "undefined"
  const assetIsUntrusted = isUntrustedAsset(asset)

  const styles = (
    <style jsx>{`
      button {
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: 0em;
        text-align: left;
        display: flex;
        gap: 4px;
      }

      button.trust_asset:hover {
        color: var(--white);
      }

      button.trust_asset {
        color: var(--success);
      }

      button.hide_asset:hover {
        color: var(--green-20);
      }

      button.hide_asset {
        color: var(--green-40);
      }
    `}</style>
  )

  if (isTokenListAsset && !assetHasTrustStatus) {
    return (
      <>
        {styles}
        <button
          className="hide_asset"
          type="button"
          onClick={() => onClick(false)}
        >
          {t("assets.hideAsset")}
          <SharedIcon
            color="currentColor"
            icon="icons/m/eye-off.svg"
            width={24}
          />
        </button>
      </>
    )
  }

  return (
    <>
      {styles}
      {assetIsUntrusted ? (
        <button
          className="trust_asset"
          type="button"
          onClick={() => onClick(true)}
        >
          {t("assets.trustAsset")}
          <SharedIcon
            color="currentColor"
            icon="icons/m/eye-on.svg"
            width={24}
          />
        </button>
      ) : (
        <button
          className="hide_asset"
          type="button"
          onClick={() => onClick(false)}
        >
          {t("assets.hideAsset")}
          <SharedIcon
            color="currentColor"
            icon="icons/m/eye-off.svg"
            width={24}
          />
        </button>
      )}
    </>
  )
}
