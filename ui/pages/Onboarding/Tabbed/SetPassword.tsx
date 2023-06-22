import React, { useEffect, useState } from "react"
import {
  createPassword,
  unlockInternalSigners,
} from "@tallyho/tally-background/redux-slices/internal-signer"
import { Redirect, useHistory, useLocation } from "react-router-dom"
import { Trans, useTranslation } from "react-i18next"
import { selectInternalSignerStatus } from "@tallyho/tally-background/redux-slices/selectors"
import {
  useBackgroundDispatch,
  useAreInternalSignersUnlocked,
  useBackgroundSelector,
  useIsOnboarding,
} from "../../../hooks"
import SharedButton from "../../../components/Shared/SharedButton"
import PasswordStrengthBar from "../../../components/Password/PasswordStrengthBar"
import PasswordInput from "../../../components/Shared/PasswordInput"
import { WalletDefaultToggle } from "../../../components/Wallet/WalletToggleDefaultBanner"
import OnboardingRoutes from "./Routes"

export default function SetPassword(): JSX.Element {
  const [password, setPassword] = useState("")
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const history = useHistory()
  const { t } = useTranslation()

  const { state: { nextPage } = {} } = useLocation<{ nextPage?: string }>()

  const areInternalSignersUnlocked = useAreInternalSignersUnlocked(false)

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (nextPage && areInternalSignersUnlocked) {
      history.replace(nextPage)
    }
  }, [areInternalSignersUnlocked, history, nextPage])

  const validatePassword = (): boolean => {
    if (password.length < 8) {
      setPasswordErrorMessage(t("keyring.setPassword.error.characterCount"))
      return false
    }
    if (password !== passwordConfirmation) {
      setPasswordErrorMessage(t("keyring.setPassword.error.noMatch"))
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

  const lockStatus = useBackgroundSelector(selectInternalSignerStatus)
  const isOnboarding = useIsOnboarding()

  if (!nextPage) {
    return <Redirect to={OnboardingRoutes.ONBOARDING_START} />
  }

  // Unlock Wallet
  if (!isOnboarding && lockStatus === "locked") {
    const handleAttemptUnlock: React.FormEventHandler<HTMLFormElement> = async (
      event
    ) => {
      const { currentTarget: form } = event
      event.preventDefault()

      const input = form.elements.namedItem("password") as HTMLInputElement

      const { success } = await dispatch(unlockInternalSigners(input.value))

      if (success) {
        history.replace(nextPage)
      } else {
        setPasswordErrorMessage(t("keyring.unlock.error.incorrect"))
      }
    }

    return (
      <section className="fade_in">
        <header className="center_text">
          <img
            alt={t("onboarding.tabbed.unlockWallet.title")}
            width="183"
            src="./images/illustration_unlock@2x.png"
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
                margin: 0 auto 24px;
              }
            `}
          </style>
          <h1>{t("onboarding.tabbed.unlockWallet.title")}</h1>
        </header>
        <form onSubmit={handleAttemptUnlock}>
          <PasswordInput
            label={t("onboarding.tabbed.unlockWallet.passwordInput")}
            name="password"
            errorMessage={passwordErrorMessage}
          />
          <SharedButton type="primary" size="medium" isFormSubmit>
            {t("onboarding.tabbed.unlockWallet.submit")}
          </SharedButton>
          <style jsx>{`
            form {
              max-width: 290px;
              display: flex;
              flex-direction: column;
              align-items: center;
              margin: 0 auto;
              gap: 40px;
            }
          `}</style>
        </form>
      </section>
    )
  }

  // Set new password
  return (
    <section className="fade_in">
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
          <Trans t={t} i18nKey="onboarding.setPassword.title" />
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
            {t("onboarding.setPassword.setAsDefault")}
            <WalletDefaultToggle />
          </div>
          <SharedButton
            type="primary"
            size="large"
            showLoadingOnClick={!passwordErrorMessage}
            isFormSubmit
          >
            <span className="submit_button">
              {t("onboarding.setPassword.submit")}
            </span>
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
