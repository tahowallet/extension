import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useHistory } from "react-router-dom"
import {
  changePassword,
  setDidPasswordChangeSucceed,
} from "@tallyho/tally-background/redux-slices/keyrings"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import titleStyle from "../Onboarding/titleStyle"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedBackButton from "../Shared/SharedBackButton"
import PasswordStrengthBar from "../Password/PasswordStrengthBar"
import styles from "./styles"

export default function KeyringChangePassword(): ReactElement {
  const [currentPassword, setCurrentPassword] = useState("")
  const [currentPasswordErrorMessage, setCurrentPasswordErrorMessage] =
    useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordErrorMessage, setNewPasswordErrorMessage] = useState("")
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("")
  const history = useHistory()
  const didPasswordChangeSucceed = useBackgroundSelector(
    (state) => state.keyrings.didPasswordChangeSucceed
  )

  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    const changePasswordSuccess = didPasswordChangeSucceed
    const changePasswordFailed = didPasswordChangeSucceed === false

    if (changePasswordSuccess) {
      dispatch(setSnackbarMessage(t("keyring.changePassword.success")))
      history.goBack()
    } else if (changePasswordFailed) {
      setCurrentPasswordErrorMessage(t("keyring.errors.passwordIncorrect"))
    }

    dispatch(setDidPasswordChangeSucceed(null))
  }, [history, didPasswordChangeSucceed, dispatch, t])

  const validateCurrentPassword = (): boolean => {
    if (currentPassword.length < 8) {
      setCurrentPasswordErrorMessage(t("keyring.errors.passwordMinimumLength"))
      return false
    }
    return true
  }

  const validatePassword = (): boolean => {
    if (newPassword.length < 8) {
      setNewPasswordErrorMessage(t("keyring.errors.passwordMinimumLength"))
      return false
    }
    if (newPassword !== newPasswordConfirmation) {
      setNewPasswordErrorMessage(t("keyring.errors.passwordMismatch"))
      return false
    }
    if (newPassword === currentPassword) {
      setNewPasswordErrorMessage(t("keyring.errors.passwordSameAsPrevious"))
      return false
    }
    return true
  }

  const handleCurrentPasswordChange = (
    f: (value: string) => void
  ): ((value: string) => void) => {
    return (value: string) => {
      // If the input field changes, remove the error.
      setCurrentPasswordErrorMessage("")
      return f(value)
    }
  }

  const handleNewPasswordChange = (
    f: (value: string) => void
  ): ((value: string) => void) => {
    return (value: string) => {
      // If the input field changes, remove the error.
      setNewPasswordErrorMessage("")
      return f(value)
    }
  }

  const dispatchChangePassword = async (): Promise<void> => {
    if (validateCurrentPassword() && validatePassword()) {
      dispatch(changePassword({ currentPassword, newPassword }))
    }
  }

  return (
    <section className="standard_width">
      <div className="top">
        <SharedBackButton path="/settings" />
        <div className="wordmark" />
      </div>
      <h1 className="serif_header">{t("keyring.changePassword.title")}</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          dispatchChangePassword()
        }}
      >
        <div className="input_wrap input_wrap_padding_bottom">
          <SharedInput
            type="password"
            label={t("keyring.changePassword.currentPasswordLabel")}
            onChange={handleCurrentPasswordChange(setCurrentPassword)}
            errorMessage={currentPasswordErrorMessage}
          />
        </div>
        <div className="input_wrap">
          <SharedInput
            type="password"
            label={t("keyring.changePassword.newPasswordLabel")}
            onChange={handleNewPasswordChange(setNewPassword)}
            errorMessage={newPasswordErrorMessage}
          />
        </div>
        <div className="strength_bar_wrap">
          {!newPasswordErrorMessage && (
            <PasswordStrengthBar password={newPassword} />
          )}
        </div>
        <div className="input_wrap input_wrap_padding_bottom">
          <SharedInput
            type="password"
            label={t("keyring.repeatPasswordLabel")}
            onChange={handleNewPasswordChange(setNewPasswordConfirmation)}
            errorMessage={newPasswordErrorMessage}
          />
        </div>
        <div className="button_wrap">
          <SharedButton
            type="primary"
            size="large"
            showLoadingOnClick={
              !currentPasswordErrorMessage && !newPasswordErrorMessage
            }
            isFormSubmit
          >
            {t("keyring.changePassword.submit")}
          </SharedButton>
        </div>
      </form>
      <style jsx>{`
        ${titleStyle}
        ${styles}
      `}</style>
    </section>
  )
}
