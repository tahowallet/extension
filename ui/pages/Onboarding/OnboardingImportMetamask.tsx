import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { importKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import { useHistory } from "react-router-dom"
import { isValidMnemonic } from "@ethersproject/hdnode"
import classNames from "classnames"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { DEFAULT_DERIVATION_PATH } from "@tallyho/tally-background/constants"
import { useTranslation } from "react-i18next"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import SharedButton from "../../components/Shared/SharedButton"
import SharedBackButton from "../../components/Shared/SharedBackButton"
import OnboardingDerivationPathSelect from "../../components/Onboarding/OnboardingDerivationPathSelect"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
} from "../../hooks"

function TextArea({
  value,
  onChange,
  errorMessage,
}: {
  value: string
  onChange: (value: string) => void
  errorMessage: string
}) {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.addWallet.importExistingWallet",
  })
  return (
    <>
      <textarea
        id="recovery_phrase"
        placeholder=" "
        className={classNames("wrap center_horizontal", {
          error: errorMessage,
        })}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <label htmlFor="recovery_phrase">{t("pasteRecoveryPhrase")}</label>
      {errorMessage && <div className="error_message">{errorMessage}</div>}
      <style jsx>{`
        textarea {
          width: 320px;
          height: 97px;
          border-radius: 4px;
          border: 2px solid var(--green-60);
          padding: 12px 16px;
          box-sizing: border-box;
        }
        .error {
          border-color: var(--trophy-gold);
        }
        .error_message {
          color: var(--error);
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
          align-self: flex-start;
          height: 20px;
          margin-top: 3px;
        }
        label {
          position: absolute;
          pointer-events: none;
          display: flex;
          width: fit-content;
          margin-left: 16px;
          transform: translateY(-80px);
          background-color: var(--hunter-green);
          border-radius: 5px;
          box-sizing: border-box;
          color: var(--green-40);
          transition: font-size 0.2s ease, transform 0.2s ease,
            font-weight 0.2s ease, padding 0.2s ease;
        }
        textarea:focus {
          border-color: var(--trophy-gold);
        }
        textarea:focus ~ label {
          color: var(--trophy-gold);
        }
        textarea:focus ~ label,
        textarea:not(:placeholder-shown) ~ label {
          transform: translateY(-103px) translateX(-5px);
          font-size: 12px;
          font-weight: 500;
          padding: 0px 6px;
        }
        .error ~ label,
        textarea.error:focus ~ label {
          color: var(--error);
        }
      `}</style>
    </>
  )
}

type Props = {
  nextPage: string
}

export default function OnboardingImportMetamask(props: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.addWallet.importExistingWallet",
  })
  const { nextPage } = props
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)

  const [recoveryPhrase, setRecoveryPhrase] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [path, setPath] = useState<string>(
    selectedNetwork.derivationPath ?? DEFAULT_DERIVATION_PATH
  )
  const [isImporting, setIsImporting] = useState(false)

  const dispatch = useBackgroundDispatch()
  const keyringImport = useBackgroundSelector(
    (state) => state.keyrings.importing
  )

  const history = useHistory()

  useEffect(() => {
    if (areKeyringsUnlocked && keyringImport === "done" && isImporting) {
      setIsImporting(false)
      history.push(nextPage)
    }
  }, [history, areKeyringsUnlocked, keyringImport, nextPage, isImporting])

  const importWallet = useCallback(async () => {
    const plainRecoveryPhrase = recoveryPhrase
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
    const splitTrimmedRecoveryPhrase = plainRecoveryPhrase.split(" ")
    if (
      splitTrimmedRecoveryPhrase.length !== 12 &&
      splitTrimmedRecoveryPhrase.length !== 24
    ) {
      setErrorMessage(t("phraseLengthError"))
    } else if (isValidMnemonic(plainRecoveryPhrase)) {
      setIsImporting(true)
      dispatch(
        importKeyring({
          mnemonic: plainRecoveryPhrase,
          path,
          source: "import",
        })
      )
    } else {
      setErrorMessage(t("invalidPhraseError"))
    }
  }, [dispatch, recoveryPhrase, path, t])

  if (!areKeyringsUnlocked) return <></>

  return (
    <section className="center_horizontal standard_width">
      <div className="content">
        <div className="back_button_wrap">
          <SharedBackButton path="/" />
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            importWallet()
          }}
        >
          <div className="portion top">
            <div className="illustration_import" />
            <h1 className="serif_header">{t("importAccount")}</h1>
            <div className="info">{t("enterPhrasePrompt")}</div>
            <div>
              <TextArea
                value={recoveryPhrase}
                onChange={(value) => {
                  // Clear error message on change
                  setErrorMessage("")
                  setRecoveryPhrase(value)
                }}
                errorMessage={errorMessage}
              />
            </div>

            {!isEnabled(FeatureFlags.HIDE_IMPORT_DERIVATION_PATH) && (
              <div className="select_wrapper">
                <OnboardingDerivationPathSelect onChange={setPath} />
              </div>
            )}
          </div>
          <div className="portion bottom">
            <SharedButton
              size={
                isEnabled(FeatureFlags.HIDE_IMPORT_DERIVATION_PATH)
                  ? "medium"
                  : "large"
              }
              type="primary"
              isDisabled={isImporting}
              onClick={importWallet}
            >
              {t("importAccount")}
            </SharedButton>
            {!isEnabled(FeatureFlags.HIDE_IMPORT_DERIVATION_PATH) && (
              <button
                className="help_button"
                type="button"
                // TODO External link or information modal?
                onClick={() => {}}
              >
                {t("helpFindPhrase")}
              </button>
            )}
          </div>
        </form>
      </div>
      <style jsx>{`
        section {
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          background-color: var(--hunter-green);
        }
        .content {
          animation: fadeIn ease 200ms;
          width: inherit;
        }
        .back_button_wrap {
          position: fixed;
          top: 25px;
        }
        h1 {
          margin: unset;
        }
        .portion {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bottom {
          justify-content: space-between;
          flex-direction: column;
          margin-bottom: ${isEnabled(FeatureFlags.HIDE_IMPORT_DERIVATION_PATH)
            ? "24px"
            : "16px"};
          margin-top: ${isEnabled(FeatureFlags.HIDE_IMPORT_DERIVATION_PATH)
            ? "35px"
            : "24px"};
        }
        .illustration_import {
          background: url("./images/illustration_import_seed@2x.png");
          background-size: cover;
          width: 106.5px;
          height: 103.5px;
          margin-top: 60px;
          margin-bottom: 15px;
        }
        .serif_header {
          font-size: 36px;
          line-height: 42px;
          margin-bottom: 8px;
        }

        .info {
          height: 43px;
          margin-bottom: 18px;
        }
        .info,
        .help_button {
          width: 320px;
          text-align: center;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-60);
          font-weight: 500;
        }
        .help_button {
          margin-top: 16px;
        }
        .checkbox_wrapper {
          margin-top: 6px;
          margin-bottom: 6px;
        }
        .select_wrapper {
          margin-top: ${errorMessage ? "4px" : "15px"};
          width: 320px;
        }
      `}</style>
    </section>
  )
}
