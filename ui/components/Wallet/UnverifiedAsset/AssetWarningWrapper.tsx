import React, { ReactElement, useEffect, useState } from "react"
import { SmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import { Activity } from "@tallyho/tally-background/redux-slices/activities"
import { useTranslation } from "react-i18next"
import SharedSlideUpMenu from "../../Shared/SharedSlideUpMenu"
import WalletActivityDetails from "../WalletActivityDetails"
import AssetWarning from "./AssetWarning"

type AssetWarningWrapperProps = {
  asset: SmartContractFungibleAsset | null
  close: () => void
}

export default function AssetWarningWrapper(
  props: AssetWarningWrapperProps
): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.verifiedAssets",
  })
  const { asset, close } = props

  const [showAssetWarning, setShowAssetWarning] = useState(!!asset)
  const [activityDetails, setActivityDetails] = useState<
    { activityItem: Activity; activityInitiatorAddress: string } | undefined
  >(undefined)

  useEffect(() => {
    setShowAssetWarning(!!asset)
  }, [asset])

  return (
    <>
      <SharedSlideUpMenu
        header={t("assetImported")}
        isOpen={showAssetWarning}
        size="auto"
        close={() => close()}
      >
        {asset && (
          <AssetWarning
            asset={asset}
            close={() => close()}
            openActivityDetails={(newActivityDetails) => {
              setActivityDetails(newActivityDetails)
              setShowAssetWarning(false)
            }}
          />
        )}
      </SharedSlideUpMenu>

      <SharedSlideUpMenu
        isOpen={!!activityDetails}
        size="custom"
        close={() => {
          setActivityDetails(undefined)
          setShowAssetWarning(true)
        }}
      >
        {activityDetails && (
          <WalletActivityDetails
            activityItem={activityDetails.activityItem}
            activityInitiatorAddress={activityDetails.activityInitiatorAddress}
          />
        )}
      </SharedSlideUpMenu>
    </>
  )
}
