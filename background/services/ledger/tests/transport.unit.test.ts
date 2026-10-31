import { ledgerUSBVendorId } from "@ledgerhq/devices"
import hidFraming from "@ledgerhq/devices/hid-framing"
import openConnectedLedgerTransport, {
  MAX_DISCARDED_PACKETS,
} from "../transport"

const LEDGER_INTERFACE_NUMBER = 2
const PACKET_SIZE = 64

function fakeLedgerDevice({
  claimFails = false,
}: { claimFails?: boolean } = {}) {
  const calls: string[] = []
  const inPackets: Buffer[] = []
  const device = {
    vendorId: ledgerUSBVendorId,
    productId: 0x4011,
    configuration: null as unknown,
    configurations: [
      {
        interfaces: [
          { interfaceNumber: 0, alternates: [{ interfaceClass: 3 }] },
          {
            interfaceNumber: LEDGER_INTERFACE_NUMBER,
            alternates: [{ interfaceClass: 255 }],
          },
        ],
      },
    ],
    open: async () => {
      calls.push("open")
    },
    selectConfiguration: async (value: number) => {
      calls.push(`selectConfiguration:${value}`)
      device.configuration = device.configurations[0]
    },
    reset: async () => {
      calls.push("reset")
    },
    claimInterface: async (interfaceNumber: number) => {
      calls.push(`claimInterface:${interfaceNumber}`)
      if (claimFails) {
        throw new Error("Unable to claim interface.")
      }
    },
    releaseInterface: async (interfaceNumber: number) => {
      calls.push(`releaseInterface:${interfaceNumber}`)
    },
    close: async () => {
      calls.push("close")
    },
    transferOut: async (endpointNumber: number, data: BufferSource) => ({
      bytesWritten: data.byteLength,
      status: "ok",
    }),
    transferIn: async () => {
      const packet = inPackets.shift()
      if (packet === undefined) {
        throw new Error("No more packets queued")
      }
      return {
        data: new DataView(packet.buffer, packet.byteOffset, packet.byteLength),
        status: "ok",
      }
    },
  }

  return { device, calls, inPackets }
}

/**
 * Ledger responses use the same HID framing as requests.
 */
function framedResponse(channel: number, response: Buffer): Buffer[] {
  return hidFraming(channel, PACKET_SIZE).makeBlocks(response)
}

describe("openConnectedLedgerTransport", () => {
  const originalUSB = navigator.usb

  afterEach(() => {
    Reflect.set(navigator, "usb", originalUSB)
  })

  function pairDevices(...devices: unknown[]) {
    Reflect.set(navigator, "usb", { getDevices: async () => devices })
  }

  it("returns null when no Ledger is paired", async () => {
    pairDevices({ vendorId: 0x1234 })

    expect(await openConnectedLedgerTransport()).toBeNull()
  })

  it("claims the Ledger's vendor interface without resetting", async () => {
    const { device, calls } = fakeLedgerDevice()
    pairDevices({ vendorId: 0x1234 }, device)

    const transport = await openConnectedLedgerTransport()

    const openedDevice: unknown = transport?.device
    expect(openedDevice).toBe(device)
    expect(transport?.interfaceNumber).toBe(LEDGER_INTERFACE_NUMBER)
    expect(calls).toEqual([
      "open",
      "selectConfiguration:1",
      `claimInterface:${LEDGER_INTERFACE_NUMBER}`,
    ])
  })

  it("closes without resetting", async () => {
    const { device, calls } = fakeLedgerDevice()
    pairDevices(device)

    const transport = await openConnectedLedgerTransport()
    calls.length = 0
    await transport?.close()

    expect(calls).toEqual([
      `releaseInterface:${LEDGER_INTERFACE_NUMBER}`,
      "close",
    ])
  })

  it("closes the device and rethrows when the interface can't be claimed", async () => {
    const { device, calls } = fakeLedgerDevice({ claimFails: true })
    pairDevices(device)

    const error = await openConnectedLedgerTransport().catch(
      (caught: unknown) => caught,
    )

    expect(error).toMatchObject({
      name: "TransportInterfaceNotAvailable",
      message: "Unable to claim interface.",
    })
    expect(calls).not.toContain("reset")
    expect(calls.at(-1)).toBe("close")
  })

  describe("exchange", () => {
    const appNameResponse = Buffer.from("0108457468657265756d9000", "hex")
    // Longer than one packet.
    const longResponse = Buffer.concat([
      Buffer.alloc(150, 0xab),
      Buffer.from("9000", "hex"),
    ])

    async function openWithChannel(channel: number) {
      const { device, inPackets } = fakeLedgerDevice()
      pairDevices(device)

      const transport = await openConnectedLedgerTransport()
      if (transport === null) {
        throw new Error("Expected a transport")
      }
      transport.channel = channel

      return { transport, device, inPackets }
    }

    it("skips stale packets from another channel and returns the response", async () => {
      const { transport, inPackets } = await openWithChannel(0x1234)
      inPackets.push(
        ...framedResponse(0xbeef, longResponse),
        ...framedResponse(0x1234, appNameResponse),
      )

      const response = await transport.send(0xb0, 0x01, 0x00, 0x00)

      expect(response.toString("hex")).toBe(appNameResponse.toString("hex"))
      expect(inPackets).toHaveLength(0)
    })

    it("reassembles a multi-packet response after stale packets", async () => {
      const { transport, inPackets } = await openWithChannel(0x1234)
      inPackets.push(
        ...framedResponse(0xbeef, appNameResponse),
        ...framedResponse(0x1234, longResponse),
      )

      const response = await transport.exchange(Buffer.from("e0010000", "hex"))

      expect(response.toString("hex")).toBe(longResponse.toString("hex"))
    })

    it(`fails after discarding more than ${MAX_DISCARDED_PACKETS} stale packets`, async () => {
      const { transport, inPackets } = await openWithChannel(0x1234)
      for (let i = 0; i <= MAX_DISCARDED_PACKETS; i += 1) {
        inPackets.push(...framedResponse(0xbeef, appNameResponse))
      }
      inPackets.push(...framedResponse(0x1234, appNameResponse))

      const error = await transport
        .exchange(Buffer.from("b0010000", "hex"))
        .catch((caught: unknown) => caught)

      expect(error).toMatchObject({ id: "InvalidChannel" })
      // The real response is never reached.
      expect(inPackets).toHaveLength(1)
    })

    it("reports a device disconnected mid-exchange", async () => {
      const { transport, device } = await openWithChannel(0x1234)
      device.transferIn = async () => {
        throw new Error("The device was disconnected.")
      }
      const disconnects: unknown[] = []
      transport.on("disconnect", (error: unknown) => disconnects.push(error))

      const error = await transport
        .exchange(Buffer.from("b0010000", "hex"))
        .catch((caught: unknown) => caught)

      expect(error).toMatchObject({ name: "DisconnectedDeviceDuringOperation" })
      expect(disconnects).toHaveLength(1)
    })
  })
})
