import sinon from "sinon"
import AbilitiesService, { normalizeDaylightAbilities } from ".."
import {
  createAbilitiesService,
  createChainService,
  createDaylightAbility,
} from "../../../tests/factories"
import ChainService from "../../chain"
import * as daylight from "../../../lib/daylight"
import { NormalizedEVMAddress } from "../../../types"
import { DaylightAbility } from "../../../lib/daylight"
import { Ability } from "../../../abilities"

const address =
  "0x208e94d5661a73360d9387d3ca169e5c130090cd" as NormalizedEVMAddress

const sortAbilities = (abilities: Ability[]) =>
  abilities.sort(
    (ability1, ability2) => ability1.magicOrderIndex - ability2.magicOrderIndex
  )

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

  describe("pollForAbilities", () => {
    let daylightAbilities: DaylightAbility[]
    let abilities: Ability[]

    beforeEach(async () => {
      jest.spyOn(abilitiesService.emitter, "emit")

      daylightAbilities = [
        createDaylightAbility({ slug: "1" }),
        createDaylightAbility({ slug: "2" }),
        createDaylightAbility({ slug: "3" }),
      ]
      abilities = normalizeDaylightAbilities(daylightAbilities, address)
    })

    afterEach(async () => {
      jest.clearAllMocks()
    })

    it("should not emit updatedAbilities if there are no abilities", async () => {
      const stub = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => [])

      await abilitiesService.pollForAbilities(address)
      expect(stub.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(0)
    })

    it("should emit updatedAbilities if there is a new abilities", async () => {
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => daylightAbilities)

      await abilitiesService.pollForAbilities(address)

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(1)
      expect(abilitiesService.emitter.emit).toBeCalledWith("updatedAbilities", {
        address,
        abilities,
      })
    })

    it("should emit updatedAbilities with updated removed ability", async () => {
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => daylightAbilities)

      await abilitiesService.pollForAbilities(address)
      daylightAbilities.splice(1, 1)
      await abilitiesService.pollForAbilities(address)

      const newAbilities = normalizeDaylightAbilities(
        daylightAbilities,
        address
      )
      const removedAbility = {
        ...abilities[1],
        removedFromUi: true,
      }
      newAbilities.push(removedAbility)

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesService.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities: sortAbilities(newAbilities),
        }
      )
    })
  })
})
