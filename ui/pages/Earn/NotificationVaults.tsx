import React, { ReactElement } from "react"
import SharedBanner from "../../components/Shared/SharedBanner"
import SharedButton from "../../components/Shared/SharedButton"

export default function NotificationVaults(): ReactElement {
  return (
    <SharedBanner
      canBeClosed
      id="earn-vaults"
      icon="notif-announcement"
      iconColor="var(--link)"
      customStyles="margin-top: 16px; padding-bottom: 0;"
    >
      <div className="title">Before you get started!</div>
      <p className="text">
        Read this infromational blog post to understand how vaults work.
      </p>
      <SharedButton
        type="tertiary"
        size="medium"
        iconSmall="new-tab"
        iconPosition="left"
        onClick={() => window.open("https://tally.cash/", "_blank")?.focus()}
      >
        Read post
      </SharedButton>
      <style jsx>{`
        .title {
          color: var(--link);
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 12px;
        }
        .text {
          color: var(--green-40);
          font-size: 14px;
          font-weight: 500;
          margin: 0;
          width: 75%;
        }
      `}</style>
    </SharedBanner>
  )
}
