import React, { useState } from "react"
import PropTypes from "prop-types"
import { Link } from "react-chrome-extension-router"
import { registerRoute } from "../config/routes"
import SharedButton from "../components/Shared/SharedButton"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import SignTransactionSwapAssetBlock from "../components/SignTransaction/SignTransactionSwapAssetBlock"
import SignTransactionApproveSpendAssetBlock from "../components/SignTransaction/SignTransactionApproveSpendAssetBlock"
import SignTransactionNetworkAccountInfoTopBar from "../components/SignTransaction/SignTransactionNetworkAccountInfoTopBar"
import Wallet from "./Wallet"

export default function SignTransaction(props) {
  const { approveSpendOrSwap } = props
  const [panelNum, setPanelNum] = useState(0)

  const spendOrSwapContent = {
    swap: {
      title: "Swap assets",
      component: () => <SignTransactionSwapAssetBlock />,
    },
    spend: {
      title: "Approve asset spend",
      component: () => <SignTransactionApproveSpendAssetBlock />,
    },
  }

  return (
    <section>
      <SignTransactionNetworkAccountInfoTopBar />
      <h1 className="serif_header title">
        {spendOrSwapContent[approveSpendOrSwap].title}
      </h1>
      <div className="primary_info_card standard_width">
        {spendOrSwapContent[approveSpendOrSwap].component()}
      </div>
      <SharedPanelSwitcher
        setPanelNum={setPanelNum}
        panelNum={panelNum}
        panelNames={["Details", "Advanced"]}
      />
      {panelNum === 0 ? (
        <div className="detail_items_wrap standard_width_padded">
          <span className="detail_item">
            Network Fee/Speed
            <span className="detail_item_right">{"$24 / <1min"}</span>
          </span>
        </div>
      ) : null}
      <div className="footer_actions">
        <Link component={Wallet}>
          <SharedButton
            label="Reject"
            iconSize="large"
            size="large"
            type="secondary"
          />
        </Link>
        <SharedButton
          label="Confirm"
          type="primary"
          iconSize="large"
          size="large"
        />
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

SignTransaction.propTypes = {
  approveSpendOrSwap: PropTypes.oneOf(["swap", "spend"]),
}

SignTransaction.defaultProps = {
  approveSpendOrSwap: "spend",
}

registerRoute("signTransaction", SignTransaction)
