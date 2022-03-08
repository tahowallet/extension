import { selectCurrentAccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useState, useRef } from "react"
import { useDispatch } from "react-redux"
import { useBackgroundSelector } from "../../hooks"
import SharedCurrentAccountInformation from "../Shared/SharedCurrentAccountInformation"

const TOOLTIP_DELAY = 1000

function TopMenuProfileTooltip(props: {
  copyAddress: () => void
  shortenedAddress?: string
}): ReactElement {
  const { shortenedAddress, copyAddress } = props

  return (
    <button type="button" className="tooltip" onClick={copyAddress}>
      {shortenedAddress}
      <span className="icon" />
      <style jsx>{`
        .tooltip {
          display: flex;
          align-items: center;
          position: absolute;
          z-index: 999999999;
          cursor: pointer;
          font-size: 16px;
          line-height: 24px;
          bottom: -35px;
          right: 0;
          background-color: var(--green-80);
          padding: 8px;
          border-radius: 8px;
        }
        .icon {
          mask-image: url("./images/copy@2x.png");
          mask-size: cover;
          width: 16px;
          height: 16px;
          margin-left: 8px;
          display: inline-block;
          background-color: #ffffff;
        }
      `}</style>
    </button>
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
