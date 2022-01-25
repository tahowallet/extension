export type SigningMethod =
  | { type: "keyring" }
  | { type: "ledger"; path: string }
