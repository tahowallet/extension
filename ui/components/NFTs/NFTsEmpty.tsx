import React, { ReactElement } from "react"

export default function NFTsEmpty(): ReactElement {
  return (
    <div className="standard_width container">
      <img className="bowl_image" src="./images/empty_bowl@2x.png" alt="" />
      <p>Looks rare, but there are no NFT to see here, why not get some?</p>
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
            margin-bottom: 10px;
          }
          p {
            width: 250px;
            text-align: center;
            line-height: 24px;
            font-weight: 500;
            color: var(--green-40);
            font-size: 16px;
          }
        `}
      </style>
    </div>
  )
}
