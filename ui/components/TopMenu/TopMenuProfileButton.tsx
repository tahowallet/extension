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
          button::after {
            content: "";
            display: block;
            width: 36px;
            height: 36px;
            position: absolute;
            right: 12.5px;
            border-radius: 16px;
            border: solid 2px var(--trophy-gold);
            opacity: 0;
          }
          button:hover::after {
            opacity: 1;
          }
        `}
      </style>
    </button>
  )
}
