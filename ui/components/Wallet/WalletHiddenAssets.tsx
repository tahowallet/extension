import React, { ReactElement, useEffect, useRef, useState } from "react"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { SwappableAsset } from "@tallyho/tally-background/assets"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import WalletAssetList from "./WalletAssetList"
import SharedButton from "../Shared/SharedButton"
import { useIsMounted } from "../../hooks/react-hooks"
import UnverifiedAssetBanner from "./UnverifiedAsset/UnverifiedAssetBanner"
import { useBackgroundSelector } from "../../hooks"

type WalletHiddenAssetsProps = {
  assetAmounts: CompleteAssetAmount<SwappableAsset>[]
}

export default function WalletHiddenAssets({
  assetAmounts,
}: WalletHiddenAssetsProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet",
  })
  const selectedAccount = useBackgroundSelector(selectCurrentAccount)

  const mountedRef = useIsMounted()
  const hiddenAssetsRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLDivElement | null>(null)
  const [maxHeight, setMaxHeight] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const stateOfHiddenAssets = isOpen
    ? t("unverifiedAssets.stateOfHiddenAssets1")
    : t("unverifiedAssets.stateOfHiddenAssets2")

  useEffect(() => {
    if (hiddenAssetsRef.current) {
      setMaxHeight(hiddenAssetsRef.current.scrollHeight)
    }
  }, [hiddenAssetsRef?.current?.scrollHeight])

  useEffect(() => {
    setIsOpen(false)
  }, [selectedAccount])

  return (
    <>
      <div className="hidden_assets_button" ref={buttonRef}>
        <SharedButton
          type="tertiaryGray"
          size="small"
          onClick={() => {
            setIsOpen((prevState) => !prevState)
            setTimeout(() => {
              if (!isOpen) {
                buttonRef.current?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            }, 500)
          }}
        >
          {t("unverifiedAssets.hiddenAssets", {
            stateOfHiddenAssets,
            amount: assetAmounts.length,
          })}
        </SharedButton>
      </div>

      <div
        ref={hiddenAssetsRef}
        className={classNames({
          hidden_assets: mountedRef.current,
          visible: mountedRef.current && isOpen,
        })}
      >
        <UnverifiedAssetBanner
          id="unverified_asset_banner"
          title={t("verifiedAssets.banner.titleUnverified")}
          description={t("verifiedAssets.banner.description")}
          customStyles="margin-bottom: 16px;"
        />
        <WalletAssetList
          assetAmounts={assetAmounts}
          initializationLoadingTimeExpired
        />
      </div>
      <style jsx>{`
        .hidden_assets {
          max-height: 0px;
          overflow: hidden;
          transition: max-height 500ms ease-out;
        }
        .hidden_assets.visible {
          max-height: ${maxHeight}px;
          transition: max-height 500ms ease-in;
        }
        .hidden_assets_button {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 8px 0 16px;
        }
      `}</style>
    </>
  )
}
