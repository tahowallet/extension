import React, { ReactElement } from "react"
import SharedButton from "../../components/Shared/SharedButton"

export default function HeaderComingSoon(): ReactElement {
  return (
    <header>
      <h2 className="header_title">Coming soon</h2>
      <p className="header_text">
        The Earn contracts will have to be deployed by the Community. Community
        members that deploy a contract will receive a reward!
      </p>
      <p className="header_text">
        Join the Community to be the first to hear when the contracts can be
        deployed.
      </p>
      <SharedButton
        type="primary"
        iconMedium="discord"
        size="medium"
        iconPosition="left"
        onClick={() => {
          window.open(`https://chat.tally.cash/`, "_blank")?.focus()
        }}
      >
        Join Discord
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
