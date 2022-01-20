import React, { ReactElement } from "react"
import LedgerPanelContainer from "./LedgerPanelContainer"

export default function LedgerConnectPopupScreen(): ReactElement {
  return (
    <>
      <LedgerPanelContainer indicatorImageSrc="/images/connect_ledger_indicator_disconnected.svg" />
      <div className="help select-device-help">
        <div className="arrow upward-arrow" />
        <div className="main">Select the device</div>
        <a href="#AAA" className="support">
          I don&rsquo;t see my device?
        </a>
      </div>
      <div className="help click-connect-help">
        <div className="arrow downward-arrow" />
        <div className="main">Click connect</div>
      </div>
      <style jsx>{`
        .help {
          position: fixed;
          left: 600px;
          display: flex;
          height: 0;
        }

        .select-device-help {
          flex-flow: column;
          top: 88px;
        }

        .click-connect-help {
          flex-flow: column-reverse;
          top: 400px;
        }

        .arrow {
          min-height: 3rem;
          width: 3rem;
          margin-left: -2rem;
        }

        .upward-arrow {
          background: no-repeat center / contain
            url("/images/connect_ledger_popup_underlay_upward_arrow.svg");
        }

        .downward-arrow {
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
          font-family: Segment;
          font-weight: 500;
          font-size: 18px;
          line-height: 24px;
          color: var(--green-40);
        }
      `}</style>
    </>
  )
}
