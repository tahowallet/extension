import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { importLegacyKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import { useHistory } from "react-router-dom"
import { isValidMnemonic } from "@ethersproject/hdnode"
import classNames from "classnames"
import SharedButton from "../../components/Shared/SharedButton"
import SharedBackButton from "../../components/Shared/SharedBackButton"
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
  return (
    <>
      <textarea
        className={classNames("wrap center_horizontal", {
          error: errorMessage,
        })}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      {errorMessage && <div className="error_message">{errorMessage}</div>}
      <style jsx>{`
        textarea {
          width: 332px;
          height: 97px;
          border-radius: 4px;
          border: 2px solid var(--green-60);
          padding: 12px 16px;
          box-sizing: border-box;
        }
        .error,
        .error:focus {
          border-color: var(--error);
        }
        .error_message {
          color: var(--error);
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
          margin-top: 3px;
          align-self: flex-start;
        }
      `}</style>
    </>
  )
}

type Props = {
  nextPage: string
}

export default function OnboardingImportMetamask(props: Props): ReactElement {
  const { nextPage } = props

  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)

  const [recoveryPhrase, setRecoveryPhrase] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
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
    if (isValidMnemonic(recoveryPhrase)) {
      setIsImporting(true)
      dispatch(importLegacyKeyring({ mnemonic: recoveryPhrase.trim() }))
    } else {
      setErrorMessage("Invalid recovery phrase")
    }
  }, [dispatch, recoveryPhrase])

  return areKeyringsUnlocked ? (
    <section className="center_horizontal">
      <div className="back_button_wrap">
        <SharedBackButton />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          importWallet()
        }}
      >
        <div className="portion top">
          <div className="metamask_onboarding_image" />
          <h1 className="serif_header">Import account</h1>
          <div className="info">
            Enter or copy paste the recovery phrase from your MetaMask account.
          </div>
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
        <div className="portion bottom">
          <SharedButton
            size="medium"
            type="primary"
            isDisabled={isImporting}
            onClick={importWallet}
          >
            Import account
          </SharedButton>
        </div>
      </form>
      <style jsx>{`
        section {
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
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
          height: 90px;
          justify-content: space-between;
          flex-direction: column;
          margin-bottom: 24px;
        }
        .metamask_onboarding_image {
          background: url("./images/illustration_import_seed@2x.png");
          background-size: cover;
          width: 205.3px;
          height: 193px;
          margin-top: 27px;
          margin-bottom: 13px;
        }
        .info {
          width: 313px;
          height: 43px;
          color: var(--green-60);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          text-align: center;
          margin-bottom: 32px;
        }
      `}</style>
    </section>
  ) : (
    <></>
  )
}
