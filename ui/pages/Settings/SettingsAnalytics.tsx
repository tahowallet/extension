import { WEBSITE_ORIGIN } from "@tallyho/tally-background/constants/website"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import {
  deleteAnalyticsData,
  selectCollectAnalytics,
  updateAnalyticsPreferences,
} from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch, useSelector } from "react-redux"
import AnalyticsSlideUpMenu from "../../components/Analytics/AnalyticsSlideUpMenu"
import SharedButton from "../../components/Shared/SharedButton"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"
import SharedToggleButton from "../../components/Shared/SharedToggleButton"

/* List items */

const analyticsRecordedItems = ["Trends", "Usage"] as const

const analyticsNotRecordedItems = ["Seed", "Info", "Balances"] as const

export default function SettingsAnalytics(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "settings.analyticsSetUp",
  })
  const dispatch = useDispatch()
  const collectAnalytics = useSelector(selectCollectAnalytics)
  const [showAnalyticsMenu, setShowAnalyticsMenu] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)

  const handleToggleChange = (toggleValue: boolean) => {
    if (toggleValue) {
      dispatch(updateAnalyticsPreferences(true))
    } else {
      setShowAnalyticsMenu(true)
    }
  }

  const handleCollectAnalyticsSubmit = () => {
    dispatch(updateAnalyticsPreferences(false))
    setShowAnalyticsMenu(false)
  }

  const handleDeleteSubmit = () => {
    dispatch(deleteAnalyticsData())
    setShowDeleteMenu(false)
  }

  return (
    <div className="standard_width_padded analytics_wrapper">
      <SharedPageHeader withoutBackText backPath="/settings">
        {t("title")}
      </SharedPageHeader>
      <section className="toggle_container">
        <div className="header_container">
          <div className="title_container">
            <img
              className="icon"
              src={`./images/message_${
                collectAnalytics ? "correct" : "error"
              }.png`}
              alt={collectAnalytics ? "correct" : "error"}
            />
            <h2>{t(`toggleTitle${collectAnalytics ? "On" : "Off"}`)}</h2>
          </div>
          <SharedToggleButton
            value={collectAnalytics}
            onChange={(toggleValue) => {
              handleToggleChange(toggleValue)
            }}
          />
        </div>
        <p className="toggle_description simple_text">{t(`toggleDesc`)}</p>
      </section>
      <section>
        <h2 className="title_success">{t(`recordTitle`)}</h2>
        <ul className="list">
          {analyticsRecordedItems.map((value) => (
            <li key={value} className="list_item simple_text">
              {t(`recordItem${value}`)}
            </li>
          ))}
        </ul>
        <h2 className="title_error">{t(`noRecordTitle`)}</h2>
        <ul className="list">
          {analyticsNotRecordedItems.map((value) => (
            <li key={value} className="list_item simple_text">
              {t(`noRecordItem${value}`)}
            </li>
          ))}
        </ul>
      </section>
      <section className="btn_container">
        <SharedButton
          type="tertiary"
          size="medium"
          iconSmall="new-tab"
          iconPosition="left"
          onClick={() =>
            window.open(`${WEBSITE_ORIGIN}/privacy/`, "_blank")?.focus()
          }
        >
          {t(`policyBtn`)}
        </SharedButton>
        {isEnabled(FeatureFlags.SHOW_ANALYTICS_DELETE_DATA_BUTTON) && (
          <SharedButton
            type="tertiaryError"
            size="medium"
            iconSmall="garbage"
            iconPosition="left"
            isDisabled={!collectAnalytics}
            onClick={() => setShowDeleteMenu(true)}
          >
            {t(`deleteBtn`)}
          </SharedButton>
        )}
      </section>
      <AnalyticsSlideUpMenu
        isOpen={showAnalyticsMenu}
        onCancel={() => setShowAnalyticsMenu(false)}
        onSubmit={() => handleCollectAnalyticsSubmit()}
        prefix="settings.analyticsSetUp.analyticsOffSlideUpMenu"
      />
      <AnalyticsSlideUpMenu
        isOpen={showDeleteMenu}
        onCancel={() => setShowDeleteMenu(false)}
        onSubmit={() => handleDeleteSubmit()}
        prefix="settings.analyticsSetUp.deleteSlideUpMenu"
      />
      <style jsx>{`
        h2 {
          color: var(--green-20);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          margin: 0;
        }
        .analytics_wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .toggle_container {
          border-radius: 15px;
          padding: 24px 20px;
          background-color: var(--green-120);
        }
        .header_container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title_container {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .icon {
          height: 34px;
        }
        .toggle_description {
          margin: 0;
          margin-top: 16px;
        }
        .title_success {
          color: var(--success);
        }
        .title_error {
          color: var(--error);
        }
        .list {
          display: flex;
          flex-flow: column;
          margin: 16px 0;
          padding-left: 25px;
        }
        .list_item {
          display: list-item;
          line-height: 24px;
          list-style-type: disc;
        }
        .btn_container {
          display: flex;
          justify-content: space-between;
        }
      `}</style>
    </div>
  )
}
