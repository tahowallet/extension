import React, { ReactElement } from "react"
import { Trans, useTranslation } from "react-i18next"
import {
  selectMainCurrencySign,
  userValueDustThreshold,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  selectAutoLockTimer as selectAutoLockInterval,
  selectHideDust,
  selectShowTestNetworks,
  selectShowUnverifiedAssets,
  selectUseFlashbots,
  toggleFlashbots,
  toggleHideDust,
  toggleShowUnverifiedAssets,
  toggleTestNetworks,
  updateAutoLockInterval,
} from "@tallyho/tally-background/redux-slices/ui"
import { FLASHBOTS_DOCS_URL, MINUTE } from "@tallyho/tally-background/constants"
import SettingButton from "../../pages/Settings/SettingButton"
import SettingsGroup from "./SettingsGroup"
import SettingsRow from "./SettingsRow"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedTooltip from "../Shared/SharedTooltip"
import SharedLink from "../Shared/SharedLink"
import SharedToggleButton from "../Shared/SharedToggleButton"
import SharedSelect from "../Shared/SharedSelect"

const AUTO_LOCK_OPTIONS = [
  { label: "5", value: 5 * MINUTE },
  { label: "15", value: 15 * MINUTE },
  { label: "30", value: 30 * MINUTE },
  { label: "60", value: 60 * MINUTE },
]

export default function WalletSettings(): ReactElement {
  const { t } = useTranslation()

  const dispatch = useBackgroundDispatch()
  const mainCurrencySign = useBackgroundSelector(selectMainCurrencySign)

  const hideDust = useBackgroundSelector(selectHideDust)
  const toggleHideDustAssets = (toggleValue: boolean) => {
    dispatch(toggleHideDust(toggleValue))
  }

  const showUnverifiedAssets = useBackgroundSelector(selectShowUnverifiedAssets)
  const toggleShowUnverified = (toggleValue: boolean) => {
    dispatch(toggleShowUnverifiedAssets(toggleValue))
  }

  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)
  const toggleShowTestNetworks = (defaultWalletValue: boolean) => {
    dispatch(toggleTestNetworks(defaultWalletValue))
  }

  const useFlashbots = useBackgroundSelector(selectUseFlashbots)
  const toggleFlashbotsRPC = (value: boolean) =>
    dispatch(toggleFlashbots(value))

  const autoLockInterval = useBackgroundSelector(selectAutoLockInterval)
  const setAutoLockInterval = (newValue: string) => {
    const selectedOption = AUTO_LOCK_OPTIONS.find(
      ({ value: optionValue }) => String(optionValue) === newValue
    )

    if (selectedOption === undefined) {
      throw new Error("Unknown auto-lock option passed.")
    }

    dispatch(updateAutoLockInterval(selectedOption.value))
  }

  return (
    <SettingsGroup title={t("settings.group.walletOptions")}>
      <SettingsRow
        title={t("settings.hideSmallAssetBalance", {
          amount: userValueDustThreshold,
          sign: mainCurrencySign,
        })}
      >
        <SharedToggleButton
          onChange={(toggleValue) => toggleHideDustAssets(toggleValue)}
          value={hideDust}
        />
      </SettingsRow>
      <SettingsRow
        title={t("settings.showUnverifiedAssets")}
        tooltip={
          <SharedTooltip width={190} customStyles={{ marginLeft: "4" }}>
            <Trans t={t} i18nKey="settings.unverifiedAssets.tooltip" />
          </SharedTooltip>
        }
      >
        <SharedToggleButton
          onChange={(toggleValue) => toggleShowUnverified(toggleValue)}
          value={showUnverifiedAssets}
        />
      </SettingsRow>
      <SettingsRow>
        <SettingButton
          link="/settings/custom-networks"
          label={t("settings.customNetworks")}
          ariaLabel={t("settings.customNetworksSettings.ariaLabel")}
          icon="continue"
        />
      </SettingsRow>
      <SettingsRow>
        <SettingButton
          link="/settings/add-custom-asset"
          label={t("settings.addCustomAsset")}
          ariaLabel={t("settings.connectedWebsitesSettings.ariaLabel")}
          icon="continue"
        />
      </SettingsRow>
      <SettingsRow title={t("settings.enableTestNetworks")}>
        <SharedToggleButton
          onChange={(toggleValue) => toggleShowTestNetworks(toggleValue)}
          value={showTestNetworks}
        />
      </SettingsRow>
      <SettingsRow
        title={t("settings.useFlashbots")}
        tooltip={
          <SharedTooltip
            width={165}
            customStyles={{ marginLeft: "4" }}
            verticalPosition="top"
          >
            <Trans
              t={t}
              i18nKey="settings.useFlashbotsTooltip"
              components={{
                url: <SharedLink type="tooltip" url={FLASHBOTS_DOCS_URL} />,
              }}
            />
          </SharedTooltip>
        }
      >
        <SharedToggleButton
          onChange={(toggleValue) => toggleFlashbotsRPC(toggleValue)}
          value={useFlashbots}
        />
      </SettingsRow>
      <SettingsRow
        title={t("settings.autoLockTimer.label")}
        tooltip={
          <SharedTooltip width={190} customStyles={{ marginLeft: "4" }}>
            <div className="tooltip">
              <span>{t("settings.autoLockTimer.tooltip")}</span>
            </div>
          </SharedTooltip>
        }
      >
        <>
          <div className="select_wrapper">
            <SharedSelect
              options={AUTO_LOCK_OPTIONS.map((item) => ({
                label: t("settings.autoLockTimer.interval", {
                  time: item.label,
                }),
                value: String(item.value),
              }))}
              defaultIndex={AUTO_LOCK_OPTIONS.findIndex(
                ({ value }) => value === autoLockInterval
              )}
              width="100%"
              onChange={setAutoLockInterval}
            />
          </div>
          <style jsx>
            {`
              .select_wrapper {
                width: 118px;
                z-index: 2;
              }
            `}
          </style>
        </>
      </SettingsRow>
    </SettingsGroup>
  )
}
