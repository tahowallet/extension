import React, { ReactElement } from "react"
import LedgerPanelContainer from "../../components/Ledger/LedgerPanelContainer"

export default function LedgerConnectPopup(): ReactElement {
  return (
    <>
      <LedgerPanelContainer indicatorImageSrc="/images/connect_ledger_indicator_disconnected.svg" />
      <div className="help select_device_help">
        <div className="arrow upward_arrow" />
        <div className="main">Select the device</div>
      </div>
      <div className="help click_connect_help">
        <div className="arrow downward_arrow" />
        <div className="main">Click connect</div>
      </div>
      <style jsx>{`
        .help {
          position: fixed;
          left: 600px;
          display: flex;
          height: 0;
        }

        .select_device_help {
          flex-flow: column;
          top: 104px;
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
