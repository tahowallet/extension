import React, { ReactElement } from "react"

export default function HeaderTVL({
  balance,
}: {
  balance: string
}): ReactElement {
  return (
    <header>
      <div className="header_subtitle">Total value locked</div>
      <div className="header_balance">
        <span className="currency_sign">$</span>
        {balance}
      </div>
      <style jsx>{`
        header {
          width: calc(100% - 32px);
          margin: 8px 16px 24px;
        }
        .header_subtitle {
          color: var(--green-40);
          font-size: 14px;
          line-height: 16px;
          margin-bottom: 7px;
        }
        .currency_sign {
          color: var(--green-40);
          font-size: 18px;
          line-height: 18px;
          margin-right: 2px;
          margin-top: 4px;
        }
        .header_balance {
          display: flex;
          text-shadow: 0 2px 2px #072926;
          color: #fff;
          font-size: 28px;
          font-weight: 500;
          line-height: 32px;
        }
      `}</style>
    </header>
  )
}
