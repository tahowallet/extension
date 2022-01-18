import { TypedData } from "@tallyho/tally-background/redux-slices/signing"

import React, { ReactElement } from "react"
import capitalize from "../../utils/text"

interface Props {
  typedData: TypedData
}

export default function SignTypedData({ typedData }: Props): ReactElement {
  const { domain, message, primaryType } = typedData

  const keys = Object.keys(message)
  return (
    <div className="sign_block">
      <div className="container standard-width">
        <div className="label">Type: {primaryType}</div>
        <div className="label">Domain: {domain.name}</div>
        <div className="messages">
          {keys.map((key) => (
            <div className="message">
              {`${capitalize(key)}: `}
              <span className="value">{`${message[key]}`}</span>
            </div>
          ))}
        </div>
      </div>
      <style jsx>
        {`
          .sign_block {
            display: flex;
            width: 100%;
            flex-direction: column;
            align-items: center;
          }
          .label {
            color: var(--green-40);
            font-size: 16px;
            line-height: 24px;
            margin-bottom: 4px;
          }
          .message {
            overflow-wrap: anywhere;
          }
          .divider {
            width: 80%;
            height: 2px;
            opacity: 60%;
            background-color: var(--green-120);
          }
          .value {
            color: var(--green-60);
          }
          .container {
            display: flex;
            margin: 20px 0;
            flex-direction: column;
            align-items: center;
          }
        `}
      </style>
    </div>
  )
}
