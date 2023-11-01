import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SettingButton from "../../pages/Settings/SettingButton"
import SettingsGroup from "./SettingsGroup"
import SettingsRow from "./SettingsRow"

const FAQ_URL =
  "https://notion.taho.xyz/Tally-Ho-Knowledge-Base-4d95ed5439c64d6db3d3d27abf1fdae5"

export default function HelpCenter(): ReactElement {
  const { t } = useTranslation()

  return (
    <SettingsGroup title={t("settings.group.helpCenter")}>
      <SettingsRow>
        <SettingButton
          link="/settings/export-logs"
          label={t("settings.bugReport")}
          ariaLabel={t("settings.exportLogs.ariaLabel")}
          icon="continue"
        />
      </SettingsRow>
      <SettingsRow>
        <SettingButton
          label={t("settings.needHelp")}
          ariaLabel={t("settings.needHelp")}
          icon="new-tab"
          onClick={() => window.open(FAQ_URL, "_blank")?.focus()}
        />
      </SettingsRow>
    </SettingsGroup>
  )
}
