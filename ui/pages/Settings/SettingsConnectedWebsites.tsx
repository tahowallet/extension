import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"

export default function SettingsConnectedWebsites(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "settings" })

  return (
    <div className="standard_width_padded">
      <SharedPageHeader withoutBackText>
        {t(`connectedWebsitesSettings.title`)}
      </SharedPageHeader>
    </div>
  )
}
