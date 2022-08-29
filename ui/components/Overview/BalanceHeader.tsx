import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"

export default function BalanceHeader({
  balance,
  initializationTimeExpired,
}: {
  balance?: string
  initializationTimeExpired: boolean
}): ReactElement {
  const { t } = useTranslation()

  return (
    <>
      <div className="balance_header">
        <span className="balance_title">
          {t("overview.totalBalanceEverywhere")}
        </span>
        <div className="balance_value">
          {initializationTimeExpired || balance ? (
            <>
              <span className="balance_sign">$</span>
              {balance ?? "0"}
            </>
          ) : (
            <SharedLoadingSpinner />
          )}
        </div>
      </div>
      <style jsx>{`
        .balance_header {
          width: 100%;
          background: linear-gradient(250.02deg, #034f4b 0%, #033734 66.93%);
          border-radius: 8px 8px 0 0;
          padding: 16px 0;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .balance_title {
          color: var(--green-40);
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          margin-bottom: 4px;
        }
        .balance_value {
          color: var(--white);
          font-weight: 500;
          font-size: 28px;
          line-height: 32px;
          position: relative;
        }
        .balance_sign {
          color: var(--green-40);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          margin-right: 4px;
          position: absolute;
          top: 0;
          left: -15px;
        }
      `}</style>
    </>
  )
}
