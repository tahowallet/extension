import classNames from "classnames"
import React, { ReactElement, ReactNode } from "react"

export default function TransactionDetailContainer({
  children,
  footer,
}: {
  children: ReactNode
  footer?: ReactNode
}): ReactElement {
  return (
    <div className={classNames("container", { has_footer: footer })}>
      {children}
      {footer && <div className="divider" />}
      {footer}
      <style jsx>{`
        .container {
          align-self: stretch;
          display: flex;
          flex-flow: column;
          gap: 1rem;
          padding: 1.5rem;
        }

        .container.has_footer {
          padding-bottom: 1rem;
        }

        .divider {
          border: 1px solid var(--green-120);
          margin: 0.5rem;
        }
      `}</style>
    </div>
  )
}
