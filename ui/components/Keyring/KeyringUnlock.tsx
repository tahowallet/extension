import React, { ReactElement, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { unlockKeyrings } from "@tallyho/tally-background/redux-slices/keyrings"
import { rejectTransactionSignature } from "@tallyho/tally-background/redux-slices/transaction-construction"
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import titleStyle from "../Onboarding/titleStyle"

export default function KeyringUnlock(): ReactElement {
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const history: {
    entries?: { pathname: string }[]
    goBack: () => void
  } = useHistory()

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (areKeyringsUnlocked) {
      history.goBack()
    }
  }, [history, areKeyringsUnlocked])

  const dispatchUnlockWallet = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    await dispatch(unlockKeyrings(password))
    // If keyring was unable to unlock, display error message
    setErrorMessage("Incorrect password")
  }

  const handleReject = async () => {
    await dispatch(rejectTransactionSignature())
  }

  // TODO: replace this
  const isPopup =
    history?.entries &&
    history.entries[0]?.pathname === "/" &&
    history.entries[1]?.pathname === "/keyring/unlock"

  return (
    <section>
      {isPopup ? (
        <div className="back_button_wrap">
          <SharedButton
            type="tertiaryWhite"
            size="small"
            onClick={handleReject}
          >
            Cancel tx
          </SharedButton>
        </div>
      ) : (
        <div className="spacer" />
      )}
      <div className="illustration_unlock" />
      <h1 className="serif_header">Unlock Your Wallet</h1>
      <div className="subtitle">
        You locked your signing permissions or the session has timed out. In
        order to continue, please unlock your wallet
      </div>
      <form onSubmit={dispatchUnlockWallet}>
        <div className="input_wrap">
          <SharedInput
            type="password"
            placeholder="Password"
            onChange={(value) => {
              setPassword(value)
              // Clear error message on input change
              setErrorMessage("")
            }}
            errorMessage={errorMessage}
          />
        </div>
        <SharedButton type="primary" size="large" isFormSubmit>
          Unlock
        </SharedButton>
      </form>
      <style jsx>
        {`
          ${titleStyle}
          .illustration_unlock {
            background: url("./images/illustration_unlock@2x.png");
            background-size: cover;
            width: 227.86px;
            height: 214.21px;
            margin-bottom: 17px;
          }
          .input_wrap {
            width: 211px;
            margin-bottom: 30px;
          }
          .subtitle {
            width: 321px;
            text-align: center;
          }
          .back_button_wrap {
            margin-top: -50px;
            width: 100%;
            display: flex;
            justify-content: flex-end;
            margin-bottom: -5px;
            opacity: 0.7;
          }
          .spacer {
            margin-top: 42px;
          }
        `}
      </style>
      <style jsx global>
        {`
          body {
            height: 100%;
          }
        `}
      </style>
    </section>
  )
}
