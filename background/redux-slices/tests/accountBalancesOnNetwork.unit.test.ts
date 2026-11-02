import { ETH, ETHEREUM, OPTIMISM } from "../../constants"
import {
  createAccountBalance,
  createPricePoint,
  createSmartContractAsset,
} from "../../tests/factories"
import accountsReducer, {
  AccountState,
  loadAccount,
  updateAccountBalance,
} from "../accounts"
import assetsReducer, { assetsLoaded } from "../assets"
import pricesReducer, { newPricePoints } from "../prices"
import { initialState as uiInitialState } from "../ui"
import { makeSelectAccountBalancesOnNetwork } from "../selectors"
import type { RootState } from ".."

const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"

const TRUSTED = createSmartContractAsset({ symbol: "TRST", decimals: 18 })
const UNTRUSTED = createSmartContractAsset({
  symbol: "SPAM",
  decimals: 18,
  metadata: {},
})

function buildState(): RootState {
  const balances = [
    createAccountBalance({
      address: ADDRESS,
      network: ETHEREUM,
      assetAmount: { asset: ETH, amount: 2n * 10n ** 18n },
    }),
    createAccountBalance({
      address: ADDRESS,
      network: ETHEREUM,
      assetAmount: { asset: TRUSTED, amount: 10n * 10n ** 18n },
    }),
    createAccountBalance({
      address: ADDRESS,
      network: ETHEREUM,
      assetAmount: { asset: UNTRUSTED, amount: 5n * 10n ** 18n },
    }),
  ]

  let account: AccountState = { accountsData: { evm: {} } }
  account = accountsReducer(
    account,
    loadAccount({ address: ADDRESS, network: ETHEREUM }),
  )
  account = accountsReducer(
    account,
    updateAccountBalance({
      balances,
      addressOnNetwork: { address: ADDRESS, network: ETHEREUM },
    }),
  )

  const assets = assetsReducer(
    undefined,
    assetsLoaded({
      assets: [ETH, TRUSTED, UNTRUSTED],
      loadingScope: "incremental",
    }),
  )
  const prices = pricesReducer(
    undefined,
    newPricePoints([createPricePoint(ETH, 2000), createPricePoint(TRUSTED, 3)]),
  )

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return {
    account,
    assets,
    prices,
    ui: {
      ...uiInitialState,
      settings: { ...uiInitialState.settings, showUnverifiedAssets: false },
    },
  } as unknown as RootState
}

describe("makeSelectAccountBalancesOnNetwork", () => {
  it("splits trusted and unverified assets and totals trusted ones", () => {
    const selectBalances = makeSelectAccountBalancesOnNetwork({
      address: ADDRESS,
      network: ETHEREUM,
    })

    const balances = selectBalances(buildState())

    if (balances === undefined || balances === "loading") {
      throw new Error(`Expected loaded balances, got ${String(balances)}`)
    }
    expect(balances.assetAmounts.map(({ asset }) => asset.symbol)).toEqual([
      "ETH",
      "TRST",
    ])
    // Listed even though the show-unverified-assets setting is off.
    expect(
      balances.unverifiedAssetAmounts.map(({ asset }) => asset.symbol),
    ).toEqual(["SPAM"])
    expect(balances.totalMainCurrencyAmount).toBe(4030)
    expect(balances.totalMainCurrencyValue).toBe("4,030.00")
  })

  it("matches addresses regardless of case", () => {
    const selectBalances = makeSelectAccountBalancesOnNetwork({
      address: ADDRESS.toUpperCase().replace("0X", "0x"),
      network: ETHEREUM,
    })

    expect(selectBalances(buildState())).not.toBeUndefined()
  })

  it("is undefined on networks the account isn't tracked on", () => {
    const selectBalances = makeSelectAccountBalancesOnNetwork({
      address: ADDRESS,
      network: OPTIMISM,
    })

    expect(selectBalances(buildState())).toBeUndefined()
  })
})
