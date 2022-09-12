import React, { ReactElement, useCallback, useState } from "react"
import { Redirect } from "react-router-dom"
import { addAddressNetwork } from "@tallyho/tally-background/redux-slices/accounts"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { HexString } from "@tallyho/tally-background/types"
import { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"
import SharedButton from "../../../components/Shared/SharedButton"
import SharedAddressInput from "../../../components/Shared/SharedAddressInput"

export default function ViewOnlyWallet(): ReactElement {
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

  // Redirect to the final onboarding tab once an account is set
  if (redirect) {
    return <Redirect to="/onboarding/done" />
  }

  // TODO remove the "embedded" variable and restyle
  return (
    <>
      <div className="content">
        <h1 className="serif_header">Explore Tally Ho!</h1>
        <div className="subtitle">
          Add an Ethereum address, ENS or UNS name to view an existing wallet in
          Tally Ho.
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
            Explore Tally Ho!
          </SharedButton>
        </form>
      </div>

      <style jsx>
        {`
          .content {
            display: flex;
            flex-direction: column;
            align-items: center;
            animation: fadeIn ease 200ms;
          }
          h1 {
            margin-top: 55px;
            margin-bottom: 15px;
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
    </>
  )
}
