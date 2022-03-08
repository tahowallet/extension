import { selectCurrentAccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useState, useRef } from "react"
import { useDispatch } from "react-redux"
import { useBackgroundSelector } from "../../hooks"
import SharedCurrentAccountInformation from "../Shared/SharedCurrentAccountInformation"
import SharedButton from "../Shared/SharedButton"

const TOOLTIP_DELAY = 1000

function TopMenuProfileTooltip(props: {
  copyAddress: () => void
  shortenedAddress?: string
}): ReactElement {
  const { shortenedAddress, copyAddress } = props

  return (
    <div className="tooltip">
      <SharedButton
        type="deemphasizedWhite"
        size="small"
        icon="copy"
        iconSize="large"
        iconPosition="right"
        onClick={copyAddress}
      >
        {shortenedAddress}
      </SharedButton>
      <style jsx>{`
        .tooltip {
          position: absolute;
          bottom: -25px;
          right: 0;
          z-index: 999999999;
        }
      `}</style>
    </div>
  )
}

export default function TopMenuProfileButton(props: {
  onClick?: () => void
}): ReactElement {
  const dispatch = useDispatch()
  const { shortenedAddress, name, avatarURL, address } =
    useBackgroundSelector(selectCurrentAccountTotal) ?? {}

  const [shouldDisplayTooltip, setShouldDisplayTooltip] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  const { onClick } = props

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      dispatch(setSnackbarMessage("Copied!"))
    }
  }

  const showTooltip = () => {
    timerRef.current = window.setTimeout(
      () => setShouldDisplayTooltip(true),
      TOOLTIP_DELAY
    )
  }
  const hideTooltip = () => {
    clearTimeout(timerRef.current ?? 0)
    setShouldDisplayTooltip(false)
  }
  const handleClick = () => {
    hideTooltip()
    onClick?.()
  }

  return (
    <div className="profile_wrapper" onMouseLeave={hideTooltip}>
      <button
        className="profile_button"
        type="button"
        onClick={handleClick}
        onMouseEnter={showTooltip}
      >
        {typeof shortenedAddress === "undefined" ? (
          <></>
        ) : (
          <>
            <SharedCurrentAccountInformation
              shortenedAddress={shortenedAddress}
              name={name}
              avatarURL={avatarURL}
              showHoverStyle
            />
          </>
        )}
      </button>
      {shouldDisplayTooltip && (
        <TopMenuProfileTooltip
          shortenedAddress={shortenedAddress}
          copyAddress={copyAddress}
        />
      )}
      <style jsx>
        {`
          .profile_wrapper {
            position: relative;
          }
          .profile_button {
            flex-shrink: 0;
            height: 64px;
            display: flex;
            align-items: center;
            user-select: none;
          }
        `}
      </style>
    </div>
  )
}
