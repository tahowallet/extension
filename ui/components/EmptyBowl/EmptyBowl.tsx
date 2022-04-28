import React, { ReactElement } from "react"

export default function EmptyBowl(): ReactElement {
  return (
    <div className="standard_width container">
      <img className="bowlImage" src="./images/empty_bowl_@2.png" alt="" />
      <div className="title">Just an empty bowl</div>
      <div className="text">You don&apos;t have an active deposit</div>
      <style jsx>
        {`
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
          }
          .bowlImage {
            width: 80px;
          }
          .title {
            color: var(--trophy-gold);
            font-size: 28px;
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
