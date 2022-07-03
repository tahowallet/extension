import { EIP1559TransactionRequest } from "@tallyho/tally-background/networks"
import { TransactionAnnotation } from "@tallyho/tally-background/services/enrichment"

export type SigningDataTransactionSummaryProps<
  T extends TransactionAnnotation | undefined =
    | TransactionAnnotation
    | undefined
> = {
  transactionRequest: EIP1559TransactionRequest
  annotation: T
}
