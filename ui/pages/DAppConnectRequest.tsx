import React, { ReactElement } from "react"
import { selectAccountTotals } from "@tallyho/tally-background/redux-slices/selectors"
import CorePage from "../components/Core/CorePage"
import SharedButton from "../components/Shared/SharedButton"
import SharedPanelAccountItem from "../components/Shared/SharedPanelAccountItem"
import { useBackgroundSelector } from "../hooks"

function RequestingDAppBlock(props: { title: string; url: string }) {
  const { title, url } = props
  return (
    <div className="request_wrap">
      <div className="dapp_favicon" />
      <div className="info">
        <div className="dapp_title">{title}</div>
        <div className="dapp_url">{url}</div>
      </div>
      <style jsx>{`
        .request_wrap {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .dapp_favicon {
          background: url("${url}/favicon.ico");
          background-size: cover;
          width: 48px;
          height: 48px;
          border-radius: 12px;
        }
        .dapp_title {
          color: #fff;
          font-size: 16px;
          font-weight: 500;
        }
        .dapp_url {
          color: var(--green-40);
          font-size: 16px;
        }
        .info {
          margin-left: 16px;
        }
      `}</style>
    </div>
  )
}
export default function DAppConnectRequest(): ReactElement {
  const accountTotals = useBackgroundSelector(selectAccountTotals)
  const selectedAccount = useBackgroundSelector((background) => {
    return background.ui.selectedAccount?.address
  })

  const selectedAccountTotal = accountTotals.filter(
    (accountTotal) => accountTotal.address === selectedAccount
  )[0]

  const lowerCaseAddress = selectedAccountTotal.address.toLocaleLowerCase()
  return (
    <div className="page">
      <CorePage hasTopBar={false} hasTabBar={false}>
        <section className="standard_width_padded">
          <h2 className="serif_header">Connect to dApp</h2>
          <ConnectionDestination />
          <ConnectionDestination />
          <ul>
            <li>dApp would permission to:</li>
          <div className="connection_destination">
            <SharedPanelAccountItem
              key={lowerCaseAddress}
              accountTotal={selectedAccountTotal}
              hideMenu
            />
          </div>
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
