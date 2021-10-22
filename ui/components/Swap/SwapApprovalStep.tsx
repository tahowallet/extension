import React, { ReactElement } from "react"
import SharedButton from "../Shared/SharedButton"

interface Props {
  isDone: boolean
  label: string
}

export default function SwapApprovalStep(props: Props): ReactElement {
  const { isDone, label } = props

  return (
    <li>
      <div className="left">
        <div className={`icon_check${isDone ? " icon_green" : ""}`} />
        {label}
      </div>
      <SharedButton
        type="tertiary"
        size="medium"
        icon="external"
        iconSize="large"
        isDisabled={!isDone}
      >
        Etherscan
      </SharedButton>
      <style jsx>
        {`
          li {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 24px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
          }
          .icon_check {
            mask-image: url("./images/check@2x.png");
            mask-size: 12px 12px;
            width: 12px;
            height: 12px;
            margin-right: 8px;
            background-color: var(--green-60);
          }
          .icon_green {
            background-color: #22c480;
          }
          .left {
            display: flex;
            align-items: center;
          }
        `}
      </style>
    </li>
  )
}

SwapApprovalStep.defaultProps = {
  isDone: false,
}
