import React, { ReactElement } from "react"
import classNames from "classnames"

interface Props {
  isActive: boolean
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export default function SharedFeeSelectButton(props: Props): ReactElement {
  const { isActive, onClick } = props

  return (
    <button
      type="button"
      className={classNames({ active: isActive })}
      onClick={onClick}
    >
      <div className="top">
        Slow
        <div className="time small">5h</div>
      </div>
      <div className="bottom">
        0.00479 ETH
        <div className="usd small">$20,99</div>
      </div>
      <style jsx>
        {`
          button {
            width: 106px;
            height: 72px;
            border-radius: 4px;
            background-color: var(--green-95);
            padding: 8px;
            box-sizing: border-box;
            display: flex;
            justify-content: flex-start;
            align-items: flex-start;
            flex-direction: column;
          }
          button:hover {
            background-color: var(--green-80);
          }
          .top {
            width: 33px;
            color: var(--green-5);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-bottom: 7px;
          }
          .active {
            border: 2px solid var(--success);
            padding: 6px;
          }
          .active .top {
            color: var(--success);
          }
          .bottom {
            width: 89px;
            height: 17px;
            color: var(--green-5);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-transform: uppercase;
          }
          .small {
            width: 23px;
            height: 16px;
            color: var(--green-60);
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.36px;
            line-height: 16px;
            text-align: right;
          }
        `}
      </style>
    </button>
  )
}

SharedFeeSelectButton.defaultProps = {
  isActive: false,
}
