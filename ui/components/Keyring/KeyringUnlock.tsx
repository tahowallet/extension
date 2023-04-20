import React, { ReactElement, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { unlockKeyrings } from "@tallyho/tally-background/redux-slices/keyrings"
import { rejectTransactionSignature } from "@tallyho/tally-background/redux-slices/transaction-construction"
import { useTranslation } from "react-i18next"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import {
  useBackgroundDispatch,
  useAreKeyringsUnlocked,
  useIsDappPopup,
} from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import PasswordInput from "../Shared/PasswordInput"

type KeyringUnlockProps = {
  displayCancelButton: boolean
}

export default function KeyringUnlock({
  displayCancelButton,
}: KeyringUnlockProps): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "keyring.unlock" })
  const { t: tShared } = useTranslation("translation", { keyPrefix: "shared" })
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
      dispatch(setSnackbarMessage(t("snackbar")))
    }
  }, [history, areKeyringsUnlocked, dispatch, t])

  const dispatchUnlockWallet = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    await dispatch(unlockKeyrings(password))
    // If keyring was unable to unlock, display error message
    setErrorMessage(t("error.incorrect"))
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
      {displayCancelButton ? (
        <div className="cancel_btn_wrap">
          <SharedButton type="tertiaryGray" size="small" onClick={handleCancel}>
            {tShared("cancelBtn")}
          </SharedButton>
        </div>
      ) : (
        <></>
      )}
      <div className="img_wrap">
        <div className="illustration_unlock" />
      </div>
      <h1 className="serif_header">{t("title")}</h1>
      <div className="simple_text subtitle">{t("subtitle")}</div>
      <form onSubmit={dispatchUnlockWallet}>
        <div className="signing_wrap">
          <div className="input_wrap">
            <PasswordInput
              id="signing_password"
              label={t("signingPassword")}
              onChange={(value) => {
                setPassword(value)
                // Clear error message on input change
                setErrorMessage("")
              }}
              errorMessage={errorMessage}
            />
          </div>
          <div>
            <SharedButton type="primary" size="large" isFormSubmit>
              {t("submitBtn")}
            </SharedButton>
          </div>
        </div>
        {isEnabled(FeatureFlags.SUPPORT_FORGOT_PASSWORD) && (
          <SharedButton type="tertiaryGray" size="small" onClick={() => {}}>
            {t("forgotPassword")}
          </SharedButton>
        )}
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
            gap: 16px;
          }
          .subtitle {
            width: 55%;
            text-align: center;
            box-sizing: border-box;
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

KeyringUnlock.defaultProps = {
  displayCancelButton: true,
}
