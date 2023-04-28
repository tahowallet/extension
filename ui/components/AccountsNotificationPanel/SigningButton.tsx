import React, { ReactElement } from "react"
import { lockInternalSigners } from "@tallyho/tally-background/redux-slices/internal-signer"
import { useHistory } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  useBackgroundDispatch,
  useAreInternalSignersUnlocked,
} from "../../hooks"
import SharedIcon from "../Shared/SharedIcon"

type SigningButtonProps = {
  onCurrentAddressChange: (newAddress: string) => void
}

export default function SigningButton({
  onCurrentAddressChange,
}: SigningButtonProps): ReactElement {
  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()
  const history = useHistory()
  const areInternalSignersUnlocked = useAreInternalSignersUnlocked(false)

  const buttonData = {
    color: areInternalSignersUnlocked ? "error" : "success",
    icon: areInternalSignersUnlocked ? "lock" : "unlock",
  }

  const toggleLockStatus = async () => {
    if (!areInternalSignersUnlocked) {
      history.push("/internal-signer/unlock")
    } else {
      await dispatch(lockInternalSigners())
      onCurrentAddressChange("")
    }
  }

  return (
    <>
      <button type="button" className="signing_btn" onClick={toggleLockStatus}>
        {t(
          `accounts.notificationPanel.signing.${
            areInternalSignersUnlocked ? "lock" : "unlock"
          }`
        )}
        <SharedIcon
          icon={`icons/m/${buttonData.icon}.svg`}
          width={25}
          color="var(--green-40)"
          hoverColor={`var(--${buttonData.color})`}
          transitionHoverTime="0.2s"
        />
      </button>
      <style jsx>
        {`
          .signing_btn {
            display: flex;
            align-items: center;
            gap: 5px;
            transition: color 0.2s;
          }
          .signing_btn:hover {
            color: var(--${buttonData.color});
          }
        `}
      </style>
      <style global jsx>
        {`
          .signing_btn:hover .icon {
            background-color: var(--${buttonData.color});
          }
        `}
      </style>
    </>
  )
}
