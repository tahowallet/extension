import React, { ReactElement, useCallback, useState } from "react"
import { Redirect } from "react-router-dom"
import { addAddressNetwork } from "@tallyho/tally-background/redux-slices/accounts"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { HexString } from "@tallyho/tally-background/types"
import { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../../components/Shared/SharedButton"
import SharedBackButton from "../../components/Shared/SharedBackButton"
import SharedAddressInput from "../../components/Shared/SharedAddressInput"

export default function OnboardingViewOnlyWallet({
  embedded = false,
}: {
  embedded: boolean
}): ReactElement {
  const dispatch = useBackgroundDispatch()
  const [redirect, setRedirect] = useState(false)
  const [addressOnNetwork, setAddressOnNetwork] = useState<
    AddressOnNetwork | undefined
  >(undefined)

  const { network } = useBackgroundSelector(selectCurrentAccount)

  const handleNewAddress = useCallback(
    (value: { address: HexString; name?: string } | undefined) => {
      if (value === undefined) {
        setAddressOnNetwork(undefined)
      } else {
        setAddressOnNetwork({
          address: value.address,
          network,
        })
      }
    },
    [network]
  )

  const handleSubmitViewOnlyAddress = useCallback(async () => {
    if (addressOnNetwork === undefined) {
      return
    }

    await dispatch(addAddressNetwork(addressOnNetwork))
    dispatch(setNewSelectedAccount(addressOnNetwork))
    setRedirect(true)
  }, [dispatch, addressOnNetwork])

  // Redirect to the home tab once an account is set
  if (redirect) {
    return <Redirect to="/" />
  }

  return (
    <section className="start_wrap">
      <div className="top standard_width">
        <SharedBackButton />
        {!embedded && <div className="wordmark" />}
      </div>
      <div className="content">
        <h1 className="serif_header">Explore Taho</h1>
        <div className="subtitle">
          Add an Ethereum address, ENS or UNS name to view an existing wallet in
          Taho.
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmitViewOnlyAddress()
          }}
        >
          <div className="input_wrap">
            <SharedAddressInput onAddressChange={handleNewAddress} />
          </div>
          <SharedButton
            type="primary"
            size="large"
            onClick={handleSubmitViewOnlyAddress}
            isDisabled={addressOnNetwork === undefined}
            showLoadingOnClick
            isFormSubmit
          >
            Explore Taho
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
            background: url("./images/wordmark.svg");
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            width: 95px;
            height: 25px;
            position: absolute;
            left: 0px;
            right: 0px;
            margin: 0 auto;
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
            ${embedded ? "" : `background-color: var(--hunter-green);`}
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
