import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"
import {
  getAccountTotal,
  selectAddressSigningMethods,
  selectCurrentAccountSigningMethod,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  rejectDataSignature,
  selectTypedData,
  signTypedData,
} from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import SharedButton from "../components/Shared/SharedButton"
import SignTransactionNetworkAccountInfoTopBar from "../components/SignTransaction/SignTransactionNetworkAccountInfoTopBar"
import {
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../hooks"
import capitalize from "../utils/capitalize"

export enum SignDataType {
  TypedData = "sign-typed-data",
}

interface SignDataLocationState {
  internal: boolean
}

export default function SignData({
  location,
}: {
  location: { state?: SignDataLocationState }
}): ReactElement {
  const dispatch = useBackgroundDispatch()
  const typedDataRequest = useBackgroundSelector(selectTypedData)

  const history = useHistory()

  const { internal } = location.state ?? {
    internal: false,
  }

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof typedDataRequest !== "undefined") {
      return getAccountTotal(state, typedDataRequest.account)
    }
    return undefined
  })

  const redirect = signerAccountTotal?.accountType === AccountType.Imported
  const areKeyringsUnlocked = useAreKeyringsUnlocked(redirect)

  const currentAddressSigner = useBackgroundSelector(
    selectCurrentAccountSigningMethod
  )

  if (
    (signerAccountTotal?.accountType === AccountType.Imported &&
      !areKeyringsUnlocked) ||
    typeof typedDataRequest === "undefined" ||
    typeof signerAccountTotal === "undefined"
  ) {
    return <></>
  }

  const { domain, message, primaryType } = typedDataRequest.typedData

  const keys = Object.keys(message)

  const handleConfirm = () => {
    if (typedDataRequest !== undefined) {
      if (currentAddressSigner) {
        typedDataRequest.signingMethod = currentAddressSigner
        dispatch(signTypedData(typedDataRequest))
      }
    }
  }

  const handleReject = async () => {
    await dispatch(rejectDataSignature())
    history.goBack()
  }
  return (
    <section>
      <SignTransactionNetworkAccountInfoTopBar
        accountTotal={signerAccountTotal}
      />
      <h1 className="serif_header title">{`Sign ${
        primaryType ?? "Message"
      }`}</h1>
      <div className="primary_info_card standard_width">
        <div className="sign_block">
          <div className="container">
            <div className="label header">
              {internal
                ? "Your signature is required"
                : "A dapp is requesting your signature"}
            </div>
            <div className="divider" />
            <div className="divider" />
            {keys.length > 2 ? (
              <div className="messages">
                {keys.map((key) => (
                  <div key={key} className="message">
                    <div className="key">{capitalize(key)}</div>
                    <div className="value light">{`${message[key]}`}</div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {keys.map((key) => (
                  <div className="single_message">
                    <div className="key">{capitalize(key)}</div>
                    <div className="light">{`${message[key]}`}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="footer_actions">
        <SharedButton
          iconSize="large"
          size="large"
          type="secondary"
          onClick={handleReject}
        >
          Reject
        </SharedButton>
        {signerAccountTotal.accountType === AccountType.ReadOnly ? (
          <span className="no-signing">Read-only accounts cannot sign</span>
        ) : (
          <SharedButton
            type="primary"
            iconSize="large"
            size="large"
            onClick={handleConfirm}
            showLoadingOnClick
          >
            Sign
          </SharedButton>
        )}
      </div>
      <style jsx>
        {`
          section {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: var(--green-95);
            z-index: 5;
          }
          .title {
            color: var(--trophy-gold);
            font-size: 36px;
            font-weight: 500;
            line-height: 42px;
            text-align: center;
          }
          .primary_info_card {
            display: block;
            height: fit-content;
            border-radius: 16px;
            background-color: var(--hunter-green);
            margin: 16px 0px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .footer_actions {
            position: fixed;
            bottom: 0px;
            display: flex;
            width: 100%;
            padding: 0px 16px;
            box-sizing: border-box;
            align-items: center;
            height: 80px;
            justify-content: space-between;
            box-shadow: 0 0 5px rgba(0, 20, 19, 0.5);
            background-color: var(--green-95);
          }
          .sign_block {
            display: flex;
            width: 100%;
            flex-direction: column;
            justify-content: space-between;
          }
          .label {
            color: var(--green-40);
          }
          .header {
            padding: 16px 0;
          }
          .messages {
            display: flex;
            flex-flow: column;
            width: 100%;
            padding-top: 16px;
          }
          .message {
            display: flex;
            justify-content: space-between;
            padding: 6px 16px;
          }
          .value {
            overflow-wrap: anywhere;
            max-width: 220px;
            text-align: right;
          }
          .light {
            color: #ccd3d3;
          }
          .key {
            color: var(--green-40);
          }
          .divider {
            width: 80%;
            height: 2px;
            opacity: 60%;
            background-color: var(--green-120);
          }
          .single_message {
            display: flex;
            flex-direction: column;
            gap: 24px;
            text-align: left;
            padding: 16px;
            width: 80%;
          }
          .divider {
            width: 80%;
            height: 2px;
            opacity: 60%;
            background-color: var(--green-120);
          }
          .container {
            display: flex;
            margin: 20px 0;
            flex-direction: column;
            align-items: center;
          }
        `}
      </style>
    </section>
  )
}
