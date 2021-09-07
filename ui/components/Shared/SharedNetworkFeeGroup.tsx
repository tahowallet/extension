import React, { ReactElement, useState } from "react"
import SharedFeeSelectButton from "./SharedFeeSelectButton"

export default function SharedNetworkFeeGroup(): ReactElement {
  const [selectedFee, setSelectedFee] = useState(0)

  return (
    <ul>
      <li>
        <SharedFeeSelectButton
          isActive={selectedFee === 0}
          onClick={() => {
            setSelectedFee(0)
          }}
        />
      </li>
      <li>
        <SharedFeeSelectButton
          isActive={selectedFee === 1}
          onClick={() => {
            setSelectedFee(1)
          }}
        />
      </li>
      <li>
        <SharedFeeSelectButton
          isActive={selectedFee === 2}
          onClick={() => {
            setSelectedFee(2)
          }}
        />
      </li>
      <style jsx>
        {`
          ul {
            display: flex;
            margin-bottom: 29px;
          }
          li {
            margin-right: 16px;
          }
        `}
      </style>
    </ul>
  )
}
