/**
 * For each available signer type, the frame that will wrap the signing data
 * data and own the signing flow.
 */
export const frameComponentForSigner: {
  [signerType in SignerType]: SigningFrame
} = {
  keyring: SignerKeyringFrame,
  ledger: SignerLedgerFrame,
  // ... will error if a new SignerType is added without a corresponding frame
}
