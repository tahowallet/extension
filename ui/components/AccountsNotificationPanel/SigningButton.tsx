import React, { ReactElement } from "react"
import { lockKeyrings } from "@tallyho/tally-background/redux-slices/keyrings"
import { useHistory } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks"
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
  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const keyringData = {
    color: areKeyringsUnlocked ? "error" : "success",
    icon: areKeyringsUnlocked ? "lock" : "unlock",
  }

  const toggleKeyringStatus = async () => {
    if (!areKeyringsUnlocked) {
      history.push("/keyring/unlock")
    } else {
      await dispatch(lockKeyrings())
      onCurrentAddressChange("")
    }
  }

  return (
    <>
      <button
        type="button"
        className="signing_btn"
        onClick={toggleKeyringStatus}
      >
        {t(
          `accounts.notificationPanel.signing.${
            areKeyringsUnlocked ? "lock" : "unlock"
          }`
        )}
        <SharedIcon
          icon={`icons/m/${keyringData.icon}.svg`}
          width={25}
          color="var(--green-40)"
          hoverColor={`var(--${keyringData.color})`}
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
            color: var(--${keyringData.color});
          }
        `}
      </style>
      <style global jsx>
        {`
          .signing_btn:hover .icon {
            background-color: var(--${keyringData.color});
          }
        `}
      </style>
    </>
  )
}
