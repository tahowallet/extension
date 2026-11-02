import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { ETHEREUM, POLYGON } from "../../constants"
import reducer, { grantPermission, initialState } from "../dapp"

const ORIGIN = "https://app.test"
const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"

const NEW_CONNECTION: PermissionRequest = {
  key: `${ORIGIN}_${ADDRESS}`,
  origin: ORIGIN,
  faviconUrl: "",
  title: "Test",
  state: "allow",
  accountAddress: ADDRESS,
}

const grant = (request: PermissionRequest) =>
  reducer(initialState, grantPermission.fulfilled(request, "", request))

const grantedChainIDs = (state: typeof initialState) =>
  Object.keys(state.allowed.evm).filter(
    (chainID) => state.allowed.evm[chainID]?.[ADDRESS]?.[ORIGIN] !== undefined,
  )

describe("dapp slice", () => {
  describe("grantPermission.fulfilled", () => {
    it("should allow a request without a chainID on every network", () => {
      const state = grant(NEW_CONNECTION)

      expect(grantedChainIDs(state)).toEqual(
        expect.arrayContaining([ETHEREUM.chainID, POLYGON.chainID]),
      )
      expect(state.allowed.evm[POLYGON.chainID][ADDRESS][ORIGIN]).toEqual({
        ...NEW_CONNECTION,
        chainID: POLYGON.chainID,
      })
    })

    it("should allow a request with a chainID on that network alone", () => {
      const request = { ...NEW_CONNECTION, chainID: POLYGON.chainID }

      const state = grant(request)

      expect(grantedChainIDs(state)).toEqual([POLYGON.chainID])
      expect(state.allowed.evm[POLYGON.chainID][ADDRESS][ORIGIN]).toEqual(
        request,
      )
    })
  })
})
