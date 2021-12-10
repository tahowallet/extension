import React, { ReactElement, useCallback } from "react"
import {
  selectCurrentPendingPermission,
  selectAccountTotalsByCategory,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  denyOrRevokePermission,
  grantPermission,
} from "@tallyho/tally-background/redux-slices/dapp-permission"

import CorePage from "../components/Core/CorePage"
import SharedButton from "../components/Shared/SharedButton"
import SharedPanelAccountItem from "../components/Shared/SharedPanelAccountItem"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"

function RequestingDAppBlock(props: {
  title: string
  url: string
  favIconUrl: string
}) {
  const { title, url, favIconUrl } = props
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
          background: url("${favIconUrl}");
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
  const accountTotalsByCategory = useBackgroundSelector(
    selectAccountTotalsByCategory
  )
  const currentAccount = useBackgroundSelector((background) => {
    return background.ui.currentAccount?.address
  })

  const accountTotals = accountTotalsByCategory["read-only"]
  if (typeof accountTotalsByCategory?.imported !== "undefined") {
    accountTotals?.concat(accountTotalsByCategory?.imported)
  }

  const currentAccountTotal = accountTotals?.filter(
    (accountTotal) => accountTotal?.address === currentAccount
  )[0]

  const permission = useBackgroundSelector(selectCurrentPendingPermission)

  const dispatch = useBackgroundDispatch()

  const grant = useCallback(async () => {
    await dispatch(grantPermission({ ...permission, state: "allow" }))
    window.close()
  }, [dispatch, permission])

  const deny = useCallback(async () => {
    await dispatch(denyOrRevokePermission({ ...permission, state: "deny" }))
    window.close()
  }, [dispatch, permission])

  if (!currentAccountTotal) {
    return <></>
  }

  const lowerCaseAddress = currentAccountTotal.address.toLocaleLowerCase()

  return (
    <div className="page">
      <CorePage hasTabBar={false} hasTopBar={false}>
        <section className="standard_width">
          <h1 className="serif_header">Connect to dApp</h1>
          <div className="connection_destination">
            <RequestingDAppBlock
              title={permission.title}
              url={permission.url}
              favIconUrl={permission.favIconUrl}
            />
          </div>
          <div className="icon_connection" />
          <div className="connection_destination">
            <SharedPanelAccountItem
              key={lowerCaseAddress}
              accountTotal={currentAccountTotal}
              hideMenu
            />
          </div>
          <ul className="permissions_list">
            <li className="permissions_list_title">
              dApp would get permission to:
            </li>
            <li>
              <ul>
                <li>View address of connected account</li>
                <li>Create but not sign transactions for you</li>
              </ul>
            </li>
          </ul>
        </section>
        <div className="footer_actions">
          <SharedButton
            iconSize="large"
            size="large"
            type="secondary"
            onClick={deny}
          >
            Reject
          </SharedButton>
          <SharedButton
            type="primary"
            iconSize="large"
            size="large"
            onClick={grant}
          >
            Connect
          </SharedButton>
        </div>
      </CorePage>
      <style jsx>{`
        section {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        .page {
          background-color: var(--green-95);
          height: 100vh;
          width: 100vw;
        }
        h1 {
          color: var(--trophy-gold);
          margin-top: 45px;
          margin-bottom: 25px;
          text-align: center;
        }
        .permissions_list {
          margin-left: 16px;
        }
        ul {
          display: flex;
          flex-direction: column;
        }
        li {
          font-size: 14px;
          line-height: 20px;
          color: var(--green-40);
          margin-bottom: 4px;
          margin-left: 5px;
        }
        .permissions_list_title {
          color: #fff;
          margin-bottom: 8px;
          margin-top: 15px;
          margin-left: 0px;
        }
        .connection_destination {
          width: 100%;
          height: 88px;
          background-color: var(--hunter-green);
          border-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 16px;
          box-sizing: border-box;
          margin-bottom: 8px;
        }
        .icon_connection {
          background: url("./images/bolt@2x.png") center no-repeat;
          background-color: var(--green-95);
          border-radius: 4px;
          background-size: 10px 17px;
          border: solid 3px var(--hunter-green);
          width: 24px;
          height: 24px;
          margin-left: 28px;
          margin-top: -19px;
          margin-bottom: -10px;
          z-index: 3;
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
      <style jsx global>{`
        body {
          background-color: var(--green-95);
        }
      `}</style>
    </div>
  )
}
