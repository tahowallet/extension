import React, { ReactElement, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { unlockKeyrings } from "@tallyho/tally-background/redux-slices/keyrings"
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import titleStyle from "../Onboarding/titleStyle"

export default function KeyringUnlock(): ReactElement {
  const [password, setPassword] = useState("")
  const history = useHistory()

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (areKeyringsUnlocked) {
      history.goBack()
    }
  }, [history, areKeyringsUnlocked])

  const dispatchUnlockWallet = (): void => {
    dispatch(unlockKeyrings(password))
  }

  return (
    <section>
      <div className="full_logo" />
      <h1 className="serif_header">Unlock Your Wallet</h1>
      <div className="subtitle">The decentralized web awaits.</div>
      <div className="input_wrap">
        <SharedInput
          type="password"
          placeholder="Password"
          onChange={setPassword}
        />
      </div>
      <SharedButton type="primary" size="large" onClick={dispatchUnlockWallet}>
        Unlock and Continue
      </SharedButton>
      <style jsx>
        {`
          ${titleStyle}
          .full_logo {
            background: url("./images/full_logo@2x.png");
            background-size: cover;
            width: 118px;
            height: 120px;
            margin-bottom: 17px;
          }
          .input_wrap {
            width: 211px;
          }
        `}
      </style>
    </section>
  )
}
