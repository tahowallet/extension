import { useFakeTimers, type SinonFakeTimers } from "sinon"
import { ledgerUSBVendorId } from "@ledgerhq/devices"
import hidFraming, { type ResponseAcc } from "@ledgerhq/devices/hid-framing"
import LedgerService, {
  READINESS_POLL_DURATION_MS,
  READINESS_POLL_FAST_INTERVAL_MS,
} from ".."
import { getOrCreateDB } from "../db"
import { ETHEREUM } from "../../../constants"

const PACKET_SIZE = 64
const NANO_X_PRODUCT_ID = 0x4011
const LEDGER_ADDRESS = "0x1111111111111111111111111111111111111111"

const GET_APP_NAME = "b001"
const GET_ADDRESS = "e002"
const GET_APP_CONFIGURATION = "e006"
const SIGN_PERSONAL_MESSAGE = "e008"

function statusWord(code: number): Buffer {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16BE(code)
  return buffer
}

function lengthPrefixed(value: string): Buffer {
  return Buffer.concat([Buffer.from([value.length]), Buffer.from(value)])
}

/**
 * A paired Nano X behind WebUSB. It decodes the APDUs the transport sends
 * and answers the few the service uses, based on whether it's locked and
 * which app is open, like the real device.
 */
function fakeLedger() {
  const state = { locked: true, app: "BOLOS" }
  /** The command (CLA and INS, in hex) of each APDU received, in order. */
  const commands: string[] = []
  const usbCalls: string[] = []
  let inFlight = 0
  let maxInFlight = 0
  let held: Promise<void> = Promise.resolve()

  let request: ResponseAcc = null
  let pendingResponse: Promise<Buffer[]> | undefined
  let queuedPackets: Buffer[] = []

  function respond(apdu: Buffer): Buffer {
    const command = apdu.subarray(0, 2).toString("hex")
    if (state.locked) {
      return statusWord(0x5515)
    }
    if (command === GET_APP_NAME) {
      return Buffer.concat([
        Buffer.from([0x01]),
        lengthPrefixed(state.app),
        lengthPrefixed("1.10.3"),
        Buffer.from([0x01, 0x00]),
        statusWord(0x9000),
      ])
    }
    if (state.app !== "Ethereum") {
      return statusWord(0x6e00)
    }
    switch (command) {
      case GET_ADDRESS:
        return Buffer.concat([
          Buffer.from([65, 0x04]),
          Buffer.alloc(64, 0x01),
          lengthPrefixed(LEDGER_ADDRESS.slice(2)),
          statusWord(0x9000),
        ])
      case GET_APP_CONFIGURATION:
        return Buffer.from([0x01, 1, 10, 3, 0x90, 0x00])
      case SIGN_PERSONAL_MESSAGE:
        return Buffer.concat([
          Buffer.from([27]),
          Buffer.alloc(32, 0x11),
          Buffer.alloc(32, 0x22),
          statusWord(0x9000),
        ])
      default:
        return statusWord(0x6d00)
    }
  }

  const device = {
    vendorId: ledgerUSBVendorId,
    productId: NANO_X_PRODUCT_ID,
    configuration: null as unknown,
    configurations: [
      {
        interfaces: [
          { interfaceNumber: 2, alternates: [{ interfaceClass: 255 }] },
        ],
      },
    ],
    open: async () => {
      usbCalls.push("open")
    },
    selectConfiguration: async () => {
      device.configuration = device.configurations[0]
    },
    claimInterface: async () => {
      usbCalls.push("claimInterface")
    },
    releaseInterface: async () => {
      usbCalls.push("releaseInterface")
    },
    close: async () => {
      usbCalls.push("close")
    },
    transferOut: async (_endpoint: number, data: Uint8Array) => {
      const packet = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
      const framing = hidFraming(packet.readUInt16BE(0), PACKET_SIZE)
      // Requests use the same framing as responses.
      request = framing.reduceResponse(request, packet)
      const apdu = framing.getReducedResult(request)
      if (apdu) {
        request = null
        commands.push(apdu.subarray(0, 2).toString("hex"))
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        pendingResponse = held.then(() => framing.makeBlocks(respond(apdu)))
      }
      return { bytesWritten: data.byteLength, status: "ok" }
    },
    transferIn: async () => {
      if (queuedPackets.length === 0 && pendingResponse !== undefined) {
        queuedPackets = await pendingResponse
        pendingResponse = undefined
      }
      const packet = queuedPackets.shift()
      if (packet === undefined) {
        throw new Error("Nothing to read")
      }
      if (queuedPackets.length === 0) {
        inFlight -= 1
      }
      return {
        data: new DataView(packet.buffer, packet.byteOffset, packet.byteLength),
        status: "ok",
      }
    },
  }

  return {
    device,
    state,
    commands,
    usbCalls,
    maxInFlight: () => maxInFlight,
    /** Holds the device's responses until the returned function is called. */
    holdResponses: () => {
      let release = () => {}
      held = new Promise((resolve) => {
        release = resolve
      })
      return release
    },
  }
}

function appNamePolls(commands: string[]): number {
  return commands.filter((command) => command === GET_APP_NAME).length
}

describe("LedgerService readiness polling", () => {
  let clock: SinonFakeTimers
  let ledgerService: LedgerService
  let ledger: ReturnType<typeof fakeLedger>
  let emitted: { name: string; data: unknown }[]
  const originalGetDevices: unknown = Reflect.get(navigator.usb, "getDevices")

  beforeEach(async () => {
    ledger = fakeLedger()
    Reflect.set(navigator.usb, "getDevices", async () => [])

    ledgerService = await LedgerService.create()
    // Captured per test, so a late event from an earlier test's service
    // can't land here.
    const events: typeof emitted = []
    emitted = events
    const names = ["connected", "disconnected", "ledgerAdded"] as const
    names.forEach((name) =>
      ledgerService.emitter.on(name, (data) => {
        events.push({ name, data })
      }),
    )
    await ledgerService.startService()

    Reflect.set(navigator.usb, "getDevices", async () => [ledger.device])
    clock = useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "Date"],
    })
  })

  afterEach(async () => {
    await clock.tickAsync(0)
    clock.restore()
    await ledgerService.stopService()
    Reflect.set(navigator.usb, "getDevices", originalGetDevices)
  })

  function emittedNames() {
    return emitted.map(({ name }) => name)
  }

  it("polls a locked Ledger and connects once it's ready", async () => {
    await ledgerService.onConnection(NANO_X_PRODUCT_ID)
    await clock.tickAsync(READINESS_POLL_FAST_INTERVAL_MS)

    expect(appNamePolls(ledger.commands)).toBe(2)
    expect(emittedNames()).toEqual([])
    expect(ledger.usbCalls).not.toContain("close")

    ledger.state.locked = false
    ledger.state.app = "Ethereum"
    await clock.tickAsync(READINESS_POLL_FAST_INTERVAL_MS)

    expect(emittedNames().filter((name) => name === "connected")).toEqual([
      "connected",
    ])

    const commandCount = ledger.commands.length
    await clock.tickAsync(READINESS_POLL_DURATION_MS)

    expect(ledger.commands).toHaveLength(commandCount)
    expect(emittedNames().filter((name) => name === "connected")).toHaveLength(
      1,
    )
  })

  it("keeps polling while the Ledger is on another app", async () => {
    ledger.state.locked = false
    ledger.state.app = "Bitcoin"
    await ledgerService.onConnection(NANO_X_PRODUCT_ID)
    await clock.tickAsync(READINESS_POLL_FAST_INTERVAL_MS * 3)

    expect(appNamePolls(ledger.commands)).toBe(4)
    expect(emittedNames()).toEqual([])

    ledger.state.app = "Ethereum"
    await clock.tickAsync(READINESS_POLL_FAST_INTERVAL_MS)

    expect(emittedNames()).toContain("connected")
  })

  it("stops polling when the Ledger is unplugged", async () => {
    await ledgerService.onConnection(NANO_X_PRODUCT_ID)
    await clock.tickAsync(READINESS_POLL_FAST_INTERVAL_MS)

    navigator.usb.dispatchEvent(
      Object.assign(new Event("disconnect"), { device: ledger.device }),
    )
    await clock.tickAsync(0)

    expect(ledger.usbCalls.slice(-2)).toEqual(["releaseInterface", "close"])
    const polls = appNamePolls(ledger.commands)

    await clock.tickAsync(READINESS_POLL_DURATION_MS)

    expect(appNamePolls(ledger.commands)).toBe(polls)
    expect(emittedNames()).toEqual([])
  })

  it("closes the transport quietly at the deadline", async () => {
    await ledgerService.onConnection(NANO_X_PRODUCT_ID)
    await clock.tickAsync(READINESS_POLL_DURATION_MS - 1)

    expect(ledger.usbCalls).not.toContain("close")

    await clock.tickAsync(1)

    expect(ledger.usbCalls.slice(-2)).toEqual(["releaseInterface", "close"])
    // Every second for 30s, then every 3s until 120s.
    expect(appNamePolls(ledger.commands)).toBe(31 + 30)

    await clock.tickAsync(READINESS_POLL_DURATION_MS)

    expect(appNamePolls(ledger.commands)).toBe(31 + 30)
    expect(emittedNames()).toEqual([])
  })

  it("extends polling on a refresh instead of starting another poller", async () => {
    await ledgerService.onConnection(NANO_X_PRODUCT_ID)
    await clock.tickAsync(100_000)

    expect(await ledgerService.refreshConnectedLedger()).toBeNull()
    const polls = appNamePolls(ledger.commands)

    // Back to polling every second, and only once a second.
    await clock.tickAsync(10 * READINESS_POLL_FAST_INTERVAL_MS)
    expect(appNamePolls(ledger.commands)).toBe(polls + 10)

    // The deadline is now 120s after the refresh, not the plug-in.
    await clock.tickAsync(READINESS_POLL_DURATION_MS - 10_000 - 1)
    expect(ledger.usbCalls.at(-1)).toBe("claimInterface")

    await clock.tickAsync(1)
    expect(ledger.usbCalls.at(-1)).toBe("close")
    expect(emittedNames()).toEqual([])
  })

  it("reports a connected Ledger that's no longer ready as disconnected, then reconnects", async () => {
    ledger.state.locked = false
    ledger.state.app = "Ethereum"
    await ledgerService.onConnection(NANO_X_PRODUCT_ID)
    expect(emittedNames()).toContain("connected")
    emitted.length = 0

    ledger.state.app = "BOLOS"
    await ledgerService.refreshConnectedLedger()
    expect(emittedNames()).toEqual(["disconnected"])

    ledger.state.app = "Ethereum"
    await clock.tickAsync(READINESS_POLL_FAST_INTERVAL_MS)
    expect(emittedNames()).toEqual(["disconnected", "connected"])
  })

  it("serializes polls with signing", async () => {
    const db = await getOrCreateDB()
    await db.addAccount({
      ledgerId: "unused",
      path: "44'/60'/0'/0/0",
      address: LEDGER_ADDRESS,
    })

    await ledgerService.onConnection(NANO_X_PRODUCT_ID)
    ledger.commands.length = 0

    // Hold the next poll's response, and make the Ledger ready meanwhile.
    const release = ledger.holdResponses()
    await clock.tickAsync(READINESS_POLL_FAST_INTERVAL_MS)
    expect(ledger.commands).toEqual([GET_APP_NAME])
    ledger.state.locked = false
    ledger.state.app = "Ethereum"

    const signature = ledgerService.signMessage(
      { address: LEDGER_ADDRESS, network: ETHEREUM },
      "0x1234",
    )
    await clock.tickAsync(0)
    // Signing waits for the poll.
    expect(ledger.commands).toEqual([GET_APP_NAME])

    release()

    expect(await signature).toMatch(/^0x(11){32}(22){32}1b$/)
    expect(ledger.commands).toEqual([
      // The poll, which finds the Ethereum app and connects.
      GET_APP_NAME,
      GET_ADDRESS,
      GET_APP_CONFIGURATION,
      // The pre-signing check, then the signature.
      GET_APP_NAME,
      SIGN_PERSONAL_MESSAGE,
    ])
    expect(ledger.maxInFlight()).toBe(1)
  })

  it("refuses to sign once the Ethereum app has been closed", async () => {
    const db = await getOrCreateDB()
    await db.addAccount({
      ledgerId: "unused",
      path: "44'/60'/0'/0/0",
      address: LEDGER_ADDRESS,
    })
    ledger.state.locked = false
    ledger.state.app = "Ethereum"
    await ledgerService.onConnection(NANO_X_PRODUCT_ID)
    expect(emittedNames()).toContain("connected")

    ledger.state.app = "BOLOS"
    const error = await ledgerService
      .signMessage({ address: LEDGER_ADDRESS, network: ETHEREUM }, "0x1234")
      .catch((caught: unknown) => caught)

    expect(error).toMatchObject({
      message: expect.stringContaining("Ethereum app"),
    })
    expect(ledger.commands).not.toContain(SIGN_PERSONAL_MESSAGE)
  })
})
