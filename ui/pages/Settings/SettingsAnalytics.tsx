import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../../components/Shared/SharedButton"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"
import SharedToggleButton from "../../components/Shared/SharedToggleButton"

export default function SettingsAnalytics(): ReactElement {
  const { t } = useTranslation()
  const prefix = "settings.analyticsSetUp"

  return (
    <div className="standard_width_padded analytics_wrapper">
      <SharedPageHeader withoutBackText>
        {t(`${prefix}.title`)}
      </SharedPageHeader>
      <section className="toggle_container">
        <div className="header_container">
          <div className="title_container">
            <img
              className="icon"
              src="./images/message_correct.png"
              alt="correct"
            />
            <h2>{t(`${prefix}.toggleTitle`)}</h2>
          </div>
          <SharedToggleButton onChange={() => {}} value={false} />
        </div>
        <p className="toggle_description text">{t(`${prefix}.toggleDesc`)}</p>
      </section>
      <section>
        <h2 className="title_success">{t(`${prefix}.recordTitle`)}</h2>
        <ul className="list">
          {["Orders", "Accounts", "Gas"].map((value) => (
            <li key={value} className="list_item text">
              {t(`${prefix}.recordItem${value}`)}
            </li>
          ))}
        </ul>
        <h2 className="title_error">{t(`${prefix}.noRecordTitle`)}</h2>
        <ul className="list">
          {["Seed", "Transactions"].map((value) => (
            <li key={value} className="list_item text">
              {t(`${prefix}.noRecordItem${value}`)}
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
        >
          {t(`${prefix}.policyBtn`)}
        </SharedButton>
        <SharedButton
          type="tertiaryError"
          size="medium"
          iconSmall="garbage"
          iconPosition="left"
        >
          {t(`${prefix}.deleteBtn`)}
        </SharedButton>
      </section>
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
