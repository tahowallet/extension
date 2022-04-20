import { createPassword } from "@tallyho/tally-background/redux-slices/keyrings"
import React, { ReactElement, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import titleStyle from "../Onboarding/titleStyle"
import SharedBackButton from "../Shared/SharedBackButton"
import SharedIcon from "../Shared/SharedIcon"

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
        <SharedBackButton path="/" />
        <div className="wordmark" />
      </div>
      <h1 className="serif_header">First, let&apos;s secure your wallet</h1>

      <div className="warning_wrap">
        <SharedIcon
          icon="icons/m/notif-attention.svg"
          width={24}
          color="var(--attention)"
          ariaLabel="password attention"
          customStyles="flex-shrink:0"
        />
        <div className="warning_text">
          You will NOT be able to change this password for now
        </div>
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
          .warning_wrap {
            width: 336px;
            background: var(--green-120);
            border-radius: 8px;
            margin-top: 16px;
            margin-bottom: 24px;
            padding: 8px;
            display: flex;
            flex-direction: row;
            align-items: start;
          }
          .warning_text {
            color: var(--attention);
            font-weight: 500;
            font-size: 16px;
            line-height: 24px;
            margin-left: 8px;
          }
        `}
      </style>
    </section>
  )
}
