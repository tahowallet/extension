import React, { ReactElement } from "react"

type SharedWarningMessageProps = {
  text: string
}

export default function SharedWarningMessage({
  text,
}: SharedWarningMessageProps): ReactElement {
  return (
    <div className="warning_wrap">
      <img className="icon" src="./images/message_warning.png" alt="warning" />
      <span className="text">{text}</span>
      <style jsx>{`
        .warning_wrap {
          display: flex;
          padding: 8px 40px 8px 12px;
          border: 1px solid var(--attention);
          border-radius: 4px;
        }
        .icon {
          margin-top: 4px;
          margin-right: 12px;
          height: 28px;
        }
        .text {
          color: var(--attention);
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
      `}</style>
    </div>
  )
}
