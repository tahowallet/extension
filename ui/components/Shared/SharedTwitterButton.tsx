import React, { ReactElement } from "react"
import SharedButton from "./SharedButton"

export default function SharedTwitterButton({
  link,
  text,
  buttonLabel = "Share",
  onClick,
}: {
  link: string
  text: string
  buttonLabel?: string
  onClick?: () => void
}): ReactElement {
  return (
    <a
      href={encodeURI(
        `https://twitter.com/intent/tweet?url=${link}&text=${text}`,
      )}
      target="_blank"
      rel="noreferrer"
    >
      <SharedButton
        type="twitter"
        size="medium"
        iconPosition="left"
        onClick={onClick}
      >
        {buttonLabel}
      </SharedButton>
    </a>
  )
}
