import {
  EnrichedEVMTransactionRequest,
  TransactionAnnotation,
} from "@tallyho/tally-background/services/enrichment"

export type TransactionSignatureSummaryProps<
  T extends TransactionAnnotation | undefined =
    | TransactionAnnotation
    | undefined,
> = {
  transactionRequest: EnrichedEVMTransactionRequest
  annotation: T
}
