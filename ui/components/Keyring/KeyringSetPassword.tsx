import { createPassword } from "@tallyho/tally-background/redux-slices/keyrings"
import React, { ReactElement, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import titleStyle from "../Onboarding/titleStyle"

export default function KeyringSetPassword(): ReactElement {
  const [password, setPassword] = useState("")
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const history = useHistory()

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (areKeyringsUnlocked) {
      history.goBack()
    }
  }, [history, areKeyringsUnlocked])

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

  const handleInputChange = (
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

  return (
    <section>
      <div className="full_logo" />
      <h1 className="serif_header">Create a password</h1>
      <div className="subtitle">
        You will NOT be able to change this password for now.
      </div>
      <div className="input_wrap">
        <SharedInput
          type="password"
          placeholder="Password"
          onChange={handleInputChange(setPassword)}
          errorMessage={passwordErrorMessage}
        />
      </div>
      <div className="input_wrap repeat_password_wrap">
        <SharedInput
          type="password"
          placeholder="Repeat Password"
          onChange={handleInputChange(setPasswordConfirmation)}
          errorMessage={passwordErrorMessage}
        />
      </div>
      <SharedButton
        type="primary"
        size="large"
        onClick={dispatchCreatePassword}
        showLoadingOnClick={!passwordErrorMessage}
      >
        Continue
      </SharedButton>
      <div className="restore">
        <SharedButton type="tertiary" size="medium">
          Restoring account?
        </SharedButton>
      </div>
      <style jsx>
        {`
          ${titleStyle}
          .full_logo {
            background: url("./images/full_logo@2x.png");
            background-size: cover;
            width: 118px;
            height: 120px;
            margin-bottom: 17px;
          }
          .input_wrap {
            width: 211px;
          }
          .repeat_password_wrap {
            margin-top: 30px;
            margin-bottom: 40px;
          }
          .restore {
            display: none; // TODO Implement account restoration.
            position: fixed;
            bottom: 26px;
          }
          .subtitle {
            color: var(--green-40);
            width: 307px;
            text-align: center;
            line-height: 24px;
            margin-top: 4px;
          }
        `}
      </style>
    </section>
  )
}
