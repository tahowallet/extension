import type { AccountBalance } from "../../accounts"
import type { HexString } from "../../types"
import { normalizeEVMAddress } from "../../lib/utils"
import { SmartContractFungibleAsset } from "../../assets"
import { ETH, ETHEREUM, OPTIMISM } from "../../constants"
import {
  createCompleteAssetAmount,
  createNetworkBaseAsset,
  createSmartContractAsset,
} from "../../tests/factories"
import reducer, {
  AccountData,
  AccountState,
  initialState,
  setControlCompatibility,
  updateAccountBalance,
} from "../accounts"
import { getFullAssetID } from "../utils/asset-utils"
import {
  determineAssetDisplayAndVerify,
  selectIsAddressControlCompatible,
} from "../selectors"
import type { RootState } from ".."
import type { ControlCompatibility } from "../../services/signing"
import to39 from "../migrations/to-39"

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
        controlCompatibility: {},
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
        }),
      )

      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]

      expect(updatedAccountData).not.toEqual("loading")

      const updatedBalance = (updatedAccountData as AccountData)?.balances
      expect(updatedBalance?.[getFullAssetID(ETH)].amount).toBe(1n)
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
        }),
      )
      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]
      const updatedBalance = (updatedAccountData as AccountData)?.balances

      expect(updatedBalance?.[getFullAssetID(ETH)].amount).toBe(1n)
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
        }),
      )

      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]

      expect(updatedAccountData).not.toEqual("loading")

      const updatedBalance = (updatedAccountData as AccountData)?.balances

      expect(updatedBalance?.[getFullAssetID(ETH)].amount).toBe(0n)
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
        }),
      )
      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]
      const updatedBalance = (updatedAccountData as AccountData)?.balances

      expect(updatedBalance?.[getFullAssetID(ETH)].amount).toBe(0n)
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
        }),
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
        }),
      )

      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]
      const updatedBalance = (updatedAccountData as AccountData)?.balances

      expect(updatedBalance?.[getFullAssetID(ETH)].amount).toBe(1n)
      expect(updatedBalance?.[getFullAssetID(ASSET_MOCK)].amount).toBe(10n)
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
        }),
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
        }),
      )

      const updatedAccountData =
        updated.accountsData.evm[ETHEREUM.chainID][ADDRESS_MOCK]
      const balances = (updatedAccountData as AccountData)?.balances

      expect(balances?.[getFullAssetID(ETH)].amount).toBe(1n)

      expect(balances?.[getFullAssetID(someToken)].amount).toBe(1n)

      expect(balances?.[getFullAssetID(someOtherToken)].amount).toBe(2n)
    })
  })
})

describe("Utilities", () => {
  describe("determineAssetDisplayAndVerify", () => {
    it("should always display base assets", () => {
      const { displayAsset } = determineAssetDisplayAndVerify(
        createCompleteAssetAmount(createNetworkBaseAsset(), 0, {
          decimalAmount: 0,
          mainCurrencyAmount: 0,
        }),
        {
          hideDust: true,
          showUnverifiedAssets: false,
        },
      )
      expect(displayAsset).toBe(true)
    })

    describe("Hide dust", () => {
      it("should display asset amount if NOT dust and hideDust is enabled", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(createSmartContractAsset(), 200, {
            decimalAmount: 200,
            mainCurrencyAmount: 200,
          }),
          {
            hideDust: true,
            showUnverifiedAssets: false,
          },
        )

        expect(displayAsset).toBe(true)
      })

      it("should display asset amount if NOT dust and hideDust is disabled", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(createSmartContractAsset(), 200, {
            decimalAmount: 200,
            mainCurrencyAmount: 200,
          }),
          {
            hideDust: false,
            showUnverifiedAssets: false,
          },
        )

        expect(displayAsset).toBe(true)
      })

      it("should display asset amount if dust and hideDust is disabled", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(createSmartContractAsset(), 0, {
            decimalAmount: 1,
            mainCurrencyAmount: 0,
          }),
          {
            hideDust: false,
            showUnverifiedAssets: false,
          },
        )

        expect(displayAsset).toBe(true)
      })

      it("should NOT display asset amount if dust and hideDust is enabled", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(createSmartContractAsset(), 0, {
            decimalAmount: 0,
            mainCurrencyAmount: 0,
          }),
          {
            hideDust: true,
            showUnverifiedAssets: false,
          },
        )

        expect(displayAsset).toBe(false)
      })
    })

    describe("Verified assets", () => {
      it("should display asset amount if verified and showUnverifiedAssets is disabled", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(
            createSmartContractAsset({ metadata: { verified: true } }),
            200,
            {
              decimalAmount: 200,
              mainCurrencyAmount: 200,
            },
          ),
          {
            hideDust: true,
            showUnverifiedAssets: false,
          },
        )

        expect(displayAsset).toBe(true)
      })

      it("should display asset amount if verified and showUnverifiedAssets is enabled", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(
            createSmartContractAsset({ metadata: { verified: true } }),
            200,
            {
              decimalAmount: 200,
              mainCurrencyAmount: 200,
            },
          ),
          {
            hideDust: true,
            showUnverifiedAssets: true,
          },
        )

        expect(displayAsset).toBe(true)
      })

      it("should NOT display asset amount if unverified (trusted value set to false) and showUnverifiedAssets is disabled", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(
            createSmartContractAsset({ metadata: { verified: false } }),
            200,
            {
              decimalAmount: 200,
              mainCurrencyAmount: 200,
            },
          ),
          {
            hideDust: true,
            showUnverifiedAssets: false,
          },
        )

        expect(displayAsset).toBe(false)
      })

      it("should NOT display asset amount if unverified (empty metadata) and showUnverifiedAssets is disabled", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(
            createSmartContractAsset({ metadata: {} }),
            200,
            {
              decimalAmount: 200,
              mainCurrencyAmount: 200,
            },
          ),
          {
            hideDust: true,
            showUnverifiedAssets: false,
          },
        )

        expect(displayAsset).toBe(false)
      })

      it("should display asset amount if unverified and showUnverifiedAssets is enabled", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(
            createSmartContractAsset({ metadata: { verified: false } }),
            200,
            {
              decimalAmount: 200,
              mainCurrencyAmount: 200,
            },
          ),
          {
            hideDust: true,
            showUnverifiedAssets: true,
          },
        )

        expect(displayAsset).toBe(true)
      })

      it("should NOT display asset amount if verified and dust", () => {
        const { displayAsset } = determineAssetDisplayAndVerify(
          createCompleteAssetAmount(
            createSmartContractAsset({ metadata: { verified: true } }),
            0,
            {
              decimalAmount: 0,
              mainCurrencyAmount: 0,
            },
          ),
          {
            hideDust: true,
            showUnverifiedAssets: false,
          },
        )

        expect(displayAsset).toBe(false)
      })
    })
  })
})

describe("Control compatibility", () => {
  const OTHER_ADDRESS = normalizeEVMAddress(
    "0x0000000000000000000000000000000000000001",
  )
  const compatibility: ControlCompatibility = {
    [normalizeEVMAddress(ADDRESS_MOCK)]: {
      [ETHEREUM.chainID]: [OPTIMISM.chainID],
      [OPTIMISM.chainID]: [],
    },
  }

  describe("setControlCompatibility", () => {
    it("replaces the map wholesale", () => {
      const state = reducer(
        { ...initialState, controlCompatibility: compatibility },
        setControlCompatibility({
          [OTHER_ADDRESS]: {
            [ETHEREUM.chainID]: [],
          },
        }),
      )

      expect(state.controlCompatibility).toEqual({
        [OTHER_ADDRESS]: {
          [ETHEREUM.chainID]: [],
        },
      })
    })
  })

  describe("selectIsAddressControlCompatible", () => {
    const stateWith = (map: ControlCompatibility): RootState =>
      ({
        account: { ...initialState, controlCompatibility: map },
      }) as unknown as RootState

    it("treats the same network as compatible without any entry", () => {
      expect(
        selectIsAddressControlCompatible(
          stateWith({}),
          { address: ADDRESS_MOCK, network: ETHEREUM },
          ETHEREUM,
        ),
      ).toBe(true)
    })

    it("reads a compatible pair from the map", () => {
      expect(
        selectIsAddressControlCompatible(
          stateWith(compatibility),
          { address: ADDRESS_MOCK, network: ETHEREUM },
          OPTIMISM,
        ),
      ).toBe(true)
    })

    it("matches the address regardless of casing", () => {
      expect(
        selectIsAddressControlCompatible(
          stateWith(compatibility),
          {
            address: `0x${ADDRESS_MOCK.slice(2).toUpperCase()}` as HexString,
            network: ETHEREUM,
          },
          OPTIMISM,
        ),
      ).toBe(true)
    })

    it("is false for a pair that is missing from the map", () => {
      expect(
        selectIsAddressControlCompatible(
          stateWith({}),
          { address: ADDRESS_MOCK, network: ETHEREUM },
          OPTIMISM,
        ),
      ).toBe(false)
    })

    it("is false for a pair the map lists as incompatible", () => {
      expect(
        selectIsAddressControlCompatible(
          stateWith(compatibility),
          { address: ADDRESS_MOCK, network: OPTIMISM },
          ETHEREUM,
        ),
      ).toBe(false)
    })
  })

  describe("migration to 39", () => {
    it("gives the map to state that predates it, keeping the rest of the slice", () => {
      const migrated = to39({
        account: { accountsData: { evm: {} } },
        ui: {},
      })

      expect(migrated.account).toEqual({
        accountsData: { evm: {} },
        controlCompatibility: {},
      })
    })
  })
})
