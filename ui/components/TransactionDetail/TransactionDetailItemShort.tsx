import React, { ReactElement, ReactNode } from "react"

export default function TransactionDetailItemShort({
  name,
  value,
}: {
  name: ReactNode
  value: ReactNode
}): ReactElement {
  return (
    <div className="container">
      <div className="name">{name}</div>
      <div className="value">{value}</div>
      <style jsx>{`
        .container {
          display: flex;
          flex-flow: row;
          align-items: center;
          justify-content: space-between;
          font-size: 16px;
          line-height: 24px;
        }

        .name {
          color: var(--green-40);
        }

        .value {
          color: var(--green-20);
        }
      `}</style>
    </div>
  )
}
