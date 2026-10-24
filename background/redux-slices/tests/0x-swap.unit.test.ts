import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test"
import { ethers } from "ethers"
import * as zeroExSwap from "../../lib/0x-swap"
import * as priceOracle from "../../lib/priceOracle"
import { isValid0xSwapPriceResponse } from "../../lib/validate"
import { ETHEREUM } from "../../constants"
import { createSmartContractAsset } from "../../tests/factories"
import priceExactIn from "../../lib/tests/fixtures/0x/price-exact-in.json"
import priceExactOut from "../../lib/tests/fixtures/0x/price-exact-out.json"
import priceNoLiquidity from "../../lib/tests/fixtures/0x/price-no-liquidity.json"
import { LiquidSwapPrice, SwapPriceResponse } from "../../lib/0x-swap-types"
import { fetchSwapPrice } from "../0x-swap"
import { setSnackbarMessage } from "../ui"
import { allAliases } from "../utils"
import * as contractUtils from "../utils/contract-utils"
import { SwapQuoteRequest } from "../utils/0x-swap-utils"

const TAKER = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const SELL_TOKEN = "0x6b175474e89094c44da98b954eedeac495271d0f"

const quoteRequest: SwapQuoteRequest = {
  assets: {
    sellAsset: createSmartContractAsset({ contractAddress: SELL_TOKEN }),
    buyAsset: createSmartContractAsset(),
  },
  amount: { buyAmount: "10" },
  slippageTolerance: 0.01,
  gasPrice: 1n,
  network: ETHEREUM,
}

// Sells an ERC20 so the thunk has to check the taker's allowance.
function sellingERC20(fixture: unknown): LiquidSwapPrice {
  if (!isValid0xSwapPriceResponse(fixture) || !fixture.liquidityAvailable) {
    throw new Error("Expected a 0x price with liquidity.")
  }
  return { ...fixture, sellToken: SELL_TOKEN }
}

describe("fetchSwapPrice", () => {
  let allowance: bigint

  beforeEach(() => {
    const provider = contractUtils.getProvider()
    const signer = provider.getSigner()

    jest.spyOn(contractUtils, "getProvider").mockReturnValue(provider)
    jest.spyOn(provider, "getSigner").mockReturnValue(signer)
    jest.spyOn(signer, "getAddress").mockResolvedValue(TAKER)
    jest
      .spyOn(provider, "call")
      .mockImplementation(async () =>
        ethers.utils.defaultAbiCoder.encode(["uint256"], [allowance]),
      )
    jest.spyOn(priceOracle, "getUSDPriceForTokens").mockResolvedValue({})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const runFetchSwapPrice = async (price: SwapPriceResponse | null) => {
    jest.spyOn(zeroExSwap, "getPrice").mockResolvedValue(price)

    const dispatch = jest.fn()
    const runThunk = allAliases[fetchSwapPrice.typePrefix]
    const action = await runThunk(fetchSwapPrice({ quoteRequest }))(
      dispatch,
      () => ({ prices: { pricePoints: {} } }),
      undefined,
    )

    return { action, dispatch }
  }

  const fetchNeedsApproval = async (price: LiquidSwapPrice) => {
    const { action } = await runFetchSwapPrice(price)

    return fetchSwapPrice.fulfilled.match(action)
      ? action.payload?.needsApproval
      : undefined
  }

  it("should require approval when the allowance only covers an exact-out swap's estimate", async () => {
    const price = sellingERC20(priceExactOut)
    if (price.mode !== "exact-out") throw new Error("Expected exact-out.")
    allowance = BigInt(price.estimatedNetSellAmount)

    expect(await fetchNeedsApproval(price)).toBe(true)
  })

  it("should not require approval when the allowance covers an exact-out swap's max sell amount", async () => {
    const price = sellingERC20(priceExactOut)
    if (price.mode !== "exact-out") throw new Error("Expected exact-out.")
    allowance = BigInt(price.maxSellAmount)

    expect(await fetchNeedsApproval(price)).toBe(false)
  })

  it("should compare an exact-in swap's allowance to its sell amount", async () => {
    const price = sellingERC20(priceExactIn)
    if (price.mode !== "exact-in") throw new Error("Expected exact-in.")

    allowance = BigInt(price.sellAmount)
    expect(await fetchNeedsApproval(price)).toBe(false)

    allowance = BigInt(price.sellAmount) - 1n
    expect(await fetchNeedsApproval(price)).toBe(true)
  })

  it("should report insufficient liquidity only when 0x reports it", async () => {
    if (!isValid0xSwapPriceResponse(priceNoLiquidity)) {
      throw new Error("Expected a valid 0x price.")
    }
    const { dispatch } = await runFetchSwapPrice(priceNoLiquidity)

    expect(dispatch).toHaveBeenCalledWith(
      setSnackbarMessage("Insufficient liquidity for this trade"),
    )
  })

  it("should report a price that didn't validate as a failed price lookup", async () => {
    const { dispatch } = await runFetchSwapPrice(null)

    expect(dispatch).toHaveBeenCalledWith(
      setSnackbarMessage("Couldn't get a swap price"),
    )
    expect(dispatch).not.toHaveBeenCalledWith(
      setSnackbarMessage("Insufficient liquidity for this trade"),
    )
  })
})
