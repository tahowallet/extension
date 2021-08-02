import React from "react"
import QRCode from "react-qr-code"
import { useSelector } from "react-redux"
import { accountSelector } from "../slices/account"
import SharedButton from "../components/Shared/SharedButton"

export default function Receive() {
  const { account } = useSelector(accountSelector)
  if (!account?.address) return false

  return (
    <section>
      <h1>
        <span className="icon_activity_send_medium" />
        Receive address
      </h1>
      <div className="sub_title">
        Only send Ethereum Mainnet compatible assets to this address.
      </div>
      <div className="qr_code">
        <QRCode value={account?.address} size={128} />
      </div>
      <div className="copy_wrap">
        <SharedButton
          label={`${account?.address.slice(0, 7)}...${account?.address.slice(
            35,
            41
          )}`}
          icon="copy"
          size="medium"
          iconSize="large"
          type="primary"
        />
      </div>
      <style jsx>
        {`
          section {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }
          .receive_wrap {
            display: flex;
            align-items: center;
            flex-direction: column;
            margin-top: 24px;
          }
          h1 {
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            display: flex;
            align-items: center;
          }
          .sub_title {
            margin-top: 18px;
            width: 281px;
            height: 33px;
            color: var(--green-20);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-align: center;
          }
          .qr_code {
            width: 176px;
            height: 176px;
            border-radius: 16px;
            background-color: #ffffff;
            margin-top: 31px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .copy_wrap {
            width: 215px;
            margin-top: 40px;
          }
          .icon_activity_send_medium {
            background: url("./images/activity_receive_medium@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
        `}
      </style>
    </section>
  )
}
