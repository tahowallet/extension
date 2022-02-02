import React, { ReactElement, ReactNode } from "react"

export default function TransactionDetailItemLong({
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
          flex-flow: column;
          font-size: 16px;
          line-height: 24px;
        }

        .name {
          color: var(--green-40);
        }

        .content {
          color: var(--green-20);
        }
      `}</style>
    </div>
  )
}
