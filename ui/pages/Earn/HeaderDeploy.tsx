import React, { ReactElement } from "react"
import SharedButton from "../../components/Shared/SharedButton"

export default function HeaderDeploy(): ReactElement {
  return (
    <header>
      <h2 className="header_title">Deploying contracts</h2>
      <p className="header_text">
        Contracts are being deployed by the community and have a 48h lock
        period. Users that deploy a contract receive a reward!
      </p>
      <SharedButton
        type="primary"
        iconMedium="github"
        size="medium"
        iconPosition="left"
        onClick={() => {
          window
            .open(`https://github.com/tallycash/contracts`, "_blank")
            ?.focus()
        }}
      >
        Deploy a contract on Github
      </SharedButton>

      <style jsx>{`
        header {
          padding: 0 24px 24px;
        }
        .header_title {
          margin: 0 0 16px;
          font-size: 28px;
        }
        .header_text {
          color: var(--green-20);
          margin: 0 0 24px;
          line-height: 24px;
          size: 16px;
          weight: 500;
        }
      `}</style>
    </header>
  )
}
