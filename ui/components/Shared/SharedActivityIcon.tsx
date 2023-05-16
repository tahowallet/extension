import React, { ReactElement } from "react"
import classNames from "classnames"

type SharedActivityIconProps = {
  type: "receive" | "send" | "approve" | "swap" | "contract_interaction"
  size: number
}

export default function SharedActivityIcon({
  type,
  size,
}: SharedActivityIconProps): ReactElement {
  return (
    <>
      <div className={classNames("activity_icon", type)} />
      <style jsx>{`
        .activity_icon {
          background: url("./images/activity_contract_interaction@2x.png");
          background-size: cover;
          width: ${size}px;
          height: ${size}px;
          margin-right: 4px;
          margin-left: 9px;
        }
        .receive {
          background: url("./images/activity_receive@2x.png");
          background-size: cover;
        }
        .send {
          background: url("./images/activity_send@2x.png");
          background-size: cover;
        }
        .approve {
          background: url("./images/activity_approve@2x.png");
          background-size: cover;
        }
        .swap {
          background: url("./images/activity_swap@2x.png");
          background-size: cover;
        }
        .contract_interaction {
          background: url("./images/activity_contract_interaction@2x.png");
          background-size: cover;
        }
      `}</style>
    </>
  )
}
