import React, { ReactElement } from "react"
import SharedIcon from "./SharedIcon"

export default function SharedWarningBanner({
  title,
}: {
  title: string
}): ReactElement {
  return (
    <>
      <div className="warning_wrap">
        <SharedIcon
          icon="icons/m/notif-attention.svg"
          width={24}
          color="var(--attention)"
          ariaLabel="password attention"
          customStyles="flex-shrink:0"
        />
        <div className="warning_text">{title}</div>
      </div>
      <style jsx>
        {`
          .warning_wrap {
            width: 336px;
            background: var(--green-120);
            border-radius: 8px;
            padding: 8px;
            display: flex;
            flex-direction: row;
            align-items: start;
          }
          .warning_text {
            color: var(--attention);
            font-weight: 500;
            font-size: 16px;
            line-height: 24px;
            margin-left: 8px;
          }
        `}
      </style>
    </>
  )
}
