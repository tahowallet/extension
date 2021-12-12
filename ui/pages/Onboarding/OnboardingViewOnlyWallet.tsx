import React, { ReactElement, useCallback, useState } from "react"
import { Redirect } from "react-router-dom"
import { isAddress } from "@ethersproject/address"
import { addAddressNetwork } from "@tallyho/tally-background/redux-slices/accounts"
import { getEthereumNetwork } from "@tallyho/tally-background/lib/utils"
import { setCurrentAccount } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch } from "../../hooks"
import SharedInput from "../../components/Shared/SharedInput"
import SharedButton from "../../components/Shared/SharedButton"
import BackButton from "../../components/Shared/SharedBackButton"

export default function OnboardingViewOnlyWallet(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const [address, setAddress] = useState("")
  const [redirect, setRedirect] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmitViewOnlyAddress = useCallback(async () => {
    if (isAddress(address)) {
      await dispatch(
        addAddressNetwork({
          address,
          network: getEthereumNetwork(),
        })
      )
      dispatch(setCurrentAccount(address))
      setRedirect(true)
    } else {
      setErrorMessage("Please enter a valid address")
    }
  }, [dispatch, address])

  // Redirect to the home tab once an account is set
  if (redirect) {
    return <Redirect to="/" />
  }

  const handleInputChange = (value: string): void => {
    setAddress(value)
    // Clear error message on input change
    setErrorMessage("")
  }

  return (
    <section>
      <div className="wordmark" />
      <div className="back_button_wrap">
        <BackButton />
      </div>
      <h1 className="serif_header">Explore Tally</h1>
      <div className="subtitle">
        Add an Ethereum address to view an existing wallet in Tally.
      </div>
      <div className="input_wrap">
        <SharedInput
          placeholder="ETH address"
          onChange={handleInputChange}
          errorMessage={errorMessage}
        />
      </div>
      <SharedButton
        type="primary"
        size="large"
        onClick={handleSubmitViewOnlyAddress}
        showLoadingOnClick={!!errorMessage}
      >
        Explore Tally
      </SharedButton>
      <style jsx>
        {`
          .wordmark {
            background: url("./images/wordmark@2x.png");
            background-size: cover;
            width: 52px;
            height: 25px;
          }
          .back_button_wrap {
            position: fixed;
            top: 25px;
          }
          h1 {
            margin-top: 55px;
            margin-bottom: 15px;
          }
          section {
            padding-top: 25px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .subtitle {
            color: var(--green-60);
            width: 307px;
            text-align: center;
            line-height: 24px;
            margin-bottom: 40px;
          }
          .input_wrap {
            width: 320px;
            margin-bottom: 24px;
          }
        `}
      </style>
    </section>
  )
}
