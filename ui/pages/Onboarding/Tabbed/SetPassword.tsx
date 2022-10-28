import React, { ReactElement, useEffect, useState } from "react"
import {
  createPassword,
  generateNewKeyring,
} from "@tallyho/tally-background/redux-slices/keyrings"
import {
  setNewDefaultWalletValue,
  selectDefaultWallet,
} from "@tallyho/tally-background/redux-slices/ui"
import { useHistory } from "react-router-dom"
import {
  useBackgroundDispatch,
  useAreKeyringsUnlocked,
  useBackgroundSelector,
} from "../../../hooks"
import SharedButton from "../../../components/Shared/SharedButton"
import SharedToggleButton from "../../../components/Shared/SharedToggleButton"
import PasswordStrengthBar from "../../../components/Password/PasswordStrengthBar"
import PasswordInput from "../../../components/Shared/PasswordInput"

export default function SetPassword({
  nextPage,
}: {
  nextPage: string
}): ReactElement {
  const [password, setPassword] = useState("")
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const history = useHistory()

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const defaultWallet = useBackgroundSelector(selectDefaultWallet)

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (areKeyringsUnlocked) {
      dispatch(generateNewKeyring())
      history.push(nextPage)
    }
  }, [areKeyringsUnlocked, dispatch, history, nextPage])

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
    <>
      <div className="illustration_section">
        <div className="illustration" />
        <style jsx>
          {`
            .illustration_section {
              height: 140px;
              display: flex;
              position: relative;
            }
            .illustration {
              background: url("./images/doggo_secure.svg") no-repeat;
              background-size: 100%;
              width: 120px;
              height: 140px;
              flex-shrink: 0;
              margin: 0 auto;
              margin-top: 0;
              animation: fadeIn ease 0.5s;
            }
          `}
        </style>
      </div>

      <div className="password_section">
        <h1 className="center_text">First, let&apos;s secure your wallet</h1>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            dispatchCreatePassword()
          }}
        >
          <div className="input_wrap">
            <PasswordInput
              label="Password"
              onChange={handleInputChange(setPassword)}
              errorMessage={passwordErrorMessage}
            />
          </div>
          <div className="strength_bar_wrap">
            {!passwordErrorMessage && (
              <PasswordStrengthBar password={password} />
            )}
          </div>
          <div className="input_wrap repeat_password_wrap">
            <PasswordInput
              label="Repeat Password"
              onChange={handleInputChange(setPasswordConfirmation)}
              errorMessage={passwordErrorMessage}
            />
          </div>
          <div className="set_as_default_ask">
            Set Tally Ho as default wallet
            <SharedToggleButton
              onChange={(toggleValue) => {
                dispatch(setNewDefaultWalletValue(toggleValue))
              }}
              value={defaultWallet}
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
            form {
              background: transparent;
              width: 65%;
            }
            h1 {
              font-family: "Quincy CF";
              font-weight: 500;
              font-size: 46px;
              line-height: 42px;
              margin: 1em;
            }
            .input_wrap {
              width: 100%;
            }
            .strength_bar_wrap {
              width: 100%;
              height: 26px;
              box-sizing: border-box;
              padding-top: 10px;
              margin-bottom: 25px;
            }
            .repeat_password_wrap {
              margin-bottom: 25px;
              margin-top: 10px;
            }
            .set_as_default_ask {
              display: flex;
              width: 100%;
              justify-content: space-between;
              align-items: center;
              color: var(--green-20);
              font-weight: 500;
              margin-bottom: 40px;
            }
            .restore {
              display: none; // TODO Implement account restoration.
              position: fixed;
              bottom: 26px;
            }
            .warning_wrap {
              margin-top: 16px;
              margin-bottom: 24px;
            }
            .warning_content {
              color: var(--attention);
              font-weight: 500;
              font-size: 16px;
              line-height: 24px;
            }
            .password_section {
              text-align: center;
              width: 100%;
              max-width: 500px;
              margin: auto;
            }
          `}
        </style>
      </div>
    </>
  )
}
