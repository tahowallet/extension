import { AccountBalance } from "../../accounts"
import { SmartContractFungibleAsset } from "../../assets"
import { ETH, ETHEREUM } from "../../constants"
import { createSmartContractAsset } from "../../tests/factories"
import reducer, {
  AccountData,
  AccountState,
  updateAccountBalance,
} from "../accounts"
import { getAssetID } from "../utils/asset-utils"

const ADDRESS_MOCK = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const ACCOUNT_MOCK = {
  address: ADDRESS_MOCK,
  network: ETHEREUM,
  balances: {},
  ens: {},
  defaultName: "Topa",
  defaultAvatar: "",
}
const ASSET_MOCK: SmartContractFungibleAsset = createSmartContractAsset({
  symbol: "XYZ",
})
const BALANCE_MOCK: AccountBalance = {
  address: ADDRESS_MOCK,
  assetAmount: {
    asset: ETH,
    amount: 1n,
  },
  network: ETHEREUM,
  retrievedAt: 1,
  dataSource: "local",
}

describe("Accounts redux slice", () => {
  describe(updateAccountBalance, () => {
    let state: AccountState

    beforeEach(() => {
      state = {
        accountsData: { evm: {} },
        combinedData: {
          totalMainCurrencyValue: "",
          assets: [],
        },
      }
    })

    it("should update positive balance for account that is loading", () => {
      const balances = [BALANCE_MOCK]
      state.accountsData.evm = {
        [ETHEREUM.chainID]: { [ADDRESS_MOCK]: "loading" },
      }
      const updated = reducer(
        state,
        updateAccountBalance({
          balances,
          addressOnNetwork: { address: ADDRESS_MOCK, network: ETHEREUM },
        })
      )

      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]

      expect(updatedAccountData).not.toEqual("loading")

      const updatedBalance = (updatedAccountData as AccountData)?.balances
      expect(updatedBalance?.[getAssetID(ETH)].assetAmount.amount).toBe(1n)
      expect(updated.combinedData.totalMainCurrencyValue).toBe("")
    })

    it("should update positive balance for account that is loaded", () => {
      const balances = [BALANCE_MOCK]
      state.accountsData.evm = {
        [ETHEREUM.chainID]: { [ADDRESS_MOCK]: ACCOUNT_MOCK },
      }
      const updated = reducer(
        state,
        updateAccountBalance({
          balances,
          addressOnNetwork: { address: ADDRESS_MOCK, network: ETHEREUM },
        })
      )
      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]
      const updatedBalance = (updatedAccountData as AccountData)?.balances

      expect(updatedBalance?.[getAssetID(ETH)].assetAmount.amount).toBe(1n)
      expect(updated.combinedData.totalMainCurrencyValue).toBe("")
    })

    it("should updated zero balance for account that is loading", () => {
      const balances: AccountBalance[] = [
        {
          ...BALANCE_MOCK,
          assetAmount: {
            asset: ETH,
            amount: 0n,
          },
        },
      ]
      state.accountsData.evm = {
        [ETHEREUM.chainID]: { [ADDRESS_MOCK]: "loading" },
      }
      const updated = reducer(
        state,
        updateAccountBalance({
          balances,
          addressOnNetwork: { address: ADDRESS_MOCK, network: ETHEREUM },
        })
      )

      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]

      expect(updatedAccountData).not.toEqual("loading")

      const updatedBalance = (updatedAccountData as AccountData)?.balances

      expect(updatedBalance?.[getAssetID(ETH)].assetAmount.amount).toBe(0n)
    })

    it("should update zero balance for account that is loaded", () => {
      const balances: AccountBalance[] = [
        {
          ...BALANCE_MOCK,
          assetAmount: {
            asset: ETH,
            amount: 0n,
          },
        },
      ]
      state.accountsData.evm = {
        [ETHEREUM.chainID]: { [ADDRESS_MOCK]: ACCOUNT_MOCK },
      }
      const updated = reducer(
        state,
        updateAccountBalance({
          balances,
          addressOnNetwork: { address: ADDRESS_MOCK, network: ETHEREUM },
        })
      )
      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]
      const updatedBalance = (updatedAccountData as AccountData)?.balances

      expect(updatedBalance?.[getAssetID(ETH)].assetAmount.amount).toBe(0n)
    })

    it("should update positive balance multiple times", () => {
      state.accountsData.evm = {
        [ETHEREUM.chainID]: { [ADDRESS_MOCK]: ACCOUNT_MOCK },
      }

      const initial = reducer(
        state,
        updateAccountBalance({
          balances: [
            BALANCE_MOCK,
            { ...BALANCE_MOCK, assetAmount: { asset: ASSET_MOCK, amount: 5n } },
          ],
          addressOnNetwork: { address: ADDRESS_MOCK, network: ETHEREUM },
        })
      )
      const updated = reducer(
        initial,
        updateAccountBalance({
          balances: [
            {
              ...BALANCE_MOCK,
              assetAmount: { asset: ASSET_MOCK, amount: 10n },
            },
          ],
          addressOnNetwork: { address: ADDRESS_MOCK, network: ETHEREUM },
        })
      )

      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]
      const updatedBalance = (updatedAccountData as AccountData)?.balances

      expect(updatedBalance?.[getAssetID(ETH)].assetAmount.amount).toBe(1n)
      expect(updatedBalance?.[getAssetID(ASSET_MOCK)].assetAmount.amount).toBe(
        10n
      )
    })

    it("should support storing balances for assets with the same symbol", () => {
      state.accountsData.evm = {
        [ETHEREUM.chainID]: { [ADDRESS_MOCK]: ACCOUNT_MOCK },
      }

      const someToken = createSmartContractAsset({ symbol: "USDC" })
      const someOtherToken = createSmartContractAsset({ symbol: "USDC" })

      const initial = reducer(
        state,
        updateAccountBalance({
          balances: [BALANCE_MOCK],
          addressOnNetwork: { address: ADDRESS_MOCK, network: ETHEREUM },
        })
      )

      const updated = reducer(
        initial,
        updateAccountBalance({
          balances: [
            BALANCE_MOCK,
            {
              ...BALANCE_MOCK,
              assetAmount: { asset: someToken, amount: 1n },
            },
            {
              ...BALANCE_MOCK,
              assetAmount: { asset: someOtherToken, amount: 2n },
            },
          ],
          addressOnNetwork: { address: ADDRESS_MOCK, network: ETHEREUM },
        })
      )

      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]
      const balances = (updatedAccountData as AccountData)?.balances

      expect(balances?.[getAssetID(ETH)].assetAmount.asset).toEqual(ETH)

      expect(balances?.[getAssetID(someToken)].assetAmount.asset).toEqual(
        someToken
      )
      expect(balances?.[getAssetID(someToken)].assetAmount.amount).toEqual(1n)

      expect(balances?.[getAssetID(someOtherToken)].assetAmount.asset).toEqual(
        someOtherToken
      )
      expect(balances?.[getAssetID(someOtherToken)].assetAmount.amount).toEqual(
        2n
      )
    })
  })
})
