import React, { ReactElement, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { unlockKeyrings } from "@tallyho/tally-background/redux-slices/keyrings"
import { rejectTransactionSignature } from "@tallyho/tally-background/redux-slices/transaction-construction"
import { useTranslation } from "react-i18next"
import {
  useBackgroundDispatch,
  useAreKeyringsUnlocked,
  useIsDappPopup,
} from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"

export default function KeyringUnlock(): ReactElement {
  const { t } = useTranslation()
  const prefix = "keyring.unlock"
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const isDappPopup = useIsDappPopup()
  const history: {
    entries?: { pathname: string }[]
    goBack: () => void
  } = useHistory()

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (areKeyringsUnlocked) {
      history.goBack()
    }
  }, [history, areKeyringsUnlocked])

  const dispatchUnlockWallet = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    await dispatch(unlockKeyrings(password))
    // If keyring was unable to unlock, display error message
    setErrorMessage("Incorrect password")
  }

  const handleReject = async () => {
    await dispatch(rejectTransactionSignature())
  }

  const handleBack = async () => {
    await handleReject()
    history.goBack()
  }

  const handleCancel = () => {
    if (isDappPopup) {
      handleReject()
    } else {
      handleBack()
    }
  }

  return (
    <section className="standard_width">
      <div className="cancel_btn_wrap">
        <SharedButton type="tertiaryGray" size="small" onClick={handleCancel}>
          {t("shared.cancelBtn")}
        </SharedButton>
      </div>
      <div className="img_wrap">
        <div className="illustration_unlock" />
      </div>
      <h1 className="serif_header">{t(`${prefix}.title`)}</h1>
      <form onSubmit={dispatchUnlockWallet}>
        <div className="signing_wrap">
          <div className="input_wrap">
            <SharedInput
              type="password"
              label={t(`${prefix}.signingPassword`)}
              onChange={(value) => {
                setPassword(value)
                // Clear error message on input change
                setErrorMessage("")
              }}
              errorMessage={errorMessage}
              iconMedium="eye-on"
              focusedLabelBackgroundColor="var(--green-95)"
            />
          </div>
          <div>
            <SharedButton type="primary" size="large" isFormSubmit>
              {t(`${prefix}.submitBtn`)}
            </SharedButton>
          </div>
        </div>
        <SharedButton type="tertiaryGray" size="small" onClick={() => {}}>
          {t(`${prefix}.forgotPassword`)}
        </SharedButton>
      </form>
      <style jsx>
        {`
          .illustration_unlock {
            background: url("./images/illustration_unlock@2x.png");
            background-position: center;
            background-repeat: no-repeat;
            background-size: contain;
            width: 182.83px;
            height: 172.18px;
          }
          section {
            background-color: var(--green-95);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            gap: 25px;
          }
          form {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .signing_wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 30px;
          }
          .cancel_btn_wrap {
            width: 100%;
            display: flex;
            justify-content: flex-end;
            right: 0px;
            top: 0px;
            margin-top: 12px;
          }
          .input_wrap {
            width: 260px;
          }
        `}
      </style>
    </section>
  )
}
