import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { importLegacyKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import { useHistory } from "react-router-dom"
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
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <>
      <textarea
        className="wrap center_horizontal"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <style jsx>{`
        textarea {
          width: 332px;
          height: 97px;
          border-radius: 4px;
          border: 2px solid var(--green-60);
          padding: 12px 16px;
          box-sizing: border-box;
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

  const dispatch = useBackgroundDispatch()
  const keyringImport = useBackgroundSelector(
    (state) => state.keyrings.importing
  )

  const history = useHistory()

  useEffect(() => {
    if (areKeyringsUnlocked && keyringImport === "done") {
      history.push(nextPage)
    }
  }, [history, areKeyringsUnlocked, keyringImport, nextPage])

  const importWallet = useCallback(async () => {
    dispatch(importLegacyKeyring({ mnemonic: recoveryPhrase }))
  }, [dispatch, recoveryPhrase])

  return areKeyringsUnlocked ? (
    <section className="center_horizontal">
      <div className="back_button_wrap">
        <SharedBackButton />
      </div>
      <div className="portion top">
        <div className="metamask_onboarding_image" />
        <h1 className="serif_header">Import account</h1>
        <div className="info">
          Enter or copy paste the recovery phrase from your Metamask account.
        </div>
        <TextArea value={recoveryPhrase} onChange={setRecoveryPhrase} />
      </div>
      <div className="portion bottom">
        <SharedButton size="medium" type="primary" onClick={importWallet}>
          Import account
        </SharedButton>
        <SharedButton size="small" type="tertiary">
          How do I find the seed?
        </SharedButton>
      </div>
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
