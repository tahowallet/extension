import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import LedgerContinueButton from "../../components/Ledger/LedgerContinueButton"
import LedgerPanelContainer from "../../components/Ledger/LedgerPanelContainer"
import SharedIcon from "../../components/Shared/SharedIcon"
import { useBackgroundSelector } from "../../hooks"
import LedgerSelectNetwork from "../../components/Ledger/LedgerSelectNetwork"

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
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  const buttonLabel = initialScreen ? t("continueButton") : t("tryAgainButton")
  const subHeadingWord = initialScreen
    ? t("subheadingWord1")
    : t("subheadingWord2")
  const warningText =
    deviceCount === 0 ? t("noLedgerConnected") : t("multipleLedgersConnected")
  const [isNetworkSelected, setIsNetworkSelected] = useState(false)

  if (!isNetworkSelected) {
    return <LedgerSelectNetwork onContinue={() => setIsNetworkSelected(true)} />
  }

  return (
    <LedgerPanelContainer
      indicatorImageSrc="/images/connect_ledger_indicator_disconnected.svg"
      heading={initialScreen ? t("initialScreenHeader") : t("header")}
      subHeading={t("subheading", {
        subheadingWord: subHeadingWord,
      })}
    >
      {isNetworkSelected && (
        <SharedIcon
          icon="icons/s/back.svg"
          width={30}
          height={30}
          color="var(--green-40)"
          onClick={(e) => {
            e.stopPropagation()
            setIsNetworkSelected(false)
          }}
          customStyles={`
                position: absolute;
                top: 45px;
                left: -45px;
              `}
        />
      )}
      {!initialScreen && deviceCount !== 1 ? (
        <div className="steps">
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
        <li>{t("step3", { network: selectedNetwork.name })}</li>
      </ol>
      <LedgerContinueButton onClick={onContinue}>
        {buttonLabel}
      </LedgerContinueButton>
      <style jsx>{`
        .steps {
          list-style: none;
          padding: 0.5rem;
          counter-reset: step;
          background-color: var(--hunter-green);
        }

        .steps > li {
          display: flex;
          align-items: center;
          font-size: 22px;
          font-weight: 500;
          line-height: 32px;
        }

        .steps > li::before {
          content: counter(step);
          counter-increment: step;
          display: inline-block;
          width: 2.5rem;
          height: 2.5rem;
          margin: 1rem;
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

        .error {
          color: var(--error);
          font-weight: 600;
          font-size: 18px;
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
