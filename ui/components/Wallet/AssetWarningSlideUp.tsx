// @ts-check

import React, { ReactElement } from "react"
import { SmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import { useTranslation } from "react-i18next"
import { updateAssetTrustStatus } from "@tallyho/tally-background/redux-slices/assets"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedBanner from "../Shared/SharedBanner"
import SharedButton from "../Shared/SharedButton"
import SharedAddress from "../Shared/SharedAddress"
import { useBackgroundDispatch } from "../../hooks"

type TitledSlideUpProps = Parameters<typeof SharedSlideUpMenu>[0] & {
  title: string
}

function TitledSlideUpMenu(props: TitledSlideUpProps): ReactElement {
  const { title, children, ...others } = props
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <SharedSlideUpMenu {...others}>
      <span className="title">
        <strong>{title}</strong>
      </span>
      {children}
      <style jsx global>{`
        div.slide_up_menu {
          padding-top: 20px !important;
        }
        button.icon {
          margin-top: 4px;
        }
        .title {
          margin-left: 24px;
        }
      `}</style>
    </SharedSlideUpMenu>
  )
}

type AssetWarningSlideUpProps = {
  asset: SmartContractFungibleAsset
  close: () => void
}

export default function AssetWarningSlideUp(
  props: AssetWarningSlideUpProps
): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.trustedAssets",
  })

  const { asset, close } = props

  const dispatch = useBackgroundDispatch()

  const setAssetTrustStatus = async (isTrusted: boolean) => {
    await dispatch(updateAssetTrustStatus({ asset, trusted: isTrusted }))
    close()
  }
  return (
    <TitledSlideUpMenu
      isOpen={asset !== null}
      size="small"
      title={t("assetImported")}
      close={close}
    >
      <style jsx global>{`
        .banner_wrap {
          margin-left: 16px !important;
          margin-top: 10px !important;
          margin-bottom: 14px;
        }
      `}</style>
      <style jsx>{`
        .warning_text {
          font-size: 16px;
          line-height: 24px;
          font-weight: 500;
          color: var(--attention);
        }
        ul.asset_details {
          margin-bottom: 30px;
        }
        ul.asset_details > li {
          margin-left: 24px;
          margin-right: 24px;
          display: flex;
          justify-content: space-between;
          height: 24px;
          align-items: center;
        }
        .right {
          float: right;
          display: flex;
          align-items: flex-end;
        }
        ul.asset_details > li.asset_name > div {
          max-width: 80%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          -o-text-overflow: ellipsis;
        }
        .asset_trust_actions {
          display: flex;
          justify-content: space-between;
          margin: 0 24px;
          margin-top: 34px;
        }
      `}</style>
      <SharedBanner icon="notif-attention" iconColor="var(--attention)">
        <span className="warning_text">{t("notVerified")}</span>
        <br />
        <span>{t("trustExplainer")}</span>
      </SharedBanner>
      <ul className="asset_details">
        <li className="asset_name">
          {t("name")}
          <div className="right">
            <strong>{`${asset?.name} (${asset?.symbol})`}</strong>
          </div>
        </li>
        <li>
          {t("contract")}
          <div className="right">
            <SharedAddress
              address={
                asset && "contractAddress" in asset && asset.contractAddress
                  ? asset.contractAddress
                  : ""
              }
            />
          </div>
        </li>
      </ul>
      <div className="asset_trust_actions">
        <SharedButton
          size="medium"
          type="secondary"
          id="close_asset_warning"
          onClick={() => setAssetTrustStatus(false)}
        >
          {t("hideAsset")}
        </SharedButton>
        <SharedButton
          size="medium"
          type="primary"
          id="close_asset_warning"
          onClick={() => setAssetTrustStatus(true)}
        >
          {t("trustAsset")}
        </SharedButton>
      </div>
    </TitledSlideUpMenu>
  )
}
