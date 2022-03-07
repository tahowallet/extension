import React, { ReactElement } from "react"
import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"
import { getAccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import {
  rejectDataSignature,
  signData,
  selectSigningData,
  SignDataMessageType,
  EIP4361Data,
} from "@tallyho/tally-background/redux-slices/signing"
import { useHistory } from "react-router-dom"
import { EIP191Info, EIP4361Info } from "../components/SignData"
import SharedButton from "../components/Shared/SharedButton"
import SignTransactionNetworkAccountInfoTopBar from "../components/SignTransaction/SignTransactionNetworkAccountInfoTopBar"
import {
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../hooks"

interface SignDataLocationState {
  internal: boolean
}

const TITLE: Record<SignDataMessageType, string> = {
  [SignDataMessageType.EIP4361]: "Sign in with Ethereum",
  [SignDataMessageType.EIP191]: "Sign Message",
}

export default function PersonalSignData({
  location,
}: {
  location: { state?: SignDataLocationState }
}): ReactElement {
  const dispatch = useBackgroundDispatch()

  const signingDataRequest = useBackgroundSelector(selectSigningData)

  const history = useHistory()

  const { internal } = location.state ?? {
    internal: false,
  }

  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof signingDataRequest !== "undefined") {
      return getAccountTotal(state, signingDataRequest.account)
    }
    return undefined
  })

  if (
    !areKeyringsUnlocked ||
    typeof signingDataRequest === "undefined" ||
    typeof signerAccountTotal === "undefined"
  ) {
    return <></>
  }

  const handleConfirm = () => {
    if (signingDataRequest !== undefined) {
      dispatch(signData(signingDataRequest))
    }
  }

  const handleReject = async () => {
    dispatch(rejectDataSignature())
    history.goBack()
  }

  return (
    <section>
      <SignTransactionNetworkAccountInfoTopBar
        accountTotal={signerAccountTotal}
      />
      <h1 className="serif_header title">
        {TITLE[signingDataRequest.messageType]}
      </h1>
      <div className="primary_info_card standard_width">
        <div className="sign_block">
          <div className="container">
            {(() => {
              switch (signingDataRequest.messageType) {
                case SignDataMessageType.EIP4361:
                  return (
                    <EIP4361Info
                      signingData={
                        signingDataRequest.signingData as EIP4361Data
                      }
                    />
                  )
                case SignDataMessageType.EIP191:
                default:
                  return (
                    <EIP191Info
                      account={signingDataRequest.account}
                      internal={internal}
                      signingData={signingDataRequest.signingData}
                    />
                  )
              }
            })()}
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
        {signerAccountTotal?.accountType === AccountType.Imported ? (
          <SharedButton
            type="primary"
            iconSize="large"
            size="large"
            onClick={handleConfirm}
            showLoadingOnClick
          >
            Sign
          </SharedButton>
        ) : (
          <span className="no-signing">Read-only accounts cannot sign</span>
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
          .container {
            display: flex;
            margin: 20px 16px;
            flex-direction: column;
            align-items: center;
            font-size: 16px;
            line-height: 24px;
          }
        `}
      </style>
    </section>
  )
}
