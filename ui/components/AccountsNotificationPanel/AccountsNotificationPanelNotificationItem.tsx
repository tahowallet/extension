import React, { ReactElement } from "react"

export default function NotificationItem(): ReactElement {
  return (
    <li>
      <div className="icon_notification" />
      <div>
        Receive <span className="white">240 ETH</span> from{" "}
        <span className="white">0x424..12f3</span> successful{" "}
        <span className="time">03:03 on 14 May</span>
      </div>
      <style jsx>{`
        li {
          min-height: 34px;
          padding: 8px 0px;
          color: var(--green-40);
          display: flex;
          align-items: center;
          font-size: 14px;
        }
        .white {
          color: #fff;
          padding: 0px 0.5px;
        }
        .icon_notification {
          background: url("./images/notification_receive@2x.png") center no-repeat;
          background-size: 12px 12px;
          width: 24px;
          height: 24px;
          background-color: var(--success);
          border-radius: 50px;
          margin-right: 8px;
          flex-shrink: 0;
        }
        .time {
          color: var(--green-60);
          font-size: 12px;
          font-weight: 500;
          line-height: 16px;
        }
      `}</style>
    </li>
  )
}
