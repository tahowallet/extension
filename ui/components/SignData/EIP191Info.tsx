import React from "react"
import { SignDataRequest } from "@tallyho/tally-background/utils/signing"

const EIP191Info: React.FC<{
  signingData: SignDataRequest["signingData"]
  account: string
  internal: boolean
}> = ({ signingData, account, internal }) => {
  return (
    <>
      <div className="label header">
        {internal
          ? "Your signature is required"
          : "A dapp is requesting your signature"}
      </div>
      <div className="divider" />
      <div className="divider" />
      <div className="message">
        <div className="message-title">Message</div>
        <div className="light">{`${signingData}`}</div>
      </div>
      <div className="message">
        <div className="signed">Signed,</div>
        <div>{account ?? "Unknown"}</div>
      </div>
      <style jsx>{`
        .message {
          margin: 16px;
          font-size: 14px;
          width: 100%;
          line-break: anywhere;
        }
        .message-title {
          color: var(--green-40);
          margin-bottom: 6px;
        }
        .light {
          color: #ccd3d3;
          white-space: pre-wrap;
        }
        .label {
          color: var(--green-40);
        }
        .header {
          padding: 16px 0;
        }
        .signed {
          margin-bottom: 6px;
        }
      `}</style>
    </>
  )
}
export default EIP191Info
