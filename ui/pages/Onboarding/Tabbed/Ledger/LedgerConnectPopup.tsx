import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import LedgerPanelContainer from "../../../../components/Ledger/LedgerPanelContainer"

// FIXME: This component isn't being used anymore in the new onboarding flow
// due to the styles for the connect usb popup arrows being broken
export default function LedgerConnectPopup(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.onboarding",
  })
  return (
    <>
      <LedgerPanelContainer indicatorImageSrc="/images/connect_ledger_indicator_disconnected.svg" />
      <div className="help select_device_help">
        <div className="arrow upward_arrow" />
        <div className="main">{t("selectDevice")}</div>
      </div>
      <div className="help click_connect_help">
        <div className="arrow downward_arrow" />
        <div className="main">{t("clickConnect")}</div>
      </div>
      <style jsx>{`
        .help {
          position: absolute;
          display: flex;
          height: 0;
        }

        .select_device_help {
          flex-flow: column;
          top: 108px;
        }

        .click_connect_help {
          flex-flow: column-reverse;
          top: 400px;
        }

        .arrow {
          min-height: 3rem;
          width: 3rem;
          margin-left: -2rem;
        }

        .upward_arrow {
          background: no-repeat center / contain
            url("/images/connect_ledger_popup_underlay_upward_arrow.svg");
        }

        .downward_arrow {
          background: no-repeat center / contain
            url("/images/connect_ledger_popup_underlay_downward_arrow.svg");
        }

        .main {
          margin: 0.25rem 0;
          font-family: "Quincy CF";
          font-weight: 500;
          font-size: 36px;
          line-height: 42px;
          color: var(--green-5);
        }

        .support {
          font-weight: 500;
          font-size: 18px;
          line-height: 24px;
          color: var(--green-40);
        }
      `}</style>
    </>
  )
}
