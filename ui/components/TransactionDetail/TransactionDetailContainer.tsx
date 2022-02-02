import React, { ReactElement, ReactNode } from "react"

export default function TransactionDetailContainer({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <div className="container">
      {children}
      <style jsx>{`
        .container {
          align-self: stretch;
          display: flex;
          flex-flow: column;
          gap: 1rem;
          padding: 1.5rem;
        }
      `}</style>
    </div>
  )
}
