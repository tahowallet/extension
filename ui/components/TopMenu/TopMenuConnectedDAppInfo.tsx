import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { switchNetworkForOrigin } from "@tallyho/tally-background/redux-slices/dapp"
import classNames from "classnames"
import React, { ReactElement, useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useBackgroundDispatch } from "../../hooks"
import DAppConnectionDefaultToggle from "../DAppConnection/DAppConnectionDefaultToggle"
import SharedAccordion from "../Shared/SharedAccordion"
import SharedLink from "../Shared/SharedLink"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SelectNetworkMenuContent from "./SelectNetworkMenuContent"

const SLIDE_TRANSITION_MS = 445

function ConnectionDAppGuideline({
  isConnected,
}: {
  isConnected: boolean
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "topMenu.connectedDappInfo",
  })
  const showWalletConnectInfo = isEnabled(FeatureFlags.SUPPORT_WALLET_CONNECT)
  const { t: tShared } = useTranslation("translation", { keyPrefix: "shared" })
  const [currentPanel, setCurrentPanel] = useState(
    showWalletConnectInfo ? 0 : 1,
  )

  return (
    <>
      <SharedAccordion
        contentHeight={showWalletConnectInfo ? 298 : 242}
        style={{
          width: 320,
          borderRadius: 8,
          marginTop: 8,
          background: "var(--hunter-green)",
          "--panel-switcher-border": "var(--green-80)",
          "--header-padding": "16px",
          "--content-fade-in-duration": "200ms",
        }}
        isInitiallyOpen={!isConnected}
        headerElement={<div className="title">{t("guideline.title")}</div>}
        contentElement={
          <div className="content_wrap">
            {showWalletConnectInfo && (
              <SharedPanelSwitcher
                panelNames={["Wallet Connect", "Injected Wallet"]}
                panelNumber={currentPanel}
                setPanelNumber={setCurrentPanel}
              />
            )}
            <div className="panel_wrap">
              {currentPanel === 0 && (
                // Wallet connect guidelines
                <div className="wallet_connect_info">
                  <div className="learn_more">
                    <img
                      height="52"
                      alt="Taho - Wallet Connect"
                      src="/images/tally_wc.png"
                    />
                    <p>
                      <Trans
                        t={t}
                        i18nKey="walletConnectInfo"
                        components={{
                          url: <SharedLink url="#" />,
                        }}
                      />
                    </p>
                  </div>
                  <img
                    width="100%"
                    alt={t("walletConnectHint")}
                    src="/images/wallet_connect_guideline.png"
                  />
                </div>
              )}

              {currentPanel === 1 && (
                // Injected wallet guidelines
                <>
                  <ol className="steps">
                    <li>
                      <span className="wallet_toggle_wrap">
                        {t("guideline.step1")}
                        <DAppConnectionDefaultToggle alwaysForceSelection="taho" />
                      </span>
                    </li>
                    <li>{t("guideline.step2")}</li>
                    <li>{t("guideline.step3")}</li>
                  </ol>
                  <div className="list_wrap">
                    <span className="item">
                      <img src="./images/tally_token.svg" alt="Taho token" />
                      {tShared("taho")}
                    </span>
                    <span className="item">
                      <img
                        src="./images/icons/s/arrow-right.svg"
                        alt="Arrow right"
                      />
                      {tShared("injected")}
                    </span>
                    <span className="item">
                      <span className="fox">🦊</span> {tShared("metaMask")}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        }
      />
      <style jsx>{`
        .title {
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
        }
        .content_wrap {
          height: 85%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .panel_wrap {
          padding: ${showWalletConnectInfo ? "16px" : "0 16px 16px"};
        }
        .wallet_connect_info p {
          margin: 0;
          font-size: 16px;
          color: var(--green-40);
          font-family: Segment;
          font-weight: 500;
          line-height: 24px;
          letter-spacing: 0em;
        }
        .wallet_connect_info .learn_more {
          display: flex;
          gap: 16px;
        }

        .wallet_toggle_wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .steps {
          margin: 0;
          padding: 0;
          display: flex;
          flex-flow: column;
          list-style: none;
          counter-reset: step;
          color: var(--green-40);
        }
        .steps > li {
          display: flex;
          align-items: start;
          font-weight: 500;
          font-size: 16px;
          line-height: 40px;
        }
        .steps > li::before {
          content: counter(step) ".";
          counter-increment: step;
          padding-right: 4px;
        }
        .list_wrap {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .item img {
          width: 16px;
        }
        .fox {
          font-size: 12px;
        }
        .item {
          font-weight: 500;
          line-height: 24px;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .item:after {
          content: "/";
          color: var(--green-60);
        }
        .item:last-child:after {
          display: none;
        }
      `}</style>
    </>
  )
}

export default function TopMenuConnectedDAppInfo(props: {
  isOpen: boolean
  title: string
  url: string
  origin: string
  faviconUrl: string
  network: EVMNetwork | undefined
  isConnected: boolean
  close: () => void
  disconnect: () => void
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "topMenu.connectedDappInfo",
  })
  const { t: tShared } = useTranslation("translation", { keyPrefix: "shared" })
  const {
    isOpen,
    title,
    url,
    origin,
    close,
    faviconUrl,
    network,
    disconnect,
    isConnected,
  } = props

  const dispatch = useBackgroundDispatch()

  const [isNetworkSelectorOpen, setIsNetworkSelectorOpen] = useState(false)

  const handleNetworkChange = useCallback(
    (newNetwork: EVMNetwork) => {
      if (origin) {
        dispatch(switchNetworkForOrigin({ origin, network: newNetwork }))
      }
      setIsNetworkSelectorOpen(false)
    },
    [dispatch, origin],
  )

  return (
    <div
      className={classNames("panel", {
        closed: !isOpen,
      })}
    >
      <SharedSlideUpMenu
        isOpen={isNetworkSelectorOpen}
        isScrollable
        style={{ display: "flex", flexDirection: "column" }}
        close={() => {
          setIsNetworkSelectorOpen(false)
        }}
      >
        <SelectNetworkMenuContent
          currentNetwork={network}
          onNetworkChange={handleNetworkChange}
        />
      </SharedSlideUpMenu>
      <div className="panel_content">
        <button
          type="button"
          className="icon_close"
          aria-label={tShared("close")}
          onClick={close}
        />
        <div className="content">
          <h1>{t(`${isConnected ? "dAppTitle" : "dappConnections"}`)}</h1>
          <div
            className={classNames("dAppInfo_wrap", {
              visible: isConnected,
            })}
          >
            <div className="dapp_header">
              <div className="favicon" />
              <div className="dapp_details">
                <div className="url ellipsis" title={url}>
                  {url}
                </div>
                <div className="title ellipsis" title={title}>
                  {title}
                </div>
              </div>
            </div>
            <div className="network_row">
              {network !== undefined && (
                <button
                  type="button"
                  className="network_selector"
                  onClick={() => setIsNetworkSelectorOpen(true)}
                >
                  <span className="network_label">
                    {t("connectedOnNetworkLabel")}
                  </span>
                  <SharedNetworkIcon network={network} size={16} />
                  <span className="network_name" title={network.name}>
                    {network.name}
                  </span>
                  <span className="icon_chevron_down" />
                </button>
              )}
              <button
                type="button"
                className="disconnect_button"
                onClick={disconnect}
              >
                <div className="disconnect_icon" />
                {t("disconnectDapp")}
              </button>
            </div>
          </div>
        </div>
        <ConnectionDAppGuideline isConnected={isConnected} />
      </div>
      <style jsx>{`
        .panel {
          width: 100%;
          height: calc(100% - 44px);
          background-color: var(--green-120);
          position: fixed;
          top: 44px;
          left: 0;
          z-index: 998;
          overflow: hidden;
          clip-path: inset(0 0 0 0);
          transition: clip-path cubic-bezier(0.19, 1, 0.22, 1)
            ${SLIDE_TRANSITION_MS}ms;
        }
        .panel.closed {
          clip-path: inset(0 0 100% 0);
          pointer-events: none;
        }
        .panel_content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          box-sizing: border-box;
          overflow-y: auto;
        }
        .content {
          width: 100%;
          max-width: 352px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .icon_close {
          mask-image: url("./images/close.svg");
          mask-size: cover;
          width: 12px;
          height: 12px;
          position: absolute;
          right: 24px;
          top: 24px;
          background-color: var(--green-20);
          z-index: 1;
        }
        .icon_close:hover {
          background-color: #fff;
        }
        h1 {
          color: var(--${isConnected ? "success" : "green-20"});
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
          text-align: center;
          margin: 0 0 16px;
        }
        .dapp_header {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
        }
        .favicon {
          background: url("${faviconUrl === ""
            ? "./images/dapp_favicon_default@2x.png"
            : faviconUrl}");
          background-size: cover;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .dapp_details {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0;
          flex: 1;
          height: 40px;
        }
        .title {
          color: var(--green-40);
          font-weight: 500;
          font-size: 14px;
        }
        .url {
          color: #fff;
          font-size: 16px;
          font-weight: 500;
        }
        .network_row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 20px 0 16px;
          box-sizing: border-box;
          gap: 16px;
        }
        .network_selector {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--green-40);
          font-size: 14px;
          min-width: 0;
        }
        .network_selector:hover {
          color: #fff;
        }
        .network_selector:hover .network_name {
          color: #fff;
        }
        .network_selector:hover .icon_chevron_down {
          background-color: #fff;
        }
        .network_label {
          color: var(--green-40);
          flex-shrink: 0;
          white-space: nowrap;
        }
        .network_name {
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .icon_chevron_down {
          mask-image: url("./images/chevron_down.svg");
          mask-size: 15px 8px;
          width: 15px;
          height: 8px;
          background-color: var(--green-40);
          flex-shrink: 0;
        }
        .disconnect_button {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--error);
          font-size: 14px;
          font-weight: 500;
          flex-shrink: 0;
        }
        .disconnect_button:hover {
          color: var(--error-80);
        }
        .disconnect_button:hover .disconnect_icon {
          background-color: var(--error-80);
        }
        .disconnect_icon {
          mask-image: url("./images/disconnect@2x.png");
          mask-size: cover;
          width: 16px;
          height: 18px;
          background-color: var(--error);
        }
        .dAppInfo_wrap {
          width: 100%;
          display: flex;
          flex-flow: column;
          align-items: flex-start;
          max-height: 0;
          overflow: hidden;
          transition: max-height 250ms ease-out;
        }
        .dAppInfo_wrap.visible {
          max-height: 250px;
          transition: max-height 250ms ease-in;
        }
      `}</style>
    </div>
  )
}
