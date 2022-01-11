import React, { ReactElement } from "react"

export default function TopMenuConnectedDAppInfo(props: {
  title: string
  url: string
  faviconUrl: string
  close: () => void
  disconnect: () => void
}): ReactElement {
  const { title, url, close, faviconUrl, disconnect } = props
  return (
    <div className="bg">
      <div className="window">
        <button
          type="button"
          className="icon_close"
          aria-label="Close"
          onClick={close}
        />
        <h1>Account connected to</h1>
        <div className="favicon" />
        <div className="title">{title}</div>
        <div className="url">{url}</div>
        <button
          aria-label="disconnect"
          type="button"
          className="disconnect_icon"
          onClick={disconnect}
        />
      </div>
      <button
        aria-label="Background close"
        type="button"
        className="void_space"
        onClick={close}
      />
      <style jsx>{`
        .bg {
          width: 100%;
          height: 100%;
          border-radius: 16px;
          background-color: rgba(0, 37, 34, 0.71);
          position: fixed;
          z-index: 99999;
          top: 55px;
          left: 0px;
        }
        .window {
          width: 352px;
          height: 204px;
          box-shadow: 0 10px 12px rgba(0, 20, 19, 0.34),
            0 14px 16px rgba(0, 20, 19, 0.24), 0 24px 24px rgba(0, 20, 19, 0.14);
          border-radius: 8px;
          background-color: var(--green-95);
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 auto;
        }
        .icon_close {
          mask-image: url("./images/close.svg");
          mask-size: cover;
          width: 12px;
          height: 12px;
          position: absolute;
          right: 33px;
          background-color: var(--green-20);
          z-index: 1;
          margin-top: 17px;
        }
        .void_space {
          height: 100%;
          width: 100%;
          position: fixed;
          top: 0;
          left: 0;
          z-index: -1;
        }
        h1 {
          color: #22c480;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
          text-align: center;
        }
        .favicon {
          background: url("${faviconUrl === ""
            ? "./images/dapp_favicon_default@2x.png"
            : faviconUrl}");
          background-size: cover;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          margin-top: 5px;
        }
        .title {
          color: #fff;
          font-size: 16px;
          font-weight: 500;
          margin-top: 10px;
        }
        .url {
          color: var(--green-40);
          font-size: 16px;
          margin-top: 5px;
        }
        .disconnect_icon {
          background: url("./images/disconnect@2x.png");
          background-size: cover;
          width: 16px;
          height: 18px;
          margin-top: 16px;
        }
      `}</style>
    </div>
  )
}
