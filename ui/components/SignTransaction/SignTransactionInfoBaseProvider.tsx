import { EIP1559TransactionRequest } from "@tallyho/tally-background/networks"
import { TransactionAnnotation } from "@tallyho/tally-background/services/enrichment"
import { ReactElement, ReactNode } from "react"

export interface SignTransactionInfo {
  title: ReactNode
  infoBlock: ReactNode
  textualInfoBlock: ReactNode
  confirmButtonLabel: ReactNode
}

export interface SignTransactionInfoProviderProps<
  T extends TransactionAnnotation | undefined =
    | TransactionAnnotation
    | undefined
> {
  transactionDetails: EIP1559TransactionRequest
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
