import { ethers } from "ethers"
import logger from "../logger"
import { getTokenBalances } from "../erc20"
import { createAddressOnNetwork } from "../../tests/factories"

describe("getTokenBalances", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("logs each balance lookup at debug level", async () => {
    const info = jest.spyOn(logger, "info").mockImplementation(() => {})
    const debug = jest.spyOn(logger, "debug").mockImplementation(() => {})

    await getTokenBalances(
      createAddressOnNetwork(),
      [],
      new ethers.providers.StaticJsonRpcProvider("http://127.0.0.1:1", 1),
    )

    expect(debug).toHaveBeenCalledWith(
      "Looking up balances for",
      0,
      "tokens in",
      0,
      "batches on chain",
      "1",
    )
    expect(info).not.toHaveBeenCalled()
  })
})
