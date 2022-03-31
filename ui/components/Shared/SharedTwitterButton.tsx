import React, { ReactElement } from "react"
import { TwitterShareButton } from "react-share"
import SharedButton from "./SharedButton"

export default function SharedTwitterButton({
  link,
  text,
  buttonLabel = "Share",
}: {
  link: string
  text: string
  buttonLabel?: string
}): ReactElement {
  return (
    <TwitterShareButton url={link} title={text}>
      <SharedButton
        type="twitter"
        size="medium"
        iconPosition="left"
        iconSize="secondaryMedium"
      >
        {buttonLabel}
      </SharedButton>
    </TwitterShareButton>
  )
}
