import type { AccountSigner, ReadOnlyAccountSigner } from "./services/signing"

export type AccountSignerWithId = Exclude<
  AccountSigner,
  typeof ReadOnlyAccountSigner
>
