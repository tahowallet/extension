/* eslint-disable import/prefer-default-export */
import { isHexString } from "ethers/lib/utils"

export function validatePrivateKey(privateKey = ""): boolean {
  try {
    const paddedKey = privateKey.startsWith("0x")
      ? privateKey
      : `0x${privateKey}`
    // valid pk has 32 bytes -> 64 hex characters
    return (
      isHexString(paddedKey) && BigInt(paddedKey).toString(16).length === 64
    )
  } catch (e) {
    return false
  }
}
