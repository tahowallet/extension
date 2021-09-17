import React, { ReactElement, useCallback, useState } from "react"
import { importLegacyKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import { useBackgroundDispatch } from "../../hooks"
import SharedButton from "../Shared/SharedButton"

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
          height: 167px;
          border-radius: 4px;
          border: 2px solid var(--green-60);
          padding: 12px 16px;
          box-sizing: border-box;
        }
      `}</style>
    </>
  )
}

export default function OnboardingImportMetamask(): ReactElement {
  const [recoveryPhrase, setRecoveryPhrase] = useState(
    // Don't store real money in this plz.
    "brain surround have swap horror body response double fire dumb bring hazard"
  )

  const dispatch = useBackgroundDispatch()

  const importWallet = useCallback(() => {
    dispatch(importLegacyKeyring({ mnemonic: recoveryPhrase }))
  }, [dispatch, recoveryPhrase])

  return (
    <section className="center_horizontal">
      <div className="portion top">
        <div className="metamask_onboarding_image" />
        <h1 className="serif_header">Metamask import</h1>
        <div className="info">
          Enter or copy paste the recovery phrase from your Metamask account.
        </div>
        <TextArea value={recoveryPhrase} onChange={setRecoveryPhrase} />
      </div>
      <div className="portion bottom">
        <SharedButton size="medium" type="primary" onClick={importWallet}>
          Import wallet
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
        h1 {
          margin: unset;
        }
        .portion {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bottom {
          height: 80px;
        }
        .metamask_onboarding_image {
          background: url("./images/onboarding_metamask@2x.png");
          background-size: cover;
          width: 284px;
          height: 112px;
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
  )
}
