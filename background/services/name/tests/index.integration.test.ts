import sinon from "sinon"
import NameService from ".."
import { ETHEREUM } from "../../../constants"
import { createNameService } from "../../../tests/factories"

describe("NameService", () => {
  const sandbox = sinon.createSandbox()
  let nameService: NameService

  beforeEach(async () => {
    sandbox.restore()
    nameService = await createNameService()
    await nameService.startService()
  })

  afterEach(async () => {
    await nameService.stopService()
  })

  it("Looks up and returns names from built-in contracts", async () => {
    sandbox.stub(nameService, "lookUpAvatar").callsFake(async () => undefined)
    const nameRecord = await nameService.lookUpName({
      address: "0x52ec2f3d7c5977a8e558c8d9c6000b615098e8fc",
      network: ETHEREUM,
    })
    expect(nameRecord).toBeDefined()
    if (nameRecord !== undefined) {
      expect(nameRecord.resolved.nameOnNetwork.name).toContain(
        "Optimism Teleportr",
      )
      expect(nameRecord.system).toEqual("tally-known-contracts")
    }
  })
  it.todo("Doesn't use ENS or UNS to resolve built-in contracts")
  it.todo("Looks up and returns names from the address book")
  it.todo("Caches names by normalized address network")
  it.todo("Resolves the same address for ENS names, regardless of network")
  it.todo("Resolves the same address for UNS names, regardless of network")
})
