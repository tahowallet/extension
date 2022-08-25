import React, { ReactElement, useEffect, useState } from "react"
import { useHistory, useLocation } from "react-router-dom"
import {
  createPassword,
  checkPassword,
} from "@tallyho/tally-background/redux-slices/keyrings"
import {
  setNewDefaultWalletValue,
  selectDefaultWallet,
} from "@tallyho/tally-background/redux-slices/ui"
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
  const [currentPassword, setCurrentPassword] = useState("")
  const [currentPasswordErrorMessage, setCurrentPasswordErrorMessage] =
    useState("")
  const [password, setPassword] = useState("")
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const history = useHistory()
  const location = useLocation()
  const isInitialPassword = location.pathname.includes("initial-password")
  const isChangePassword = location.pathname.includes("change-password")

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const defaultWallet = useBackgroundSelector(selectDefaultWallet)

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (isInitialPassword && areKeyringsUnlocked) {
      history.goBack()
    }
  }, [history, areKeyringsUnlocked, isInitialPassword])

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

  const dispatchCreatePassword = (): void => {
    if (validatePassword()) {
      dispatch(createPassword(password))
    }
  }

  // FIXME: pair program this method
  const dispatchChangePassword = async (): Promise<void> => {
    if (validateCurrentPassword() && validatePassword()) {
      checkPassword(currentPassword)
      // TODO: how do we actually know if the current password is valid?
      const isCurrentPasswordValid = currentPassword === "testing123"
      if (isCurrentPasswordValid) {
        dispatchCreatePassword()
        history.goBack()
      } else {
        setCurrentPasswordErrorMessage("Current password is incorrect")
      }
    }
  }

  let backButtonPath = "/"
  let headerText = "First, let's secure your wallet"
  let inputLabel = "Password"
  let buttonOnClick = dispatchCreatePassword
  let buttonShowLoadingOnClick = !passwordErrorMessage
  let buttonText = "Begin the hunt"
  if (isChangePassword) {
    backButtonPath = "/settings"
    headerText = "Let's change your password"
    inputLabel = "New Password"
    buttonOnClick = dispatchChangePassword
    buttonShowLoadingOnClick =
      !currentPasswordErrorMessage && !passwordErrorMessage
    buttonText = "Change password"
  }

  return (
    <section className="standard_width">
      <div className="top">
        <SharedBackButton path={backButtonPath} />
        <div className="wordmark" />
      </div>
      <h1 className="serif_header">{headerText}</h1>

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
              label="Current Password"
              onChange={handleCurrentPasswordChange(setCurrentPassword)}
              errorMessage={currentPasswordErrorMessage}
            />
          </div>
        )}
        <div className="input_wrap">
          <SharedInput
            type="password"
            label={inputLabel}
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
          <SharedButton
            type="primary"
            size="large"
            onClick={buttonOnClick}
            showLoadingOnClick={buttonShowLoadingOnClick}
            isFormSubmit
          >
            {buttonText}
          </SharedButton>
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
