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
import { AbilitiesDatabase } from "../db"

const address =
  "0x208e94d5661a73360d9387d3ca169e5c130090cd" as NormalizedEVMAddress

const sortAbilities = (abilities: Ability[]) =>
  abilities.sort(
    (ability1, ability2) => ability1.magicOrderIndex - ability2.magicOrderIndex
  )

type AbilitiesServiceExternalized = Omit<AbilitiesService, ""> & {
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

  describe("pollForAbilities", () => {
    let daylightAbilities: DaylightAbility[]
    let abilities: Ability[]

    beforeEach(async () => {
      jest.spyOn(abilitiesService.emitter, "emit")

      daylightAbilities = [
        createDaylightAbility(),
        createDaylightAbility(),
        createDaylightAbility(),
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

    it("should emit updatedAbilities if there are new abilities", async () => {
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

    it("should emit updatedAbilities with updated ability if it has been removed", async () => {
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .onCall(0)
        .callsFake(async () => daylightAbilities)
        .onCall(1)
        .callsFake(async () => {
          // remove the last element
          daylightAbilities.pop()
          return daylightAbilities
        })

      await abilitiesService.pollForAbilities(address)
      await abilitiesService.pollForAbilities(address)

      const newAbilities = sortAbilities(
        normalizeDaylightAbilities(daylightAbilities, address)
      )
      const removedAbility = {
        ...abilities[2],
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
          abilities: newAbilities,
        }
      )
    })

    it("should emit updatedAbilities with updated ability if it has been completed", async () => {
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .onCall(0)
        .callsFake(async () => daylightAbilities)
        .onCall(1)
        .callsFake(async () => {
          // mark as completed second ability
          daylightAbilities[1] = {
            ...daylightAbilities[1],
            walletCompleted: true,
          }
          return daylightAbilities
        })

      await abilitiesService.pollForAbilities(address)
      await abilitiesService.pollForAbilities(address)

      const newAbilities = sortAbilities(
        normalizeDaylightAbilities(daylightAbilities, address)
      )

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesService.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities: newAbilities,
        }
      )
    })

    it("should emit updatedAbilities with not updated ability if it has been completed by the user", async () => {
      const abilitiesServiceExternalized =
        abilitiesService as unknown as AbilitiesServiceExternalized
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => daylightAbilities)

      await abilitiesServiceExternalized.pollForAbilities(address)
      // mark as completed ability
      await abilitiesServiceExternalized.db.markAsCompleted(
        address,
        abilities[1].abilityId
      )
      await abilitiesServiceExternalized.pollForAbilities(address)

      abilities[1] = {
        ...abilities[1],
        completed: true,
      }

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesServiceExternalized.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesServiceExternalized.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities,
        }
      )
    })

    it("should emit updatedAbilities with not updated ability if it has been removed by the user", async () => {
      const abilitiesServiceExternalized =
        abilitiesService as unknown as AbilitiesServiceExternalized
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .callsFake(async () => daylightAbilities)

      await abilitiesServiceExternalized.pollForAbilities(address)
      // mark as completed ability
      await abilitiesServiceExternalized.db.markAsRemoved(
        address,
        abilities[1].abilityId
      )
      await abilitiesServiceExternalized.pollForAbilities(address)

      abilities[1] = {
        ...abilities[1],
        removedFromUi: true,
      }

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesServiceExternalized.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesServiceExternalized.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities,
        }
      )
    })

    it("should emit updatedAbilities with changed order of abilities", async () => {
      // shuffle abilities
      const shuffledDaylightAbilities = daylightAbilities.sort(
        () => 0.5 - Math.random()
      )
      const stubGetAbilities = sandbox
        .stub(daylight, "getDaylightAbilities")
        .onCall(0)
        .callsFake(async () => daylightAbilities)
        .onCall(1)
        .callsFake(async () => {
          return shuffledDaylightAbilities
        })

      await abilitiesService.pollForAbilities(address)
      await abilitiesService.pollForAbilities(address)

      const newAbilities = sortAbilities(
        normalizeDaylightAbilities(shuffledDaylightAbilities, address)
      )

      expect(stubGetAbilities.called).toBe(true)
      expect(abilitiesService.emitter.emit).toBeCalledTimes(2)
      expect(abilitiesService.emitter.emit).toHaveBeenNthCalledWith(
        2,
        "updatedAbilities",
        {
          address,
          abilities: newAbilities,
        }
      )
    })
  })
})
