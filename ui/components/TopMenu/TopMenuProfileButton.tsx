import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"
import {
  selectCurrentAccount,
  selectCurrentAccountTotal,
} from "@tallyho/tally-background/redux-slices/selectors"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"
import { useBackgroundSelector } from "../../hooks"
import SharedCurrentAccountInformation from "../Shared/SharedCurrentAccountInformation"
import TopMenuProfileTooltip from "./TopMenuProfileTooltip"

const TOOLTIP_DELAY = 500

export default function TopMenuProfileButton(props: {
  onClick?: () => void
}): ReactElement {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { name, avatarURL, address, accountType } =
    useBackgroundSelector(selectCurrentAccountTotal) ?? {}

  const { truncatedAddress } = useBackgroundSelector(selectCurrentAccount) ?? {}

  const [shouldDisplayTooltip, setShouldDisplayTooltip] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  const { onClick } = props

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

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      hideTooltip()
      dispatch(setSnackbarMessage(t("topMenu.addressCopiedMsg")))
    }
  }

  return (
    <div className="profile_wrapper" onMouseLeave={hideTooltip}>
      <button
        className="profile_button"
        type="button"
        onClick={handleClick}
        onMouseEnter={showTooltip}
      >
        {typeof truncatedAddress === "undefined" ? (
          <></>
        ) : (
          <>
            <SharedCurrentAccountInformation
              shortenedAddress={truncatedAddress}
              name={name}
              avatarURL={avatarURL}
              showHoverStyle
              showKeyring={
                isEnabled(FeatureFlags.SUPPORT_KEYRING_LOCKING) &&
                (accountType === AccountType.Imported ||
                  accountType === AccountType.Internal)
              }
            />
          </>
        )}
      </button>
      {shouldDisplayTooltip && (
        <TopMenuProfileTooltip copyAddress={copyAddress} />
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
