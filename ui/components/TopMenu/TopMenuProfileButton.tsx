import React, { ReactElement } from "react"
import SharedCurrentAccountInformation from "../Shared/SharedCurrentAccountInformation"

export default function TopMenuProfileButton(props: {
  onClick?: () => void
}): ReactElement {
  const { onClick } = props
  return (
    <button type="button" onClick={onClick}>
      <SharedCurrentAccountInformation />
      <style jsx>
        {`
          button {
            flex-shrink: 0;
            height: 64px;
            display: flex;
            align-items: center;
            user-select: none;
          }
        `}
      </style>
    </button>
  )
}
