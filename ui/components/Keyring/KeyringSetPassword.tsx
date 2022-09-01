import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useHistory } from "react-router-dom"
import { createPassword } from "@tallyho/tally-background/redux-slices/keyrings"
import {
  setNewDefaultWalletValue,
  selectDefaultWallet,
} from "@tallyho/tally-background/redux-slices/ui"
import {
  useBackgroundDispatch,
  useAreKeyringsUnlocked,
  useBackgroundSelector,
} from "../../hooks"
import titleStyle from "../Onboarding/titleStyle"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedBackButton from "../Shared/SharedBackButton"
import SharedToggleButton from "../Shared/SharedToggleButton"
import PasswordStrengthBar from "../Password/PasswordStrengthBar"

export default function KeyringSetPassword(): ReactElement {
  const [password, setPassword] = useState("")
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const history = useHistory()

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const defaultWallet = useBackgroundSelector(selectDefaultWallet)

  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (areKeyringsUnlocked) {
      history.goBack()
    }
  }, [history, areKeyringsUnlocked])

  const validatePassword = (): boolean => {
    if (password.length < 8) {
      setPasswordErrorMessage(t("keyring.errors.passwordMinimumLength"))
      return false
    }
    if (password !== passwordConfirmation) {
      setPasswordErrorMessage(t("keyring.errors.passwordMismatch"))
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
      <h1 className="serif_header">{t("keyring.setPassword.title")}</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          dispatchCreatePassword()
        }}
      >
        <div className="input_wrap">
          <SharedInput
            type="password"
            label={t("keyring.setPassword.passwordLabel")}
            onChange={handleInputChange(setPassword)}
            errorMessage={passwordErrorMessage}
          />
        </div>
        <div className="strength_bar_wrap">
          {!passwordErrorMessage && <PasswordStrengthBar password={password} />}
        </div>
        <div className="input_wrap input_wrap_padding_bottom">
          <SharedInput
            type="password"
            label={t("keyring.repeatPasswordLabel")}
            onChange={handleInputChange(setPasswordConfirmation)}
            errorMessage={passwordErrorMessage}
          />
        </div>
        <div className="set_as_default_ask">
          {t("keyring.setPassword.tallyAsDefault")}
          <SharedToggleButton
            onChange={(toggleValue) => {
              dispatch(setNewDefaultWalletValue(toggleValue))
            }}
            value={defaultWallet}
          />
        </div>
        <div className="button_wrap">
          <SharedButton
            type="primary"
            size="large"
            showLoadingOnClick={!passwordErrorMessage}
            isFormSubmit
          >
            {t("keyring.setPassword.submit")}
          </SharedButton>
        </div>
      </form>
      <div className="restore">
        <SharedButton type="tertiary" size="medium">
          {t("keyring.setPassword.restore")}
        </SharedButton>
      </div>
      <style jsx>{`
        ${titleStyle}
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
          display: none;
          position: fixed;
          bottom: 26px;
        }
        .button_wrap {
          padding-top: 10px;
        }
      `}</style>
    </section>
  )
}
