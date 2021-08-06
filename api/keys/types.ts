export enum KEYTYPE {
  metamaskMnemonic = "mnemonic#metamask",
  mnemonicBIP39S128 = "mnemonic#bip39:128",
  mnemonicBIP39S256 = "mnemonic#bip39:256",
  singleSECP = "single#secp256k1",
}

export type keyTypeStrings = keyof typeof KEYTYPE

export interface Seed {
  data: string // seed material
  type: keyTypeStrings
  index: number // the current account index
  reference: string // unique reference
  path: string // fallback path to derive new keys
}

export interface KeyData {
  address: string // util for easily getting the address for keys
  pub: string // public key
  priv: string // private key
  reference?: string // the parent
  path?: string // path used to create the key if it was derived from a master seed
}

export interface Vault {
  seeds: Seed[]
  keys: KeyData[]
}
