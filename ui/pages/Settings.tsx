import React, { ReactElement, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import {
  setNewDefaultWalletValue,
  selectDefaultWallet,
  selectHideDust,
  toggleHideDust,
  selectShowTestNetworks,
  toggleTestNetworks,
  toggleHideBanners,
  selectHideBanners,
  toggleUntrustedAssets,
  selectShowUntrustedAssets,
} from "@tallyho/tally-background/redux-slices/ui"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { useHistory } from "react-router-dom"
import { selectMainCurrencySign } from "@tallyho/tally-background/redux-slices/selectors"
import SharedToggleButton from "../components/Shared/SharedToggleButton"
import SharedSelect from "../components/Shared/SharedSelect"
import { getLanguageIndex, getAvalableLanguages } from "../_locales"
import { getLanguage, setLanguage } from "../_locales/i18n"
import SettingButton from "./Settings/SettingButton"
import { useBackgroundSelector } from "../hooks"
import SharedIcon from "../components/Shared/SharedIcon"

const NUMBER_OF_CLICKS_FOR_DEV_PANEL = 15
const FAQ_URL =
  "https://notion.taho.xyz/Tally-Ho-Knowledge-Base-4d95ed5439c64d6db3d3d27abf1fdae5"
const FOOTER_ACTIONS = [
  {
    icon: "icons/m/discord",
    linkTo: "https://chat.taho.xyz/",
  },
  {
    icon: "twitter",
    linkTo: "https://twitter.com/taho_xyz",
  },
  {
    icon: "icons/m/github",
    linkTo: "https://github.com/tallyhowallet/extension",
  },
]

function VersionLabel(): ReactElement {
  const { t } = useTranslation()
  const history = useHistory()
  const [clickCounter, setClickCounter] = useState(0)
  const [isHover, setIsHover] = useState(false)

  useEffect(() => {
    if (
      isEnabled(FeatureFlags.SWITCH_RUNTIME_FLAGS) &&
      clickCounter === NUMBER_OF_CLICKS_FOR_DEV_PANEL &&
      isHover
    ) {
      setIsHover(false)
      setClickCounter(0)
      history.push("/dev")
    }
  }, [clickCounter, history, isHover])

  return (
    <div className="version">
      <button
        type="button"
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onClick={() => setClickCounter((prevState) => prevState + 1)}
      >
        {t("settings.versionLabel", {
          version: process.env.VERSION ?? t("settings.unknownVersionOrCommit"),
        })}
        {process.env.COMMIT_SHA?.slice(0, 7) ??
          t("settings.unknownVersionOrCommit")}
      </button>
      <style jsx>
        {`
          .version {
            margin: 16px 0;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 500;
            margin: 0 auto;
            padding: 16px 0px;
          }
        `}
      </style>
    </div>
  )
}

function SettingRow(props: {
  title: string
  component: () => ReactElement
}): ReactElement {
  const { title, component } = props

  return (
    <li>
      <div className="left">{title}</div>
      <div className="right">{component()}</div>
      <style jsx>
        {`
          li {
            height: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .left {
            color: var(--green-20);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
        `}
      </style>
    </li>
  )
}

export default function Settings(): ReactElement {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const hideDust = useSelector(selectHideDust)
  const hideBanners = useSelector(selectHideBanners)
  const defaultWallet = useSelector(selectDefaultWallet)
  const showTestNetworks = useSelector(selectShowTestNetworks)
  const showUntrusted = useSelector(selectShowUntrustedAssets)
  const mainCurrencySign = useBackgroundSelector(selectMainCurrencySign)

  const toggleHideDustAssets = (toggleValue: boolean) => {
    dispatch(toggleHideDust(toggleValue))
  }
  const toggleDefaultWallet = (defaultWalletValue: boolean) => {
    dispatch(setNewDefaultWalletValue(defaultWalletValue))
  }

  const toggleShowTestNetworks = (defaultWalletValue: boolean) => {
    dispatch(toggleTestNetworks(defaultWalletValue))
  }

  const toggleShowUntrustedAssets = (defaultWalletValue: boolean) => {
    dispatch(toggleUntrustedAssets(defaultWalletValue))
  }

  const toggleHideNotificationBanners = (toggleValue: boolean) => {
    dispatch(toggleHideBanners(!toggleValue))
  }

  const hideSmallAssetBalance = {
    title: t("settings.hideSmallAssetBalance", {
      amount: 2,
      sign: mainCurrencySign,
    }),
    component: () => (
      <SharedToggleButton
        onChange={(toggleValue) => toggleHideDustAssets(toggleValue)}
        value={hideDust}
      />
    ),
  }

  const showUntrustedAssets = {
    title: t("settings.showUntrustedAssets"),
    component: () => (
      <SharedToggleButton
        onChange={(toggleValue) => toggleShowUntrustedAssets(toggleValue)}
        value={showUntrusted}
      />
    ),
  }

  const setAsDefault = {
    title: t("settings.setAsDefault"),
    component: () => (
      <SharedToggleButton
        onChange={(toggleValue) => toggleDefaultWallet(toggleValue)}
        value={defaultWallet}
      />
    ),
  }

  const enableTestNetworks = {
    title: t("settings.enableTestNetworks"),
    component: () => (
      <SharedToggleButton
        onChange={(toggleValue) => toggleShowTestNetworks(toggleValue)}
        value={showTestNetworks}
      />
    ),
  }

  const langOptions = getAvalableLanguages()
  const langIdx = getLanguageIndex(getLanguage())
  const languages = {
    title: t("settings.language"),
    component: () => (
      <SharedSelect
        width={194}
        options={langOptions}
        onChange={setLanguage}
        defaultIndex={langIdx}
      />
    ),
  }

  const needHelp = {
    title: "",
    component: () => (
      <SettingButton
        label={t("settings.needHelp")}
        ariaLabel={t("settings.needHelp")}
        icon="new-tab"
        onClick={() => window.open(FAQ_URL, "_blank")?.focus()}
      />
    ),
  }

  const bugReport = {
    title: "",
    component: () => (
      <SettingButton
        link="/settings/export-logs"
        label={t("settings.bugReport")}
        ariaLabel={t("settings.exportLogs.ariaLabel")}
        icon="continue"
      />
    ),
  }

  const dAppsSettings = {
    title: "",
    component: () => (
      <SettingButton
        link="/settings/connected-websites"
        label={t("settings.connectedWebsites")}
        ariaLabel={t("settings.connectedWebsitesSettings.ariaLabel")}
        icon="continue"
      />
    ),
  }

  const addCustomAsset = {
    title: "",
    component: () => (
      <SettingButton
        link="/settings/add-custom-asset"
        label={t("settings.addCustomAsset")}
        ariaLabel={t("settings.connectedWebsitesSettings.ariaLabel")}
        icon="continue"
      />
    ),
  }

  const analytics = {
    title: "",
    component: () => (
      <SettingButton
        link="/settings/analytics"
        label={t("settings.analytics")}
        ariaLabel={t("settings.analyticsSetUp.ariaLabel")}
        icon="continue"
      />
    ),
  }

  const notificationBanner = {
    title: t("settings.showBanners"),
    component: () => (
      <SharedToggleButton
        onChange={(toggleValue) => toggleHideNotificationBanners(toggleValue)}
        value={!hideBanners}
      />
    ),
  }

  const customNetworks = {
    title: "",
    component: () => (
      <SettingButton
        link="/settings/custom-networks"
        label={t("settings.customNetworks")}
        ariaLabel={t("settings.customNetworksSettings.ariaLabel")}
        icon="continue"
      />
    ),
  }

  const generalList = [
    setAsDefault,
    hideSmallAssetBalance,
    isEnabled(FeatureFlags.SUPPORT_ASSET_TRUST) && showUntrustedAssets,
    isEnabled(FeatureFlags.SUPPORT_MULTIPLE_LANGUAGES) && languages,
    enableTestNetworks,
    dAppsSettings,
    isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORKS) && addCustomAsset,
    needHelp,
    bugReport,
    isEnabled(FeatureFlags.ENABLE_ANALYTICS_DEFAULT_ON) && analytics,
    isEnabled(FeatureFlags.SUPPORT_ACHIEVEMENTS_BANNER) && notificationBanner,
    isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORKS) && customNetworks,
  ].filter((item): item is Exclude<typeof item, boolean> => !!item)

  const settings = {
    general: generalList,
  }

  return (
    <section className="standard_width_padded">
      <div className="menu">
        <h1>{t("settings.mainMenu")}</h1>
        <ul>
          {settings.general.map((setting) => (
            <SettingRow
              key={setting.title}
              title={setting.title}
              component={setting.component}
            />
          ))}
        </ul>
      </div>
      <div className="footer">
        <div className="action_icons">
          {FOOTER_ACTIONS.map(({ icon, linkTo }) => (
            <SharedIcon
              icon={`${icon}.svg`}
              width={18}
              color="var(--green-20)"
              hoverColor="var(--trophy-gold)"
              transitionHoverTime="0.2s"
              onClick={() => {
                window.open(linkTo, "_blank")?.focus()
              }}
            />
          ))}
        </div>
        <VersionLabel />
      </div>
      <style jsx>
        {`
          section {
            display: flex;
            flex-flow: column;
            justify-content: space-between;
            height: 544px;
            background-color: var(--hunter-green);
          }
          .menu {
            display: flex;
            justify-content: space-between;
            display: flex;
            flex-direction: column;
          }
          h1 {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            margin-bottom: 5px;
          }
          span {
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
          }
          .footer {
            width: 100vw;
            margin-top: 20px;
            margin-left: -24px;
            background-color: var(--green-95);
            text-align: center;
            padding-top: 16px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .action_icons {
            display: flex;
            justify-content: center;
            gap: 24px;
          }
        `}
      </style>
    </section>
  )
}
