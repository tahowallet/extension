import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import LedgerContinueButton from "../../../../components/Ledger/LedgerContinueButton"
import LedgerPanelContainer from "../../../../components/Ledger/LedgerPanelContainer"
import OnboardingTip from "../OnboardingTip"

export default function LedgerPrepare({
  onContinue,
  initialScreen,
  deviceCount,
}: {
  onContinue: () => void
  initialScreen: boolean
  deviceCount: number
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.onboarding.prepare",
  })
  const buttonLabel = initialScreen ? t("continueButton") : t("tryAgainButton")
  const subHeadingWord = initialScreen
    ? t("subheadingWord1")
    : t("subheadingWord2")
  const warningText =
    deviceCount === 0 ? t("noLedgerConnected") : t("multipleLedgersConnected")

  const showError = !initialScreen && deviceCount !== 1
  return (
    <LedgerPanelContainer
      indicatorImage="unknown"
      heading={initialScreen ? t("initialScreenHeader") : t("header")}
      subHeading={t("subheading", {
        subheadingWord: subHeadingWord,
      })}
    >
      <div className="content" data-has-errors={showError}>
        {showError ? (
          <div className="error_container">
            <div className="box error">
              <span className="block_icon" />
              {warningText}
            </div>
            <div className="box">
              <p className="highlight_text">{t("stepsExplainer")}</p>
            </div>
          </div>
        ) : (
          <></>
        )}
        <ol className="steps">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>
        <LedgerContinueButton onClick={onContinue}>
          {buttonLabel}
        </LedgerContinueButton>
      </div>
      <OnboardingTip>{t("tip")}</OnboardingTip>
      <style jsx>{`
        .content {
          display: flex;
          flex-direction: column;
          margin: 0 auto;
        }

        .content[data-has-errors="false"] {
          margin-top: 54px;
        }

        .error_container {
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .steps {
          display: flex;
          flex-direction: column;
          gap: 32px;
          list-style: none;
          padding: 0.5rem;
          counter-reset: step;
          margin-bottom: 48px;
          align-self: center;
        }

        .steps > li {
          display: flex;
          align-items: center;
          font-size: 22px;
          font-weight: 500;
        }

        .steps > li::before {
          content: counter(step);
          counter-increment: step;
          display: inline-block;
          width: 2.5rem;
          height: 2.5rem;
          margin-right: 2rem;
          border-radius: 1.25rem;
          border: 1px solid var(--green-60);
          color: var(--green-60);
          line-height: 2.5rem;
          vertical-align: middle;
          text-align: center;
          font-style: normal;
          font-weight: 600;
          font-size: 18px;
        }

        .block_icon {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          background: no-repeat center / cover url("./images/block_icon@2x.png");
        }

        .box {
          display: flex;
          padding: 6px;
        }

        .error_container {
          margin: 16px 0;
        }
        .error {
          color: var(--error);
          font-weight: 600;
          font-size: 18px;
          justify-content: center;
        }

        .highlight_text {
          padding-left: 28px;
          margin: 0.25rem;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
        }
      `}</style>
    </LedgerPanelContainer>
  )
}
