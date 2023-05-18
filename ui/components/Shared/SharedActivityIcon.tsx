import React, { ReactElement } from "react"
import classNames from "classnames"
import { ActivityIconType } from "../../hooks/activity-hooks"

type SharedActivityIconProps = {
  type: ActivityIconType
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
          margin-left: 4px;
        }
        .asset-transfer-receive {
          background: url("./images/activity_receive@2x.png");
          background-size: cover;
        }
        .asset-transfer-send {
          background: url("./images/activity_send@2x.png");
          background-size: cover;
        }
        .asset-approval {
          background: url("./images/activity_approve@2x.png");
          background-size: cover;
        }
        .asset-swap {
          background: url("./images/activity_swap@2x.png");
          background-size: cover;
        }
        .contract-interaction {
          background: url("./images/activity_contract_interaction@2x.png");
          background-size: cover;
        }
      `}</style>
    </>
  )
}
