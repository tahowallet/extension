import React from "react"

export default function TopMenuProtocolSwitcher() {
  return (
    <button type="button">
      Ethereum
      <span className="icon_chevron_down" />
      <style jsx>
        {`
          button {
            color: var(--green-40);
            display: flex;
            align-items: center;
            cursor: pointer;
          }
          .icon_chevron_down {
            mask-image: url("./images/chevron_down.svg");
            mask-size: 15px 8px;
            width: 15px;
            height: 8px;
            margin-left: 7px;
            margin-top: 2px;
            background-color: var(--green-40);
          }
          button:hover {
            color: #fff;
          }
          button:hover .icon_chevron_down {
            background-color: #fff;
          }
        `}
      </style>
    </button>
  )
}
