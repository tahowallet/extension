import React, { ReactElement } from "react"

export default function ClaimDelegateChoiceProfile(props: {
  name: string
  delegate?: any
}): ReactElement {
  const { name, delegate } = props
  return (
    <div className="wrap">
      <div className="label">Bonus by</div>
      <div className="ref_block">
        <div className="icon" />
        {name}
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
          }
          .icon {
            width: 40px;
            height: 40px;
            border-radius: 150px;
            margin-right: 13px;
            flex-shrink: 0;
            background-image: url("./images/DAOs/${delegate?.logoAsset}");
            background-size: cover;
            background-color: #006ae3;
          }
        `}
      </style>
    </div>
  )
}
