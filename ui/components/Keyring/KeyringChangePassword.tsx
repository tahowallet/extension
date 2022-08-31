import React, { ReactElement, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import {
  changePassword,
  setDidPasswordChangeSucceed,
} from "@tallyho/tally-background/redux-slices/keyrings"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedBackButton from "../Shared/SharedBackButton"
import PasswordStrengthBar from "../Password/PasswordStrengthBar"
import styles from "./styles"

export default function KeyringChangePassword(): ReactElement {
  const [currentPassword, setCurrentPassword] = useState("")
  const [currentPasswordErrorMessage, setCurrentPasswordErrorMessage] =
    useState("")
  const [password, setPassword] = useState("")
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const history = useHistory()
  const didPasswordChangeSucceed = useBackgroundSelector(
    (state) => state.keyrings.didPasswordChangeSucceed
  )

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    const changePasswordSuccess = didPasswordChangeSucceed
    const changePasswordFailed = didPasswordChangeSucceed === false

    if (changePasswordSuccess) {
      history.goBack()
    } else if (changePasswordFailed) {
      setCurrentPasswordErrorMessage("Current password is incorrect")
    }

    dispatch(setDidPasswordChangeSucceed(null))
  }, [history, didPasswordChangeSucceed, dispatch])

  const validateCurrentPassword = (): boolean => {
    if (currentPassword.length < 8) {
      setCurrentPasswordErrorMessage("Must be at least 8 characters")
      return false
    }
    return true
  }

  const validatePassword = (): boolean => {
    if (password.length < 8) {
      setPasswordErrorMessage("Must be at least 8 characters")
      return false
    }
    if (password !== passwordConfirmation) {
      setPasswordErrorMessage("Passwords don’t match")
      return false
    }
    if (password === currentPassword) {
      setPasswordErrorMessage("Must not be the same as previous")
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
      setPasswordErrorMessage("")
      return f(value)
    }
  }

  const dispatchChangePassword = async (): Promise<void> => {
    if (validateCurrentPassword() && validatePassword()) {
      dispatch(
        changePassword(
          JSON.stringify({ currentPassword, newPassword: password })
        )
      )
    }
  }

  return (
    <section className="standard_width">
      <div className="top">
        <SharedBackButton path="/settings" />
        <div className="wordmark" />
      </div>
      <h1 className="serif_header">Let&apos;s change your password</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          dispatchChangePassword()
        }}
      >
        <div className="input_wrap input_wrap_padding_bottom">
          <SharedInput
            type="password"
            label="Current Password"
            onChange={handleCurrentPasswordChange(setCurrentPassword)}
            errorMessage={currentPasswordErrorMessage}
          />
        </div>
        <div className="input_wrap">
          <SharedInput
            type="password"
            label="New Password"
            onChange={handleNewPasswordChange(setPassword)}
            errorMessage={passwordErrorMessage}
          />
        </div>
        <div className="strength_bar_wrap">
          {!passwordErrorMessage && <PasswordStrengthBar password={password} />}
        </div>
        <div className="input_wrap input_wrap_padding_bottom">
          <SharedInput
            type="password"
            label="Repeat Password"
            onChange={handleNewPasswordChange(setPasswordConfirmation)}
            errorMessage={passwordErrorMessage}
          />
        </div>
        <div className="button_wrap">
          <SharedButton
            type="primary"
            size="large"
            showLoadingOnClick={
              !currentPasswordErrorMessage && !passwordErrorMessage
            }
            isFormSubmit
          >
            Change password
          </SharedButton>
        </div>
      </form>
      <style jsx>{styles}</style>
    </section>
  )
}
