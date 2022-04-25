import React, { ReactElement } from "react"
import SharedButton from "../components/Shared/SharedButton"

export default function ComingSoon(): ReactElement {
  return (
    <div>
      <div className="illustration_area" />
      <h1 className="serif_header">Coming very soon!</h1>
      <p>
        Contracts are beeing deployed by community and this page will be active
        as soon as all contracts are deployed.
      </p>
      <SharedButton
        type="primary"
        size="medium"
        iconMedium="github"
        iconPosition="left"
      >
        Deploy a contract on Github
      </SharedButton>
      <style jsx>{`
        h1 {
          color: var(--trophy-gold);
          margin-bottom: -5px;
        }
        p {
          color: var(--green-20);
          font-size: 16px;
          line-height: 24px;
          width: 327px;
          height: 72px;
          margin-bottom: 30px;
        }
        .illustration_area {
          width: 320px;
          height: 208px;
          background: var(--green-95);
          opacity: 0.49;
          border-radius: 8px;
          margin-bottom: 25px;
        }
      `}</style>
    </div>
  )
}
