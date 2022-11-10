import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { importKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import { useHistory } from "react-router-dom"
import { isValidMnemonic } from "@ethersproject/hdnode"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import SharedButton from "../../../components/Shared/SharedButton"
import OnboardingDerivationPathSelect from "../../../components/Onboarding/OnboardingDerivationPathSelect"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
} from "../../../hooks"

type Props = {
  nextPage: string
}

export default function ImportSeed(props: Props): ReactElement {
  const { nextPage } = props

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const [recoveryPhrase, setRecoveryPhrase] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [path, setPath] = useState<string>("m/44'/60'/0'/0")
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
      setErrorMessage("Must be a 12 or 24 word recovery phrase")
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
      setErrorMessage("Invalid recovery phrase")
    }
  }, [dispatch, recoveryPhrase, path])

  if (!areKeyringsUnlocked) return <></>

  return (
    <>
      <div className="content">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            importWallet()
          }}
        >
          <div className="portion top">
            <div className="illustration_import" />
            <h1 className="serif_header">Import secret recovery phrase</h1>
            <div className="info">
              Copy paste or write down a 12 or 24 word secret recovery phrase.
            </div>
            <div className="input_wrap">
              <div className="wrapper">
                <div
                  id="recovery_phrase"
                  contentEditable
                  placeholder="test font here"
                  onInput={(e) => {
                    setRecoveryPhrase(e.currentTarget.innerText)
                  }}
                />
                <p>{errorMessage}</p>
              </div>
            </div>
            <SharedButton
              size={
                isEnabled(FeatureFlags.HIDE_IMPORT_DERIVATION_PATH)
                  ? "medium"
                  : "large"
              }
              type="primary"
              isDisabled={!recoveryPhrase}
              onClick={importWallet}
            >
              Import account
            </SharedButton>
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
              Import account
            </SharedButton>
            {!isEnabled(FeatureFlags.HIDE_IMPORT_DERIVATION_PATH) && (
              <button
                className="help_button"
                type="button"
                // TODO External link or information modal?
                onClick={() => {}}
              >
                How do I find the recovery phrase?
              </button>
            )}
          </div>
        </form>
      </div>
      <style jsx>{`
        .content {
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }
        .content {
          animation: fadeIn ease 200ms;
          width: 100%;
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
          margin-top: ${isEnabled(FeatureFlags.HIDE_IMPORT_DERIVATION_PATH)
            ? "35px"
            : "24px"};
          margin-bottom: ${isEnabled(FeatureFlags.HIDE_IMPORT_DERIVATION_PATH)
            ? "24px"
            : "16px"};
        }
        .illustration_import {
          background: url("./images/doggo_import.svg");
          background-size: cover;
          width: 106.5px;
          height: 103.5px;
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
        .input_wrap {
          position: relative;
        }
        .recovery_label {
          position: absolute;
          opacity: 0.5;
        }
        #recovery_phrase {
          margin: 30px auto;
          width: 320px;
          height: 200px;
          border-radius: 4px;
          border: 2px solid var(--green-60);
          padding: 12px 16px;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: white;
          font-family: inherit;
        }
        #recovery_phrase:focus .recovery_label {
          top: 20px;
          opacity: 0;
        }
        #recovery_phrase:focus {
          border: 2px solid var(--trophy-gold);
          outline: 0;
        }
        #recovery_phrase [contenteditable][placeholder]:empty:before {
          content: attr(placeholder);
          position: absolute;
          color: gray;
          background-color: transparent;
        }
      `}</style>
    </>
  )
}
