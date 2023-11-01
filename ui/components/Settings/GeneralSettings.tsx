import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import {
  selectHideBanners,
  toggleHideBanners,
} from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SettingButton from "../../pages/Settings/SettingButton"
import { getAvalableLanguages, getLanguageIndex } from "../../_locales"
import { getLanguage, setLanguage } from "../../_locales/i18n"
import SharedSelect from "../Shared/SharedSelect"
import SharedToggleButton from "../Shared/SharedToggleButton"
import SettingsGroup from "./SettingsGroup"
import SettingsRow from "./SettingsRow"

export default function GeneralSettings(): ReactElement {
  const { t } = useTranslation()

  const dispatch = useBackgroundDispatch()

  const langOptions = getAvalableLanguages()
  const langIdx = getLanguageIndex(getLanguage())

  const hideBanners = useBackgroundSelector(selectHideBanners)
  const toggleHideNotificationBanners = (toggleValue: boolean) => {
    dispatch(toggleHideBanners(!toggleValue))
  }

  return (
    <SettingsGroup title={t("settings.group.general")}>
      <SettingsRow>
        <SettingButton
          link="/settings/connected-websites"
          label={t("settings.connectedWebsites")}
          ariaLabel={t("settings.connectedWebsitesSettings.ariaLabel")}
          icon="continue"
        />
      </SettingsRow>
      <SettingsRow>
        <SettingButton
          link="/settings/analytics"
          label={t("settings.analytics")}
          ariaLabel={t("settings.analyticsSetUp.ariaLabel")}
          icon="continue"
        />
      </SettingsRow>
      {isEnabled(FeatureFlags.SUPPORT_MULTIPLE_LANGUAGES) && (
        <SettingsRow title={t("settings.language")}>
          <SharedSelect
            width={194}
            options={langOptions}
            onChange={setLanguage}
            defaultIndex={langIdx}
          />
        </SettingsRow>
      )}
      {isEnabled(FeatureFlags.SUPPORT_ACHIEVEMENTS_BANNER) && (
        <SettingsRow title={t("settings.showBanners")}>
          <SharedToggleButton
            onChange={toggleHideNotificationBanners}
            value={!hideBanners}
          />
        </SettingsRow>
      )}
    </SettingsGroup>
  )
}
