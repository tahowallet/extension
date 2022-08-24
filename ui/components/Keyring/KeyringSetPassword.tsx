import React, { ReactElement, useEffect, useState } from "react"
import { useHistory, useLocation } from "react-router-dom"
import {
  createPassword,
  // TODO: import changePassword
} from "@tallyho/tally-background/redux-slices/keyrings"
import {
  setNewDefaultWalletValue,
  selectDefaultWallet,
} from "@tallyho/tally-background/redux-slices/ui"
import { ALLOW_CHANGE_PASSWORD } from "@tallyho/tally-background/features"
import {
  useBackgroundDispatch,
  useAreKeyringsUnlocked,
  useBackgroundSelector,
} from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import titleStyle from "../Onboarding/titleStyle"
import SharedBackButton from "../Shared/SharedBackButton"
import SharedToggleButton from "../Shared/SharedToggleButton"
import PasswordStrengthBar from "../Password/PasswordStrengthBar"

export default function KeyringSetPassword(): ReactElement {
  const [previousPassword, setPreviousPassword] = useState("")
  const [previousPasswordErrorMessage, setPreviousPasswordErrorMessage] =
    useState("")
  const [password, setPassword] = useState("")
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const history = useHistory()
  const location = useLocation()
  const isInitialPassword = location.pathname.includes("initial-password")
  const isChangePassword =
    ALLOW_CHANGE_PASSWORD && location.pathname.includes("change-password")

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const defaultWallet = useBackgroundSelector(selectDefaultWallet)

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (isInitialPassword && areKeyringsUnlocked) {
      history.goBack()
    }
  }, [history, areKeyringsUnlocked, isInitialPassword])

  const validatePreviousPassword = (): boolean => {
    if (previousPassword.length < 8) {
      setPreviousPasswordErrorMessage("Must be at least 8 characters")
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
    return true
  }

  const handlePreviousPasswordChange = (
    f: (value: string) => void
  ): ((value: string) => void) => {
    return (value: string) => {
      // If the input field changes, remove the error.
      setPreviousPasswordErrorMessage("")
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

  const dispatchCreatePassword = (): void => {
    if (validatePassword()) {
      dispatch(createPassword(password))
    }
  }

  const dispatchChangePassword = (): void => {
    if (validatePreviousPassword() && validatePassword()) {
      // TODO: dispatch changePassword
    }
  }

  return (
    <section className="standard_width">
      <div className="top">
        {isInitialPassword && <SharedBackButton path="/" />}
        {isChangePassword && <SharedBackButton path="/settings" />}
        <div className="wordmark" />
      </div>
      {isInitialPassword && (
        <h1 className="serif_header">First, let&apos;s secure your wallet</h1>
      )}
      {isChangePassword && (
        <h1 className="serif_header">Let&apos;s change your password</h1>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          dispatchCreatePassword()
        }}
      >
        {isChangePassword && (
          <div className="input_wrap input_wrap_padding_bottom">
            <SharedInput
              type="password"
              label="Previous Password"
              onChange={handlePreviousPasswordChange(setPreviousPassword)}
              errorMessage={previousPasswordErrorMessage}
            />
          </div>
        )}
        <div className="input_wrap">
          <SharedInput
            type="password"
            label={isChangePassword ? "New Password" : "Password"}
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
        {isInitialPassword && (
          <div className="set_as_default_ask">
            Set Tally Ho as default wallet
            <SharedToggleButton
              onChange={(toggleValue) => {
                dispatch(setNewDefaultWalletValue(toggleValue))
              }}
              value={defaultWallet}
            />
          </div>
        )}
        <div className="button_wrap">
          {isInitialPassword && (
            <SharedButton
              type="primary"
              size="large"
              onClick={dispatchCreatePassword}
              showLoadingOnClick={!passwordErrorMessage}
              isFormSubmit
            >
              Begin the hunt
            </SharedButton>
          )}
          {isChangePassword && (
            <SharedButton
              type="primary"
              size="large"
              onClick={dispatchChangePassword}
              showLoadingOnClick={
                !previousPasswordErrorMessage && !passwordErrorMessage
              }
              isFormSubmit
            >
              Change password
            </SharedButton>
          )}
        </div>
      </form>
      <div className="restore">
        <SharedButton type="tertiary" size="medium">
          Restoring account?
        </SharedButton>
      </div>
      <style jsx>
        {`
          .top {
            display: flex;
            width: 100%;
          }
          .wordmark {
            background: url("./images/wordmark@2x.png");
            background-size: cover;
            width: 95px;
            height: 25px;
            position: absolute;
            left: 0;
            right: 0;
            margin: 0 auto;
          }
          ${titleStyle}
          .serif_header {
            width: 335px;
            text-align: center;
            margin-top: 40px;
            margin-bottom: 25px;
          }
          section {
            padding-top: 25px;
            background-color: var(--hunter-green);
          }
          .input_wrap {
            width: 211px;
            padding-top: 10px;
          }
          .strength_bar_wrap {
            width: 211px;
            height: 26px;
            box-sizing: border-box;
            padding-top: 10px;
          }
          .input_wrap_padding_bottom {
            padding-bottom: 30px;
          }
          .set_as_default_ask {
            display: flex;
            width: 262px;
            justify-content: space-between;
            align-items: center;
            color: var(--green-20);
            font-weight: 500;
          }
          .restore {
            display: none; // TODO Implement account restoration.
            position: fixed;
            bottom: 26px;
          }
          .button_wrap {
            padding-top: 10px;
          }
        `}
      </style>
    </section>
  )
}
