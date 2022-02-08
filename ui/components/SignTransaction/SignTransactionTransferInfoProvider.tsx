import {
  truncateAddress,
  truncateDecimalAmount,
} from "@tallyho/tally-background/lib/utils"
import React, { ReactElement } from "react"
import TransactionDetailAddressValue from "../TransactionDetail/TransactionDetailAddressValue"
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../TransactionDetail/TransactionDetailItem"
import SignTransactionBaseInfoProvider, {
  SignTransactionInfoProviderProps,
} from "./SignTransactionInfoBaseProvider"

export default function SignTransactionTransferInfoProvider({
  token,
  amount,
  destination,
  localizedValue,
  inner,
}: SignTransactionInfoProviderProps & {
  token: string
  amount: number
  destination: string
  localizedValue: string | number
}): ReactElement {
  return (
    <SignTransactionBaseInfoProvider
      title="Sign Transfer"
      confirmButtonLabel="Sign"
      infoBlock={
        <div className="sign_block">
          <div className="container">
            <div className="label">Send to</div>
            <div className="send_to">{truncateAddress(destination)}</div>
          </div>
          <div className="divider" />
          <div className="container">
            <span className="label">Spend Amount</span>
            <span className="spend_amount">
              {truncateDecimalAmount(amount, 4)} {token}
            </span>
            <span className="label">{`$${localizedValue}`}</span>
          </div>

          <style jsx>
            {`
              .sign_block {
                display: flex;
                width: 100%;
                flex-direction: column;
                align-items: center;
              }
              .label {
                color: var(--green-40);
                font-size: 16px;
                line-height: 24px;
                margin-bottom: 4px;
              }
              .spend_amount {
                color: #fff;
                font-size: 28px;
                text-align: right;
                text-transform: uppercase;
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
              .send_to {
                font-size: 16px;
              }
            `}
          </style>
        </div>
      }
      textualInfoBlock={
        <TransactionDetailContainer>
          <TransactionDetailItem name="Type" value="Send Asset" />
          <TransactionDetailItem
            name="Spend amount"
            value={
              <>
                {truncateDecimalAmount(amount, 4)} {token}
              </>
            }
          />
          <TransactionDetailItem
            name="To:"
            value={<TransactionDetailAddressValue address={destination} />}
          />
        </TransactionDetailContainer>
      }
      inner={inner}
    />
  )
}
