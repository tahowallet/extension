import {
  selectShowAnalyticsNotification,
  setShowAnalyticsNotification,
} from "@tallyho/tally-background/redux-slices/ui"
import classNames from "classnames"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"
import { useBackgroundSelector } from "../../hooks"

import SharedBanner from "../Shared/SharedBanner"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"

export default function WalletAnalyticsNotificationBanner(): ReactElement {
  const { t } = useTranslation("translation")
  const dispatch = useDispatch()

  const showNotification = useBackgroundSelector(
    selectShowAnalyticsNotification
  )

  return (
    <div
      className={classNames("container", {
        hide: !showNotification,
      })}
    >
      <SharedBanner customStyles="width: 100%; box-sizing: border-box;">
        <div className="content_container">
          <SharedIcon
            icon="icons/m/notif-correct.svg"
            width={24}
            color="var(--success)"
            customStyles="flex-shrink:0;"
          />
          <div className="content">
            <h1>{t("wallet.analyticsNotification.title")}</h1>
            <span>{t("wallet.analyticsNotification.description")}</span>
            <SharedButton
              style={{ height: "auto", margin: "8px 0" }}
              size="medium"
              type="tertiary"
              linkTo="/settings/analytics"
              iconSmall="settings"
              iconPosition="left"
            >
              {t("wallet.analyticsNotification.settingsLink")}
            </SharedButton>
          </div>
          <SharedIcon
            onClick={() => dispatch(setShowAnalyticsNotification(false))}
            icon="icons/s/close.svg"
            ariaLabel={t("shared.close")}
            width={16}
            color="var(--green-40)"
            hoverColor="var(--green-20)"
            customStyles="flex-shrink:0;"
          />
        </div>
      </SharedBanner>
      <style jsx>{`
        .container {
          margin: 0 8px;
          max-height: 200px;
          transition: all 500ms ease;
        }
        .container.hide {
          max-height: 0;
          pointer-events: none;
          opacity: 0;
        }
        .content_container {
          display: flex;
          flex-direction: row;
          align-items: start;
        }
        .content {
          flex-direction: column;
          flex-grow: 1;
          margin: 0 8px;
        }
        h1 {
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: #b4cac9;
          margin: 0 0 8px;
        }
        span {
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          color: #789594;
        }
      `}</style>
    </div>
  )
}
