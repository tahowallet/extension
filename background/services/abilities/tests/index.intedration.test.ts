import sinon from "sinon"
import AbilitiesService, { normalizeDaylightAbilities } from ".."
import {
  createAbilitiesService,
  createChainService,
  createDaylightAbility,
} from "../../../tests/factories"
import ChainService from "../../chain"
import * as daylight from "../../../lib/daylight"

const TEST_ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"

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

    it("should refresh abilities", async () => {
      // Sun Jan 01 2023 08:00:00
      const lastFetchTime = +new Date(2023, 0, 1, 8)
      localStorage.setItem("LAST_ABILITY_FETCH_TIME", lastFetchTime.toString())
      const stub = sandbox
        .stub(chainService, "getAccountsToTrack")
        .callsFake(async () => [])

      await abilitiesService.refreshAbilities()
      expect(stub.called).toBe(true)
    })
    it("should not refresh abilities", async () => {
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

  describe("pollForAbilities", () => {
    beforeEach(async () => {
      jest.spyOn(abilitiesService.emitter, "emit")
    })

    afterEach(async () => {
      jest.clearAllMocks()
    })

    it("should not emit newAbilities to update abilities", async () => {
      const stub = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => [])

      await abilitiesService.pollForAbilities(TEST_ADDRESS)
      expect(stub.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(0)
    })

    it("should emit newAbilities and notify UI to update abilities", async () => {
      const daylightAbilities = [createDaylightAbility()]
      const stubAddNewAbility = sandbox
        // eslint-disable-next-line @typescript-eslint/dot-notation
        .stub(abilitiesService["db"], "addNewAbility")
        .callsFake(async () => true)
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => daylightAbilities)

      await abilitiesService.pollForAbilities(TEST_ADDRESS)

      const normalizedAbilities = normalizeDaylightAbilities(
        daylightAbilities,
        TEST_ADDRESS
      )

      expect(stubGetAbilities.called).toBe(true)
      expect(stubAddNewAbility.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(1)
      expect(abilitiesService.emitter.emit).toBeCalledWith(
        "newAbilities",
        normalizedAbilities
      )
    })

    it("should emit newAbilities and notify UI to add only one new ability", async () => {
      const slug = "new-test-daylight"
      const daylightAbilities = [
        createDaylightAbility(),
        createDaylightAbility({ slug }),
      ]
      const stubAddNewAbility = sandbox
        // eslint-disable-next-line @typescript-eslint/dot-notation
        .stub(abilitiesService["db"], "addNewAbility")
        .callsFake(async (ability) => {
          return ability.slug === slug
        })
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => daylightAbilities)

      await abilitiesService.pollForAbilities(TEST_ADDRESS)

      const normalizedAbilities = normalizeDaylightAbilities(
        daylightAbilities,
        TEST_ADDRESS
      )

      expect(stubGetAbilities.called).toBe(true)
      expect(stubAddNewAbility.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(1)
      expect(abilitiesService.emitter.emit).toBeCalledWith("newAbilities", [
        normalizedAbilities[1],
      ])
    })
  })
})
