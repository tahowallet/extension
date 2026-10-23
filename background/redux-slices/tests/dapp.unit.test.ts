import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { ETHEREUM, POLYGON } from "../../constants"
import reducer, { grantPermission, initialState } from "../dapp"

const ORIGIN = "https://app.test"
const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"

const permissionOn = (chainID: string): PermissionRequest => ({
  key: `${ORIGIN}_${ADDRESS}_${chainID}`,
  origin: ORIGIN,
  faviconUrl: "",
  title: "Test",
  state: "allow",
  accountAddress: ADDRESS,
  chainID,
})

const grantedChainIDs = (state: typeof initialState) =>
  Object.keys(state.allowed.evm).filter(
    (chainID) => state.allowed.evm[chainID]?.[ADDRESS]?.[ORIGIN] !== undefined,
  )

describe("dapp slice", () => {
  describe("grantPermission.fulfilled", () => {
    it("should allow a new connection on every network", () => {
      const state = reducer(
        initialState,
        grantPermission.fulfilled(permissionOn(ETHEREUM.chainID), "", {
          ...permissionOn(ETHEREUM.chainID),
        }),
      )

      expect(grantedChainIDs(state)).toEqual(
        expect.arrayContaining([ETHEREUM.chainID, POLYGON.chainID]),
      )
    })

    it("should allow a request for an additional network on that network alone", () => {
      const request = {
        ...permissionOn(POLYGON.chainID),
        forAdditionalNetwork: true,
      }

      const state = reducer(
        initialState,
        grantPermission.fulfilled(request, "", request),
      )

      expect(grantedChainIDs(state)).toEqual([POLYGON.chainID])
      expect(state.allowed.evm[POLYGON.chainID][ADDRESS][ORIGIN]).toEqual(
        permissionOn(POLYGON.chainID),
      )
    })
  })
})
