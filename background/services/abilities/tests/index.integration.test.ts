import sinon from "sinon"
import AbilitiesService, { normalizeDaylightAbilities } from ".."
import {
  createAbilitiesService,
  createChainService,
  createDaylightAbility,
} from "../../../tests/factories"
import ChainService from "../../chain"
import * as daylight from "../../../lib/daylight"
import { DaylightAbility } from "../../../lib/daylight"
import { Ability } from "../../../abilities"
import { AbilitiesDatabase } from "../db"
import { normalizeEVMAddress } from "../../../lib/utils"

const address = normalizeEVMAddress(
  "0x208e94d5661a73360d9387d3ca169e5c130090cd",
)

const sortAbilities = (abilities: Ability[]) =>
  abilities.sort(
    (ability1, ability2) => ability1.interestRank - ability2.interestRank,
  )

type AbilitiesServiceExternalized = Omit<AbilitiesService, "db"> & {
  db: AbilitiesDatabase
}

describe("AbilitiesService", () => {
  const sandbox = sinon.createSandbox()
  let abilitiesService: AbilitiesService
  let chainService: ChainService

  beforeEach(async () => {
    sandbox.restore()
    chainService = await createChainService()
    abilitiesService = await createAbilitiesService({
      chainService: Promise.resolve(chainService),
    })
    await abilitiesService.startService()
  })

  afterEach(async () => {
    await abilitiesService.stopService()
  })

  describe("refreshAbilities", () => {
    beforeEach(async () => {
      // Sun Jan 01 2023 10:00:00
      Date.now = jest.fn(() => +new Date(2023, 0, 1, 10))
    })

    afterEach(async () => {
      jest.clearAllMocks()
    })

    it("should load accounts to refresh abilities when the last refresh was over an hour ago", async () => {
      // Sun Jan 01 2023 08:00:00
      const lastFetchTime = +new Date(2023, 0, 1, 8)
      localStorage.setItem("LAST_ABILITY_FETCH_TIME", lastFetchTime.toString())
      const stub = sandbox
        .stub(chainService, "getAccountsToTrack")
        .callsFake(async () => [])

      await abilitiesService.refreshAbilities()
      expect(stub.called).toBe(true)
    })
    it("should not load accounts to refresh abilities when the last refresh was less than an hour ago", async () => {
      // Sun Jan 01 2023 09:30:00
      const lastFetchTime = +new Date(2023, 0, 1, 9, 30)
      localStorage.setItem("LAST_ABILITY_FETCH_TIME", lastFetchTime.toString())
      const stub = sandbox
        .stub(chainService, "getAccountsToTrack")
        .callsFake(async () => [])

      await abilitiesService.refreshAbilities()
      expect(stub.called).toBe(false)
    })
  })

  // FIXME Restore once abilities polling is restored.
  describe.skip("pollForAbilities", () => {
    let daylightAbilities: DaylightAbility[]

    beforeEach(async () => {
      jest.spyOn(abilitiesService.emitter, "emit")

      // Default state for abilities from Daylight API
      daylightAbilities = [
        createDaylightAbility(),
        createDaylightAbility(),
        createDaylightAbility(),
      ]
    })

    afterEach(async () => {
      jest.clearAllMocks()
    })

    it("should emit updatedAbilities if there are new abilities", async () => {
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => daylightAbilities)

      await abilitiesService.pollForAbilities(address)

      // Normalized abilities that should be returned for redux status updates
      const abilities = normalizeDaylightAbilities(daylightAbilities, address)

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(1)
      expect(abilitiesService.emitter.emit).toBeCalledWith("updatedAbilities", {
        address,
        abilities,
      })
    })

    it("should emit updatedAbilities with updated abilities without the ability which has been removed", async () => {
      // Update abilities from Daylight API, last ability has been removed from API
      const updatedDaylightAbilities = [
        daylightAbilities[0],
        daylightAbilities[1],
      ]
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .onCall(0)
        .callsFake(async () => daylightAbilities)
        .onCall(1)
        .callsFake(async () => updatedDaylightAbilities)

      await abilitiesService.pollForAbilities(address)
      await abilitiesService.pollForAbilities(address)

      // Normalized abilities that should be returned for redux status updates
      // We use the updated state because it should be the same in the cache
      const abilities = normalizeDaylightAbilities(
        updatedDaylightAbilities,
        address,
      )

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesService.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities,
        },
      )
    })

    it("should emit updatedAbilities with updated ability if it has been completed", async () => {
      // Update abilities from Daylight API, the second ability has been marked as completed by Daylight
      const updatedDaylightAbilities = [...daylightAbilities]
      daylightAbilities[1].walletCompleted = true
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .onCall(0)
        .callsFake(async () => daylightAbilities)
        .onCall(1)
        .callsFake(async () => updatedDaylightAbilities)

      await abilitiesService.pollForAbilities(address)
      await abilitiesService.pollForAbilities(address)

      // Normalized abilities that should be returned for redux status updates
      // We use the updated state because it should be the same in the cache
      const abilities = normalizeDaylightAbilities(
        updatedDaylightAbilities,
        address,
      )

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesService.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities,
        },
      )
    })

    it("should emit updatedAbilities with not updated ability if it has been completed by the user", async () => {
      const abilitiesServiceExternalized =
        abilitiesService as unknown as AbilitiesServiceExternalized
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => daylightAbilities)

      await abilitiesServiceExternalized.pollForAbilities(address)
      // Mark second ability as completed
      await abilitiesServiceExternalized.db.markAsCompleted(
        address,
        daylightAbilities[1].uid,
      )
      await abilitiesServiceExternalized.pollForAbilities(address)

      // Normalized abilities that should be returned for redux status updates
      const abilities = normalizeDaylightAbilities(daylightAbilities, address)
      // Update state for the completed ability
      abilities[1].completed = true

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesServiceExternalized.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesServiceExternalized.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities,
        },
      )
    })

    it("should emit updatedAbilities with not updated ability if it has been removed by the user", async () => {
      const abilitiesServiceExternalized =
        abilitiesService as unknown as AbilitiesServiceExternalized
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => daylightAbilities)

      await abilitiesServiceExternalized.pollForAbilities(address)
      // Mark second ability as removed
      await abilitiesServiceExternalized.db.markAsRemoved(
        address,
        daylightAbilities[1].uid,
      )
      await abilitiesServiceExternalized.pollForAbilities(address)

      // Normalized abilities that should be returned for redux status updates
      const abilities = normalizeDaylightAbilities(daylightAbilities, address)
      // Update state for the removed ability
      abilities[1].removedFromUi = true

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesServiceExternalized.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesServiceExternalized.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities,
        },
      )
    })

    it("should emit updatedAbilities with changed order of abilities", async () => {
      // Update abilities from Daylight API, shuffle abilities
      const updatedDaylightAbilities = [
        ...daylightAbilities.slice(-1),
        ...daylightAbilities.slice(0, -1),
      ]
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .onCall(0)
        .callsFake(async () => daylightAbilities)
        .onCall(1)
        .callsFake(async () => updatedDaylightAbilities)

      await abilitiesService.pollForAbilities(address)
      await abilitiesService.pollForAbilities(address)

      // Normalized abilities that should be returned for redux status updates
      const abilities = sortAbilities(
        normalizeDaylightAbilities(updatedDaylightAbilities, address),
      )

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesService.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities,
        },
      )
    })
  })
})
