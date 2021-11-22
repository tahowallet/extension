import React, { ReactElement } from "react"
import AmountCombinedBanner from "./AmountCombinedBanner"

interface DelegateProps {
  openInfo: () => void
  openChoose: () => void
}

export default function Delegate({
  openInfo,
  openChoose,
}: DelegateProps): ReactElement {
  return (
    <div>
      <AmountCombinedBanner />
      <div className="claim standard_width">
        <div className="claim__title">Choose a delegate!</div>
        <div className="claim__description">
          Delegates are your north-star, you trust them to represent you in a
          DAO voting.
          <span
            onClick={openInfo}
            role="button"
            tabIndex={0}
            onKeyDown={openInfo}
            className="claim__seemore"
          >
            {" "}
            Read more
          </span>
        </div>
        <div className=" banner banner-delegate">
          {new Array(4).fill(null).map(() => (
            <img
              className="delegate__icon"
              src="./images/uniswap@2x.png"
              alt=""
            />
          ))}
        </div>
        <button className="delegate__button" type="button" onClick={openChoose}>
          Choose delegate
        </button>
      </div>
      <style jsx>
        {`
          .banner {
            width: 100%;
            border-radius: 12px;
            display: flex;
            padding: 0 4px;
            box-sizing: border-box;
            justify-content: space-between;
            align-items: center;
            padding: 0 24px;
          }
          .banner-delegate {
            height: 58px;
            padding: 0 20px;
            margin: 20px 0 10px 0;
            background-color: var(--hunter-green);
          }
          .claim__title {
            font-family: Quincy CF;
            font-size: 42px;
            line-height: 58px;
            margin-top: 12px;
          }
          .claim__description {
            font-family: Segment;
            font-size: 16px;
            line-height: 24px;
            color: #99a8a7;
          }
          .claim__description-review {
            font-family: Segment;
            font-size: 16px;
            line-height: 24px;
            margin-top: 24px;
            color: #99a8a7;
          }
          .claim__seemore {
            color: #d08e39;
            cursor: pointer;
          }
          .claim {
            display: flex;
            flex-flow: column;
            flex-grow: 1;
          }
          .delegate__icon {
            width: 40px;
            opacity: 0.5;
          }
          .delegate__button {
            position: relative;
            height: 40px;
            border-radius: 4px;
            background-color: var(--trophy-gold);
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #002522;
            font-size: 20px;
            letter-spacing: 0.48px;
            line-height: 24px;
            text-align: center;
            padding: 0px 17px;
            margin-bottom: 16px;
            margin-right: 8px;
            align-self: center;
            top: -32px;
          }
        `}
      </style>
    </div>
  )
}
