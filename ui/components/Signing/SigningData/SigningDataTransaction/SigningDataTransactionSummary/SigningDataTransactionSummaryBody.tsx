import React, { ReactElement, ReactNode } from "react"

export default function SigningDataTransactionSummaryBody({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <div>
      {children}
      <style jsx>
        {`
          div {
            display: flex;
            height: fit-content;
            border-radius: 16px;
            background-color: var(--hunter-green);
            margin: 16px 0px;
            flex-direction: column;
            align-items: center;
          }
        `}
      </style>
    </div>
  )
}
