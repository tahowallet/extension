import React, { ReactElement } from "react"
import CorePage from "../components/Core/CorePage"
import SharedButton from "../components/Shared/SharedButton"

function ConnectionDestination() {
  return (
    <div>
      <style jsx>{`
        div {
          width: 100%;
          height: 88px;
          background-color: var(--hunter-green);
          border-radius: 8px;
        }
      `}</style>
    </div>
  )
}
export default function DAppConnectRequest(): ReactElement {
  return (
    <div className="page">
      <CorePage hasTopBar={false} hasTabBar={false}>
        <section className="standard_width_padded">
          <h2 className="serif_header">Connect to dApp</h2>
          <ConnectionDestination />
          <ConnectionDestination />
          <ul>
            <li>dApp would permission to:</li>
            <li>
              <ul>
                <li>View address of connected account</li>
                <li>Create but not sign transactions for you</li>
              </ul>
            </li>
          </ul>
          <div className="footer_actions">
            <SharedButton
              iconSize="large"
              size="large"
              type="secondary"
              onClick={() => window.close()}
            >
              Reject
            </SharedButton>
            <SharedButton type="primary" iconSize="large" size="large">
              Connect
            </SharedButton>
          </div>
        </section>
      </CorePage>
      <style jsx>{`
        section {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100vh;
        }
        .page {
          background-color: var(--green-95);
          height: 100vh;
        }
        .footer_actions {
          position: fixed;
          bottom: 0px;
          display: flex;
          width: 100%;
          padding: 0px 16px;
          box-sizing: border-box;
          align-items: center;
          height: 80px;
          justify-content: space-between;
          box-shadow: 0 0 5px rgba(0, 20, 19, 0.5);
          background-color: var(--green-95);
        }
      `}</style>
    </div>
  )
}
