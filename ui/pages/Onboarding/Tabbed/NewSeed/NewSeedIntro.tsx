import React, { ReactElement } from "react"
import { Trans, useTranslation } from "react-i18next"
import SharedButton from "../../../../components/Shared/SharedButton"
import OnboardingTip from "../OnboardingTip"

export default function NewSeedIntro({
  onAccept,
}: {
  onAccept: () => void
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.newWalletIntro",
  })

  return (
    <section className="step_content fade_in">
      <h1 className="center_text">{t("title")}</h1>
      <div className="message">
        <div className="message_header">
          <img
            className="message_icon"
            src="./images/message_warning.png"
            alt="warning"
          />
        </div>
        <p>
          <Trans t={t} i18nKey="warning" components={{ u: <u /> }} />
        </p>
      </div>
      <div className="cta">
        <SharedButton type="primary" size="large" onClick={onAccept} center>
          {t("submit")}
        </SharedButton>
      </div>

      <OnboardingTip>{t("tip")}</OnboardingTip>
      <style jsx>{`
        .step_content {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          max-width: 380px;
          margin: 0 auto;
        }

        section h1 {
          font-family: "Quincy CF";
          font-style: normal;
          font-weight: 500;
          font-size: 36px;
          line-height: 42px;
          margin: 45px 0 48px;
        }

        .message {
          background: var(--green-95);
          border-radius: 8px;
          font-weight: 600;
          color: var(--green-20);
          padding: 24px 29px 32px;
          margin: 15px 0 24px;
          display: flex;
          flex-direction: column;
        }

        .message p {
          margin: 0;
          font-family: "Segment";
          font-style: normal;
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          color: var(--green-20);
          text-align: left;
        }

        .message_header {
          display: flex;
          align-items: center;
          font-weight: 600;
          font-size: 18px;
          color: var(--attention);
        }

        .message_icon {
          height: 54px;
          margin: 10px auto;
        }

        .cta {
          display: flex;
          flex-direction: column;
          width: 100%;
          margin-bottom: 40px;
        }
      `}</style>
    </section>
  )
}
