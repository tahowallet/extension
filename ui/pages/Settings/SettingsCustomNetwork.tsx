import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import ChainList from "../../components/CustomNetwork/ChainList"
import CustomRPC from "../../components/CustomNetwork/CustomRPC"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"

export default function SettingsCustomNetwork(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "settings.customNetworkSettings",
  })

  return (
    <div className="standard_width_padded wrapper">
      <SharedPageHeader withoutBackText backPath="/settings">
        {t(`title`)}
      </SharedPageHeader>
      <section className="content">
        <ChainList />
        {isEnabled(FeatureFlags.SUPPORT_CUSTOM_RPC) && <CustomRPC />}
      </section>
      <style jsx>{`
        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .content {
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          gap: 50px;
        }
      `}</style>
    </div>
  )
}
