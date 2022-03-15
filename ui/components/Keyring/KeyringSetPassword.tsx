import { createPassword } from "@tallyho/tally-background/redux-slices/keyrings"
import React, { ReactElement, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import titleStyle from "../Onboarding/titleStyle"
import SharedBackButton from "../Shared/SharedBackButton"

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
    <section className="standard_width">
      <div className="top">
        <SharedBackButton />
        <div className="wordmark" />
      </div>
      <h1 className="serif_header">First, let&apos;s secure your wallet</h1>
      <div className="subtitle">
        You will NOT be able to change this password for now.
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          dispatchCreatePassword()
        }}
      >
        <div className="input_wrap">
          <SharedInput
            type="password"
            label="Password"
            onChange={handleInputChange(setPassword)}
            errorMessage={passwordErrorMessage}
          />
        </div>
        <div className="input_wrap repeat_password_wrap">
          <SharedInput
            type="password"
            label="Repeat Password"
            onChange={handleInputChange(setPasswordConfirmation)}
            errorMessage={passwordErrorMessage}
          />
        </div>
        <SharedButton
          type="primary"
          size="large"
          onClick={dispatchCreatePassword}
          showLoadingOnClick={!passwordErrorMessage}
          isFormSubmit
        >
          Begin the hunt
        </SharedButton>
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
            left: 0px;
            right: 0px;
            margin: 0 auto;
          }
          ${titleStyle}
          .serif_header {
            width: 335px;
            text-align: center;
            margin-top: 40px;
            margin-bottom: 7px;
          }
          section {
            padding-top: 25px;
            background-color: var(--hunter-green);
          }
          .input_wrap {
            width: 211px;
          }
          .repeat_password_wrap {
            margin-top: 33px;
            margin-bottom: 50px;
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
