/* eslint-disable import/prefer-default-export */
import logger from "../../lib/logger"

export const getGasLimit = (networkSettings: {
  gasLimit: string
  suggestedGasLimit: bigint | undefined
}): bigint | undefined => {
  let gasLimit = networkSettings.suggestedGasLimit

  if (networkSettings.gasLimit !== "") {
    try {
      gasLimit = BigInt(networkSettings.gasLimit)
    } catch (error) {
      logger.debug(
        "Failed to parse network settings gas limit",
        networkSettings.gasLimit
      )
    }
  }

  return gasLimit
}
