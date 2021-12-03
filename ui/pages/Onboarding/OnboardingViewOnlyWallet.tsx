import React, { ReactElement, useCallback, useState } from "react"
import { Redirect } from "react-router-dom"
import { addAddressNetwork } from "@tallyho/tally-background/redux-slices/accounts"
import { getEthereumNetwork } from "@tallyho/tally-background/lib/utils"
import { useBackgroundDispatch } from "../../hooks"
import SharedInput from "../../components/Shared/SharedInput"
import SharedButton from "../../components/Shared/SharedButton"
import BackButton from "../../components/Shared/SharedBackButton"

export default function OnboardingViewOnlyWallet(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const [address, setAddress] = useState("")
  const [redirect, setRedirect] = useState(false)

  // Quick temp solution grabbed from
  // https://ethereum.stackexchange.com/a/40670
  function checkIfPlausibleETHAddress(checkAddress: string) {
    return /^(0x){1}[0-9a-fA-F]{40}$/i.test(checkAddress)
  }

  const handleSubmitViewOnlyAddress = useCallback(async () => {
    if (checkIfPlausibleETHAddress(address)) {
      await dispatch(
        addAddressNetwork({
          address,
          network: getEthereumNetwork(),
        })
      )
      setRedirect(true)
    } else {
      alert("Please enter a valid address")
    }
  }, [dispatch, address])

  // Redirect to the home tab once an account is set
  if (redirect) {
    return <Redirect to="/" />
  }

  return (
    <section>
      <div className="wordmark" />
      <BackButton />
      <h1 className="serif_header">Explore Tally</h1>
      <div className="subtitle">
        Add an Ethereum address to view an existing wallet in Tally.
      </div>
      <div className="input_wrap">
        <SharedInput placeholder="ETH address" onChange={setAddress} />
      </div>
      <SharedButton
        type="primary"
        size="large"
        onClick={handleSubmitViewOnlyAddress}
        showLoadingOnClick
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
