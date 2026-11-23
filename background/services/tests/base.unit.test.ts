import sinon from "sinon"
import browser, { type Alarms } from "webextension-polyfill"
import BaseService, { AlarmHandlerScheduleMap } from "../base"
import type { ServiceLifecycleEvents } from "../types"

// Captured before any test resets mocks; added when base.ts is imported.
const earlyListener = (
  chrome.alarms.onAlarm.addListener as unknown as {
    mock: { calls: [(alarm: Alarms.Alarm) => void][] }
  }
).mock.calls[0][0]

class TestService extends BaseService<ServiceLifecycleEvents> {
  constructor(schedules: AlarmHandlerScheduleMap) {
    super(schedules)
  }
}

describe("BaseService alarms", () => {
  const sandbox = sinon.createSandbox()
  let get: sinon.SinonStub
  let create: sinon.SinonStub
  let handler: sinon.SinonStub

  const services: TestService[] = []

  const serviceWith = (periodInMinutes: number, runAtStart = true) => {
    const service = new TestService({
      refresh: { schedule: { periodInMinutes }, handler, runAtStart },
    })
    services.push(service)
    return service
  }

  beforeEach(() => {
    get = sandbox.stub(browser.alarms, "get")
    create = sandbox.stub(browser.alarms, "create")
    handler = sandbox.stub()
  })

  afterEach(async () => {
    // Started services own their alarm names until stopped.
    await Promise.all(
      services
        .splice(0)
        .map((service) => service.stopService().catch(() => {})),
    )
    sandbox.restore()
  })

  it("leaves an existing alarm with the same period alone", async () => {
    get.resolves({ name: "refresh", scheduledTime: 0, periodInMinutes: 60 })

    await serviceWith(60).startService()

    expect(create.callCount).toBe(0)
    expect(handler.callCount).toBe(0)
  })

  it("creates a missing alarm and runs its handler at start", async () => {
    get.resolves(undefined)

    await serviceWith(60).startService()

    expect(create.calledOnceWith("refresh", { periodInMinutes: 60 })).toBe(true)
    expect(handler.callCount).toBe(1)
  })

  it("recreates an alarm whose period changed and runs its handler", async () => {
    get.resolves({ name: "refresh", scheduledTime: 0, periodInMinutes: 5 })

    await serviceWith(60).startService()

    expect(create.calledOnceWith("refresh", { periodInMinutes: 60 })).toBe(true)
    expect(handler.callCount).toBe(1)
  })

  it("doesn't run the handler of a new alarm without runAtStart", async () => {
    get.resolves(undefined)

    await serviceWith(60, false).startService()

    expect(create.callCount).toBe(1)
    expect(handler.callCount).toBe(0)
  })

  it("leaves an existing one-shot alarm alone", async () => {
    get.resolves({ name: "once", scheduledTime: 0 })

    await new TestService({
      once: { schedule: { delayInMinutes: 1 }, handler, runAtStart: true },
    }).startService()

    expect(create.callCount).toBe(0)
    expect(handler.callCount).toBe(0)
  })

  describe("alarms that fire around start", () => {
    const alarm = { name: "refresh", scheduledTime: 0, periodInMinutes: 60 }
    let addListener: sinon.SinonStub

    beforeEach(() => {
      get.resolves(alarm)
      addListener = sandbox.stub(browser.alarms.onAlarm, "addListener")
    })

    it("runs the handler once at start for an alarm fired before it", async () => {
      earlyListener(alarm)

      const service = serviceWith(60, false)
      await service.startService()
      expect(handler.callCount).toBe(1)

      // Once started, the early listener no longer records its alarms.
      earlyListener(alarm)
      expect(handler.callCount).toBe(1)
    })

    it("runs the handler once for an alarm fired after start", async () => {
      const service = serviceWith(60, false)
      await service.startService()
      expect(handler.callCount).toBe(0)

      earlyListener(alarm)
      addListener.firstCall.args[0](alarm)

      expect(handler.callCount).toBe(1)
    })

    it("logs a rejecting runAtStart handler instead of leaving it unhandled", async () => {
      get.resolves(undefined)
      handler.rejects(new Error("nope"))

      await serviceWith(60).startService()
      await new Promise((resolve) => {
        setTimeout(resolve, 1)
      })

      expect(handler.callCount).toBe(1)
    })
  })
})
