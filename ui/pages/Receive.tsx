import React, { ReactElement, useState } from "react"
import { useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"
import { selectCurrentAnyAccount } from "@tallyho/tally-background/redux-slices/selectors"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import QRCode from "react-qr-code"
import { useBackgroundSelector } from "../hooks"
import SharedButton from "../components/Shared/SharedButton"
import SparkReceiveOptions from "../components/Spark/SparkReceiveOptions"

export default function Receive(): ReactElement | null {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const currentAccount = useBackgroundSelector(selectCurrentAnyAccount)
  // What to receive with: the account address by default; networks with
  // other request kinds (e.g. Spark's Lightning invoices) can swap it out.
  const [requestValue, setRequestValue] = useState<string | undefined>()

  if (!currentAccount) return null

  const value = requestValue ?? currentAccount.address

  return (
    <section>
      <h1>
        <span className="icon_activity_send_medium" />
        {t("wallet.receiveAddress")}
      </h1>
      <div className="qr_code">
        <QRCode value={value} size={128} />
      </div>
      {currentAccount.network.family === "SPARK" && (
        <SparkReceiveOptions onRequestChange={setRequestValue} />
      )}
      <div className="copy_wrap">
        <SharedButton
          iconMedium="copy"
          size="medium"
          type="primary"
          onClick={() => {
            navigator.clipboard.writeText(value)
            dispatch(setSnackbarMessage("Copied!"))
          }}
        >
          {`${value.slice(0, 7)}...${value.slice(-6)}`}
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
            color: var(--text-strong);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            display: flex;
            align-items: center;
          }
          .qr_code {
            width: 176px;
            height: 176px;
            border-radius: 16px;
            background-color: var(--text-strong);
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
