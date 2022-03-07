import { selectTypedData } from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../hooks"
import capitalize from "../utils/capitalize"

export default function SignDataDetailPanel(): ReactElement {
  const typedDataRequest = useBackgroundSelector(selectTypedData)
  if (typeof typedDataRequest === "undefined") return <></>

  const { domain, message } = typedDataRequest.typedData

  const keys = Object.keys(message)

  /* TODO: should be `true` if the request originates from within the wallet */
  const isInternal = false

  return (
    <>
      <div className="sign_block">
        <div className="container">
          <div className="label header">
            {isInternal
              ? "Your signature is required"
              : "A dapp is requesting your signature"}
          </div>
          <div className="divider" />
          {/* FIXME: `domain.name` was removed as part of personal sign implementation. Why? */}
          <div className="header">{domain.name}</div>
          <div className="divider" />
          {keys.length > 2 ? (
            <div className="messages">
              {keys.map((key) => (
                <div key={key} className="message">
                  <div className="key">{capitalize(key)}</div>
                  <div className="value light">{`${message[key]}`}</div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {keys.map((key) => (
                <div className="single_message">
                  <div className="key">{capitalize(key)}</div>
                  <div className="light">{`${message[key]}`}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .sign_block {
          display: flex;
          width: 100%;
          flex-direction: column;
          justify-content: space-between;
        }
        .label {
          color: var(--green-40);
        }
        .header {
          padding: 16px 0;
        }
        .messages {
          display: flex;
          flex-flow: column;
          width: 100%;
          padding-top: 16px;
        }
        .message {
          display: flex;
          justify-content: space-between;
          padding: 6px 16px;
        }
        .value {
          overflow-wrap: anywhere;
          max-width: 220px;
          text-align: right;
        }
        .light {
          color: #ccd3d3;
        }
        .key {
          color: var(--green-40);
        }
        .divider {
          width: 80%;
          height: 2px;
          opacity: 60%;
          background-color: var(--green-120);
        }
        .single_message {
          display: flex;
          flex-direction: column;
          gap: 24px;
          text-align: left;
          padding: 16px;
          width: 80%;
        }
        .divider {
          width: 80%;
          height: 2px;
          opacity: 60%;
          background-color: var(--green-120);
        }
        .container {
          display: flex;
          margin: 20px 0;
          flex-direction: column;
          align-items: center;
        }
      `}</style>
    </>
  )
}
