import React, { ReactElement } from "react"
import { Delegate, DAO } from "@tallyho/tally-background/redux-slices/claim"
import {
  isProbablyEVMAddress,
  truncateAddress,
} from "@tallyho/tally-background/lib/utils"

export default function ClaimDelegateChoiceProfile(props: {
  name: string
  delegate?: Delegate | DAO | null
}): ReactElement {
  const { name, delegate } = props

  const referrerLabel = isProbablyEVMAddress(name)
    ? truncateAddress(name)
    : name

  return (
    <div className="wrap">
      <div className="label">Referred by</div>
      <div className="ref_block">
        <div className="icon" />
        {referrerLabel}
      </div>
      <style jsx>
        {`
          .label {
            font-size: 16px;
            line-height: 24px;
            margin-top: 14px;
            color: var(--green-40);
            margin-bottom: 10px;
          }
          .ref_block {
            width: 352px;
            height: 64px;
            border-radius: 8px;
            background-color: var(--green-95);
            padding: 12px 16px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            box-shadow: var(--shadow);
          }
          .icon {
            width: 40px;
            height: 40px;
            border-radius: 150px;
            margin-right: 13px;
            flex-shrink: 0;
            background-image: url("./images/DAOs/${delegate?.avatar}");
            background-size: cover;
            background-color: #006ae3;
          }
        `}
      </style>
    </div>
  )
}
