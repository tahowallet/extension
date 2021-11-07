export type HexString = string

/*
 * Time measured in seconds since the Unix Epoch, January 1st, 1970 UTC
 */
export type UNIXTime = number

// KEY TYPES

export enum KeyringTypes {
  mnemonicBIP39S128 = "mnemonic#bip39:128",
  mnemonicBIP39S256 = "mnemonic#bip39:256",
  metamaskMnemonic = "mnemonic#metamask",
  singleSECP = "single#secp256k1",
}
