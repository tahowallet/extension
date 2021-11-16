import React, { ReactElement } from "react"

interface Props {
  token: string
  amount: number
}

export default function SignTransactionSignBlock(props: Props): ReactElement {
  const { token, amount } = props

  return (
    <div className="sign_block">
      <span className="spend_amount_label">Spend Amount</span>
      <span className="spend_amount">
        {amount} {token}
      </span>
      <style jsx>
        {`
          .sign_block {
            padding: 24px 0px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .spend_amount_label {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            margin-bottom: 4px;
          }
          .spend_amount {
            color: #fff;
            font-size: 28px;
            text-align: right;
            text-transform: uppercase;
          }
        `}
      </style>
    </div>
  )
}
