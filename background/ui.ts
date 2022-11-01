import type { AccountSigner, ReadOnlyAccountSigner } from "./services/signing"

export type AccountSignerSettings = {
  signer: Exclude<AccountSigner, typeof ReadOnlyAccountSigner>
  title?: string
}
