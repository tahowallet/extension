import React, { ReactElement } from "react"
import classNames from "classnames"

interface Props {
  name: string
  info: string
  width: number
  height: number
  isSelected: boolean
  onClick: () => void
}

export default function TopMenuProtocolListItem(props: Props): ReactElement {
  const { name, width, height, info, isSelected, onClick } = props

  return (
    <li className={classNames({ select: isSelected })}>
      <button
        type="button"
        aria-label={`Switch to the ${name} network`}
        onClick={onClick}
      >
        <div className="left">
          <div className="icon_wrap">
            <span className="icon" />
          </div>
        </div>
        <div className="right">
          <div className="title">{name}</div>
          <div className="sub_title">
            {info}
            {isSelected && <span className="status">Connected</span>}
          </div>
        </div>
      </button>
      <style jsx>
        {`
          button {
            display: flex;
          }
          li {
            display: flex;
            margin-bottom: 15px;
            cursor: pointer;
          }
          .status {
            height: 17px;
            color: #22c480;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-left: 8px;
          }
          .icon {
            background: url("./images/${name
              .replaceAll(" ", "")
              .toLowerCase()}@2x.png");
            background-size: cover;
            width: ${width}px;
            height: ${height}px;
          }
          .icon_wrap {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            background-color: var(--hunter-green);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .left {
            margin-right: 16px;
            margin-left: 2px;
          }
          .right {
            height: 24px;
            color: var(--green-5);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .title {
            height: 24px;
            color: var(--green-5);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .sub_title {
            height: 17px;
            color: var(--green-60);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .select .icon_wrap {
            border: 2px solid #22c480;
          }
          .select .left {
            margin-left: 0px;
          }
        `}
      </style>
    </li>
  )
}

TopMenuProtocolListItem.defaultProps = {
  isSelected: false,
}
