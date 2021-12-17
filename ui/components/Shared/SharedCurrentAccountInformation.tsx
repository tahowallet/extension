import React, { ReactElement } from "react"

import { selectCurrentAccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../../hooks"

export default function SharedCurrentAccountInformation(): ReactElement {
  const currentAccountTotal = useBackgroundSelector(selectCurrentAccountTotal)

  if (typeof currentAccountTotal === "undefined") {
    return <></>
  }

  const { shortenedAddress, name, avatarURL } = currentAccountTotal

  return (
    <>
      {name?.includes(".") ? name : shortenedAddress}
      <div className="avatar" />
      <style jsx>
        {`
          .avatar {
            border-radius: 12px;
            width: 32px;
            height: 32px;
            margin-left: 8px;
            background: url("${avatarURL ?? "./images/portrait.png"}");
            background-color: var(--green-40);
            background-size: cover;
          }
        `}
      </style>
    </>
  )
}
