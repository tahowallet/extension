import React, { ReactElement, useEffect, useState } from "react"
import { createPassword } from "@tallyho/tally-background/redux-slices/keyrings"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../../hooks"
import SharedButton from "../../../components/Shared/SharedButton"
import PasswordStrengthBar from "../../../components/Password/PasswordStrengthBar"
import PasswordInput from "../../../components/Shared/PasswordInput"
import { WalletDefaultToggle } from "../../../components/Wallet/WalletToggleDefaultBanner"

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

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (areKeyringsUnlocked) {
      history.replace(nextPage)
    }
  }, [areKeyringsUnlocked, history, nextPage])

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
    <section className="fadeIn">
      <header>
        <img
          alt="Secure doggo"
          width="80"
          height="80"
          src="./images/doggo_secure.svg"
        />
        <style jsx>
          {`
            header {
              display: flex;
              flex-direction: column;
              gap: 20px;
              margin-bottom: 32px;
            }

            header h1 {
              font-family: "Quincy CF";
              font-weight: 500;
              font-size: 36px;
              line-height: 42px;
              margin: 0em;
            }

            img {
              margin: 0 auto;
            }
          `}
        </style>
        <h1 className="center_text">
          First, let&apos;s secure
          <br /> your wallet
        </h1>
      </header>
      <div className="password_section">
        <form
          name="password"
          onSubmit={(event) => {
            event.preventDefault()
            dispatchCreatePassword()
          }}
        >
          <div className="input_wrap">
            <PasswordInput
              label="Password"
              name="password"
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
              name="confirm_password"
              label="Repeat Password"
              onChange={handleInputChange(setPasswordConfirmation)}
              errorMessage={passwordErrorMessage}
            />
          </div>
          <div className="set_as_default_ask">
            Set Tally Ho as default wallet
            <WalletDefaultToggle />
          </div>
          <SharedButton
            type="primary"
            size="large"
            showLoadingOnClick={!passwordErrorMessage}
            isFormSubmit
          >
            <span className="submit_button">Begin the hunt</span>
          </SharedButton>
        </form>

        <style jsx>
          {`
            form {
              max-width: 290px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .input_wrap {
              width: 100%;
            }

            .strength_bar_wrap {
              width: 100%;
              height: 26px;
              box-sizing: border-box;
              padding-top: 10px;
              margin-bottom: 28px;
            }
            .repeat_password_wrap {
              margin-bottom: 44px;
            }
            .set_as_default_ask {
              display: flex;
              align-items: center;
              width: 100%;
              color: var(--green-20);
              font-size: 16px;
              line-height: 24px;
              font-weight: 500;
              margin-bottom: 32px;
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

            .submit_button {
              font-size: 20px;
              line-height: 24px;
              font-weight: 500;
            }
          `}
        </style>
      </div>
    </section>
  )
}
