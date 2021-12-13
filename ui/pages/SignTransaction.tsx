import React, { ReactElement, useState } from "react"
import { useHistory, useLocation } from "react-router-dom"
import {
  selectIsTransactionLoaded,
  selectIsTransactionSigned,
  selectTransactionData,
  signTransaction,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import SharedButton from "../components/Shared/SharedButton"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import SignTransactionSwapAssetBlock from "../components/SignTransaction/SignTransactionSwapAssetBlock"
import SignTransactionApproveSpendAssetBlock from "../components/SignTransaction/SignTransactionApproveSpendAssetBlock"
import SignTransactionSignBlock from "../components/SignTransaction/SignTransactionSignBlock"
import SignTransactionNetworkAccountInfoTopBar from "../components/SignTransaction/SignTransactionNetworkAccountInfoTopBar"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
} from "../hooks"
import FeeSettingsButton from "../components/NetworkFees/FeeSettingsButton"

enum SignType {
  Sign = "sign",
  SignSwap = "sign-swap",
  SignSpend = "sign-spend",
}

interface SignLocationState {
  assetSymbol: string
  amount: number
  signType: SignType
}

export default function SignTransaction(): ReactElement {
  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)
  const [feeSelectModalOpen, setFeeSelectModalOpen] = useState(false)

  const history = useHistory()
  const dispatch = useBackgroundDispatch()
  const location = useLocation<SignLocationState>()
  const { assetSymbol, amount, signType } = location.state
  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded
  )

  // TODO the below should return a promise that resolves once tx is signed
  const isTransactionSigned = useBackgroundSelector(selectIsTransactionSigned)
  const txDetails = useBackgroundSelector(selectTransactionData)

  const [panelNumber, setPanelNumber] = useState(0)

  const openSelectFeeModal = () => {
    setFeeSelectModalOpen(true)
  }
  const closeSelectFeeModal = () => {
    setFeeSelectModalOpen(false)
  }

  if (!areKeyringsUnlocked) {
    return <></>
  }

  const signContent: {
    [signType in SignType]: {
      title: string
      component: () => ReactElement
      confirmButtonText: string
    }
  } = {
    [SignType.SignSwap]: {
      title: "Swap assets",
      component: () => <SignTransactionSwapAssetBlock />,
      confirmButtonText: "Confirm",
    },
    [SignType.SignSpend]: {
      title: "Approve asset spend",
      component: () => <SignTransactionApproveSpendAssetBlock />,
      confirmButtonText: "Approve",
    },
    [SignType.Sign]: {
      title: "Sign Transaction",
      component: () => (
        <SignTransactionSignBlock token={assetSymbol} amount={amount} />
      ),
      confirmButtonText: "Sign",
    },
  }

  const handleConfirm = async () => {
    if (SignType.Sign === signType && isTransactionDataReady && txDetails) {
      dispatch(signTransaction(txDetails))
      await isTransactionSigned
      history.push("/")
    }
  }

  return (
    <section>
      <SignTransactionNetworkAccountInfoTopBar />
      <h1 className="serif_header title">{signContent[signType].title}</h1>
      <div className="primary_info_card standard_width">
        {signContent[signType].component()}
      </div>
      <SharedPanelSwitcher
        setPanelNumber={setPanelNumber}
        panelNumber={panelNumber}
        panelNames={["Details", "Advanced"]}
      />
      {panelNumber === 0 ? (
        <div className="detail_items_wrap standard_width_padded">
          <span className="detail_item">
            Estimated network fee
            <FeeSettingsButton
              openModal={openSelectFeeModal}
              closeModal={closeSelectFeeModal}
              open={feeSelectModalOpen}
            />
          </span>
        </div>
      ) : null}
      <div className="footer_actions">
        <SharedButton
          iconSize="large"
          size="large"
          type="secondary"
          onClick={() => history.goBack()}
        >
          Reject
        </SharedButton>
        <SharedButton
          type="primary"
          iconSize="large"
          size="large"
          onClick={handleConfirm}
          showLoadingOnClick
        >
          {signContent[signType].confirmButtonText}
        </SharedButton>
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
          .detail_item {
            width: 100%;
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .detail_items_wrap {
            display: flex;
            margin-top: 21px;
          }
          .detail_item_right {
            color: var(--green-20);
            font-size: 16px;
          }
        `}
      </style>
    </section>
  )
}
