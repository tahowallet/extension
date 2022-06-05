import React, { ReactElement } from "react"
import classNames from "classnames"
import { useDispatch } from "react-redux"
import { setSelectedNetwork } from "@tallyho/tally-background/redux-slices/ui"
import { EVMNetwork } from "@tallyho/tally-background/networks"

interface Props {
  info: string
  width: number
  height: number
  network: EVMNetwork
  isSelected: boolean
  close: () => void
}

export default function TopMenuProtocolListItem(props: Props): ReactElement {
  const { width, height, info, isSelected, network, close } = props

  const dispatch = useDispatch()

  return (
    <li
      className={classNames({ select: isSelected })}
      onClick={() => {
        dispatch(setSelectedNetwork(network))
        close()
      }}
      role="presentation"
    >
      <div className="left">
        <div className="icon_wrap">
          <span className="icon" />
        </div>
      </div>
      <div className="right">
        <div className="title">{network.name}</div>
        <div className="sub_title">
          {info}
          {isSelected && <span className="status">Connected</span>}
        </div>
      </div>
      <style jsx>
        {`
          li {
            display: flex;
            margin-bottom: 15px;
            cursor: pointer;
          }
          .status {
            height: 17px;
            color: var(--success);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-left: 8px;
          }
          .icon {
            background: url("./images/${network.name
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
            border: 2px solid var(--success);
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
