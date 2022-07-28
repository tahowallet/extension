import React, { ReactElement } from "react"

export default function EmptyBowl(): ReactElement {
  return (
    <div className="standard_width container">
      <img className="bowl_image" src="./images/empty_bowl@2x.png" alt="" />
      <div className="title">Just an empty bowl</div>
      <div className="text">You don&apos;t have an active deposit.</div>
      <style jsx>
        {`
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 16px;
            height: 100%;
          }
          .bowl_image {
            width: 90px;
          }
          .title {
            color: var(--trophy-gold);
            font-size: 28px;
            margin-bottom: 10px;
          }
          .text {
            color: var(--green-40);
            font-size: 16px;
          }
        `}
      </style>
    </div>
  )
}
