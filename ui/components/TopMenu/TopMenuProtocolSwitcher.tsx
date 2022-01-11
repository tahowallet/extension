import React, { ReactElement } from "react"

type Props = {
  onClick?: () => void
}

export default function TopMenuProtocolSwitcher({
  onClick,
}: Props): ReactElement {
  return (
    <button type="button" onClick={onClick}>
      Ethereum
      <style jsx>
        {`
          button {
            color: var(--green-40);
            display: flex;
            align-items: center;
            user-select: none;
            cursor: unset;
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
          button:hover .icon_chevron_down {
            background-color: #fff;
          }
        `}
      </style>
    </button>
  )
}
