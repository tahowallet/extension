import { selectCurrentAccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import SharedCurrentAccountInformation from "../Shared/SharedCurrentAccountInformation"

export default function TopMenuProfileButton(props: {
  onClick?: () => void
}): ReactElement {
  const { shortenedAddress, name, avatarURL } =
    useBackgroundSelector(selectCurrentAccountTotal) ?? {}

  const { onClick } = props

  return (
    <button type="button" onClick={onClick}>
      {typeof shortenedAddress === "undefined" ? (
        <></>
      ) : (
        <SharedCurrentAccountInformation
          shortenedAddress={shortenedAddress}
          name={name}
          avatarURL={avatarURL}
          showHoverStyle
        />
      )}
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
