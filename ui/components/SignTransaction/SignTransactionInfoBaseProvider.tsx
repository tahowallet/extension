import { TransactionRequest } from "@tallyho/tally-background/networks"
import { TransactionAnnotation } from "@tallyho/tally-background/services/enrichment"
import { ReactElement, ReactNode } from "react"

export interface SignTransactionInfo {
  title:
    | "Contract interaction"
    | "Activate blind signing"
    | "Ledger is busy"
    | "Connect to Ledger"
    | "Multiple Ledgers are connected"
    | "Sign Transaction"
    | "Approve asset spend"
    | "Swap assets"
    | "Sign assets"
    | "Sign Transfer"
    | "Wrong Ledger"
  infoBlock: ReactNode
  textualInfoBlock: ReactNode
  confirmButtonLabel: ReactNode
}

export interface SignTransactionInfoProviderProps<
  T extends TransactionAnnotation | undefined =
    | TransactionAnnotation
    | undefined
> {
  transactionDetails: TransactionRequest
  annotation: T
  inner: (info: SignTransactionInfo) => ReactElement
}

export default function SignTransactionBaseInfoProvider({
  inner,
  ...info
}: SignTransactionInfo & {
  inner: (info: SignTransactionInfo) => ReactElement
}): ReactElement {
  return inner(info)
}
