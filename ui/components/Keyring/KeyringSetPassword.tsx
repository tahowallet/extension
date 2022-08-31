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
import styles from "./styles"

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
        ${styles}
      `}</style>
    </section>
  )
}
