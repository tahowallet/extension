import React, { ReactElement } from "react"

export default function RequestingDAppBlock(props: {
  title: string
  url: string
  faviconUrl: string
}): ReactElement {
  const { title, url, faviconUrl } = props
  return (
    <div className="request_wrap">
      <div className="dapp_favicon" />
      <div className="info">
        <div className="dapp_title ellipsis_multiline" title={title}>
          {title}
        </div>
        <div className="dapp_url" title={url}>
          {url}
        </div>
      </div>
      <style jsx>{`
        .request_wrap {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .dapp_favicon {
          background: url("${
            faviconUrl === ""
              ? "./images/dapp_favicon_default@2x.png"
              : faviconUrl
          }");
          background-size: cover;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .dapp_title {
          color: #fff;
          font-size: 16px;
          font-weight: 500;
        }
        .dapp_url {
          color: var(--green-40);
          font-size: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .info {
          margin-left: 16px;
          width: calc(100% - 48px - 16px);
        }
      `}</style>
    </div>
  )
}
