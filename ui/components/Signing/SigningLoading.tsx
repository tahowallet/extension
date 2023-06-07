import React, { ReactElement } from "react"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"

export default function SigningLoading(): ReactElement {
  return (
    <div className="loading_transaction">
      <div className="header">
        <SharedSkeletonLoader height={44} width={235} />
      </div>
      <div className="container">
        <SharedSkeletonLoader height={32} />
        <SharedSkeletonLoader height={42} />
        <SharedSkeletonLoader height={52} />
      </div>
      <style jsx>{`
        .loading_transaction {
          height: 100vh;
          width: 100%;
          background: var(--green-95);
          padding-top: 64px;
        }
        .header {
          display: flex;
          justify-content: center;
        }
        .container {
          border-radius: 16px;
          background-color: var(--hunter-green);
          margin: 16px;
          padding: 16px;
          height: 250px;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
        }
      `}</style>
    </div>
  )
}
