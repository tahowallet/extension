import React, { ReactElement } from "react"
import { useDispatch } from "react-redux"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import QRCode from "react-qr-code"
import { useBackgroundSelector } from "../hooks"
import SharedButton from "../components/Shared/SharedButton"

export default function Receive(): ReactElement {
  const dispatch = useDispatch()

  const currentAccount: { address: string } =
    useBackgroundSelector(selectCurrentAccount)
  if (!currentAccount) return <></>

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
        <QRCode value={currentAccount.address} size={128} />
      </div>
      <div className="copy_wrap">
        <SharedButton
          icon="copy"
          size="medium"
          iconSize="large"
          type="primary"
          onClick={() => {
            navigator.clipboard.writeText(currentAccount.address)
            dispatch(setSnackbarMessage("Copied!"))
          }}
        >
          {`${currentAccount.address.slice(
            0,
            7
          )}...${currentAccount.address.slice(-6)}`}
        </SharedButton>
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
