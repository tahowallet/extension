import {
  truncateAddress,
  truncateDecimalAmount,
} from "@tallyho/tally-background/lib/utils"
import React, { ReactElement } from "react"
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItemShort from "../TransactionDetail/TransactionDetailItemShort"

interface Props {
  token: string
  amount: number
  destination: string
}

export default function SignTransactionTransferDetail(
  props: Props
): ReactElement {
  const { token, amount, destination } = props

  return (
    <TransactionDetailContainer>
      <TransactionDetailItemShort name="Type" value="Send Asset" />
      <TransactionDetailItemShort
        name="Spend amount"
        value={
          <>
            {truncateDecimalAmount(amount, 4)} {token}
          </>
        }
      />
      <TransactionDetailItemShort
        name="To:"
        value={truncateAddress(destination)}
      />
    </TransactionDetailContainer>
  )
}
