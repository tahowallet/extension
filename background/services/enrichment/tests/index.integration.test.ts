import sinon from "sinon"
import EnrichmentService from ".."
import { createEnrichmentService } from "../../../tests/factories"

describe("EnrichmentService", () => {
  const sandbox = sinon.createSandbox()
  let enrichmentService: EnrichmentService

  beforeEach(async () => {
    sandbox.restore()
    enrichmentService = await createEnrichmentService()
    await enrichmentService.startService()
  })

  it.todo("responds to ChainService transaction events")
  it.todo("emits enrichedTransaction events")
  it.todo("enriches transactions")
  it.todo("enriches basic signature requests")
  it.todo("enriches typed data signature requests")
})
