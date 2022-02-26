import React, { ReactElement, useCallback, useState } from "react"
import { Redirect } from "react-router-dom"
import { isAddress } from "@ethersproject/address"
import {
  addAddressNetwork,
  addAccountByName,
} from "@tallyho/tally-background/redux-slices/accounts"
import { ETHEREUM } from "@tallyho/tally-background/constants/networks"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch } from "../../hooks"
import SharedInput from "../../components/Shared/SharedInput"
import SharedButton from "../../components/Shared/SharedButton"
import SharedBackButton from "../../components/Shared/SharedBackButton"

export default function OnboardingViewOnlyWallet(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const [address, setAddress] = useState("")
  const [redirect, setRedirect] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmitViewOnlyAddress = useCallback(async () => {
    const trimmedAddress = address.trim()
    if (trimmedAddress.endsWith(".eth")) {
      const nameNetwork = {
        name: trimmedAddress,
        network: ETHEREUM,
      }
      await dispatch(addAccountByName(nameNetwork))
      setRedirect(true)
    } else if (isAddress(trimmedAddress)) {
      const addressNetwork = {
        address: trimmedAddress,
        network: ETHEREUM,
      }
      await dispatch(addAddressNetwork(addressNetwork))
      dispatch(setNewSelectedAccount(addressNetwork))
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
    <section className="standard_width">
      <div className="top">
        <SharedBackButton />
        <div className="wordmark" />
      </div>
      <div className="content">
        <h1 className="serif_header">Explore Tally</h1>
        <div className="subtitle">
          Add an Ethereum address or ENS name to view an existing wallet in
          Tally.
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmitViewOnlyAddress()
          }}
        >
          <div className="input_wrap">
            <SharedInput
              label="ETH address or ENS name"
              onChange={handleInputChange}
              errorMessage={errorMessage}
            />
          </div>
          <SharedButton
            type="primary"
            size="large"
            onClick={handleSubmitViewOnlyAddress}
            showLoadingOnClick={!!errorMessage}
            isFormSubmit
          >
            Explore Tally
          </SharedButton>
        </form>
      </div>

      <style jsx>
        {`
          .top {
            display: flex;
            width: 100%;
          }
          .wordmark {
            background: url("./images/wordmark@2x.png");
            background-size: cover;
            width: 52px;
            height: 25px;
            position: absolute;
            left: 0px;
            right: 0px;
            margin: 0 auto;
          }
          section {
            background-color: var(--hunter-green);
          }
          .content {
            display: flex;
            flex-direction: column;
            align-items: center;
            animation: fadeIn ease 200ms;
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
