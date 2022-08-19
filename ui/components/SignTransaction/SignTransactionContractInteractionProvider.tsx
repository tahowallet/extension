import React, { ReactElement } from "react"
import SharedAddress from "../Shared/SharedAddress"
import TransactionDetailAddressValue from "../TransactionDetail/TransactionDetailAddressValue"
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../TransactionDetail/TransactionDetailItem"
import SignTransactionBaseInfoProvider, {
  SignTransactionInfoProviderProps,
} from "./SignTransactionInfoBaseProvider"

export default function SignTransactionContractInteractionProvider({
  transactionDetails,
  annotation,
  inner,
}: SignTransactionInfoProviderProps): ReactElement {
  return (
    <SignTransactionBaseInfoProvider
      title="Contract interaction"
      infoBlock={
        <div className="info_block">
          <div className="container">
            {typeof transactionDetails.to === "undefined" ? (
              <>
                <div className="label">Send to</div>
                <div className="send_to">Contract creation</div>
              </>
            ) : (
              <>
                <div className="label">Interacting with</div>
                <SharedAddress
                  address={transactionDetails.to}
                  name={
                    annotation !== undefined && "contractInfo" in annotation
                      ? annotation.contractInfo.annotation.nameOnNetwork?.name
                      : undefined
                  }
                />
              </>
            )}
          </div>
          <style jsx>
            {`
              .info_block {
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
              .container {
                display: flex;
                margin: 20px 0;
                flex-direction: column;
                align-items: center;
              }
            `}
          </style>
        </div>
      }
      textualInfoBlock={
        <TransactionDetailContainer>
          <TransactionDetailItem name="Type" value="Sign" />
          <TransactionDetailItem
            name="To:"
            value={
              transactionDetails.to && (
                <TransactionDetailAddressValue
                  address={transactionDetails.to}
                />
              )
            }
          />
        </TransactionDetailContainer>
      }
      confirmButtonLabel="Confirm"
      inner={inner}
    />
  )
}
