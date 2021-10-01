import React, { ReactElement } from "react"
import CorePage from "../components/Core/CorePage"
import SharedAssetIcon from "../components/Shared/SharedAssetIcon"
import SharedButton from "../components/Shared/SharedButton"
import WalletActivityList from "../components/Wallet/WalletActivityList"
import BackButton from "../components/Shared/SharedBackButton"

const activityStub = [
  {
    blockHash:
      "0xfa43112afad414ad898d986d4e52bcacb026d11b410206913bba58966f1ddd62",
    blockNumber: "0x891820",
    from: "0x32d44db61df0b10ccf0164df3d9cbee72e3df02c",
    gas: "0x5208",
    gasPrice: "0x3b9aca00",
    hash: "0xa36d7ccf14d7f1d5480632cccb843683f62a03e8a36a51ac554cc3819b9b35e8",
    timeStamp: "0x60fa2a18",
    to: "0xd56e7d68ebf4bd2dfd4b16c9b57e4fa63bc1a3c2",
    value: "0.01",
  },
  {
    blockHash:
      "0xfa43112afad414ad898d986d4e52bcacb026d11b410206913bba58966f1ddd62",
    blockNumber: "0x891820",
    from: "0x32d44db61df0b10ccf0164df3d9cbee72e3df02c",
    gas: "0x5208",
    gasPrice: "0x3b9aca00",
    hash: "0xa36d7ccf14d7f1d5480632cccb843683f62a03e8a36a51ac554cc3819b9b35e8",
    timeStamp: "0x60fa2a18",
    to: "0xd56e7d68ebf4bd2dfd4b16c9b57e4fa63bc1a3c2",
    value: "0.01",
  },
  {
    blockHash:
      "0xfa43112afad414ad898d986d4e52bcacb026d11b410206913bba58966f1ddd62",
    blockNumber: "0x891820",
    from: "0x32d44db61df0b10ccf0164df3d9cbee72e3df02c",
    gas: "0x5208",
    gasPrice: "0x3b9aca00",
    hash: "0xa36d7ccf14d7f1d5480632cccb843683f62a03e8a36a51ac554cc3819b9b35e8",
    timeStamp: "0x60fa2a18",
    to: "0xd56e7d68ebf4bd2dfd4b16c9b57e4fa63bc1a3c2",
    value: "0.01",
  },
  {
    blockHash:
      "0xfa43112afad414ad898d986d4e52bcacb026d11b410206913bba58966f1ddd62",
    blockNumber: "0x891820",
    from: "0x32d44db61df0b10ccf0164df3d9cbee72e3df02c",
    gas: "0x5208",
    gasPrice: "0x3b9aca00",
    hash: "0xa36d7ccf14d7f1d5480632cccb843683f62a03e8a36a51ac554cc3819b9b35e8",
    timeStamp: "0x60fa2a18",
    to: "0xd56e7d68ebf4bd2dfd4b16c9b57e4fa63bc1a3c2",
    value: "0.01",
  },
  {
    blockHash:
      "0xfa43112afad414ad898d986d4e52bcacb026d11b410206913bba58966f1ddd62",
    blockNumber: "0x891820",
    from: "0x32d44db61df0b10ccf0164df3d9cbee72e3df02c",
    gas: "0x5208",
    gasPrice: "0x3b9aca00",
    hash: "0xa36d7ccf14d7f1d5480632cccb843683f62a03e8a36a51ac554cc3819b9b35e8",
    timeStamp: "0x60fa2a18",
    to: "0xd56e7d68ebf4bd2dfd4b16c9b57e4fa63bc1a3c2",
    value: "0.01",
  },
]

export default function SingleAsset(): ReactElement {
  return (
    <>
      <CorePage>
        <BackButton />
        <div className="header standard_width_padded">
          <div className="left">
            <div className="asset_wrap">
              <SharedAssetIcon />
              <span className="asset_name">KEEP</span>
            </div>
            <div className="balance">125,137.00</div>
            <div className="usd_value">($127,237,318)</div>
          </div>
          <div className="right">
            <SharedButton type="primary" size="medium" icon="send">
              Send
            </SharedButton>
            <SharedButton type="primary" size="medium" icon="swap">
              Swap
            </SharedButton>
          </div>
        </div>
        <div className="sub_info_seperator_wrap standard_width_padded">
          <div className="left">Asset is on: Arbitrum</div>
          <div className="right">Move to Ethereum</div>
        </div>
        <div className="label_light standard_width_padded">Activity</div>
        <WalletActivityList activity={activityStub} />
      </CorePage>
      <style jsx>
        {`
          .sub_info_seperator_wrap {
            display: flex;
            border: 1px solid var(--green-120);
            border-left: 0px;
            border-right: 0px;
            padding-top: 8px;
            padding-bottom: 8px;
            box-sizing: border-box;
            color: var(--green-60);
            font-size: 14px;
            line-height: 16px;
            justify-content: space-between;
            margin-top: 23px;
            margin-bottom: 16px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header .right {
            height: 95px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .asset_name {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            text-transform: uppercase;
            margin-left: 8px;
          }
          .asset_wrap {
            display: flex;
            align-items: center;
          }
          .balance {
            color: #fff;
            font-size: 36px;
            font-weight: 500;
            line-height: 48px;
          }
          .usd_value {
            width: 112px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 600;
            line-height: 24px;
            text-align: center;
          }
          .label_light {
            color: var(--green-40);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-bottom: 8px;
          }
        `}
      </style>
    </>
  )
}
