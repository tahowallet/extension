import React, { ReactElement } from "react"

interface Props {
  token: string
  amount: number
  destination: string
  localizedValue: string | number
}

export default function SignTransactionTransferBlock(
  props: Props
): ReactElement {
  const { token, amount, destination, localizedValue } = props

  function truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(37, 42)}`
  }

  function truncateAmount(value: number): string {
    const valueString = value.toString()
    if (valueString.length > 8) {
      if (valueString.startsWith("0.")) {
        return `${valueString.slice(0, 8)}`
      }
      return value.toFixed()
    }
    return valueString
  }

  return (
    <div className="sign_block">
      <div className="container">
        <div className="label">Send to</div>
        <div className="send_to">{truncateAddress(destination)}</div>
      </div>
      <div className="divider" />
      <div className="container">
        <span className="label">Spend Amount</span>
        <span className="spend_amount">
          {truncateAmount(amount)} {token}
        </span>
        <span className="label">{`$${localizedValue}`}</span>
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
          .spend_amount {
            color: #fff;
            font-size: 28px;
            text-align: right;
            text-transform: uppercase;
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
          .send-to {
            font-size: 16px;
          }
        `}
      </style>
    </div>
  )
}
