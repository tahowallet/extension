import { ledgerUSBVendorId } from "@ledgerhq/devices"
import openConnectedLedgerTransport from "../transport"

const LEDGER_INTERFACE_NUMBER = 2

function fakeLedgerDevice({
  claimFails = false,
}: { claimFails?: boolean } = {}) {
  const calls: string[] = []
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
  }

  return { device, calls }
}

describe("openConnectedLedgerTransport", () => {
  const originalGetDevices = navigator.usb.getDevices

  afterEach(() => {
    navigator.usb.getDevices = originalGetDevices
  })

  function pairDevices(...devices: unknown[]) {
    navigator.usb.getDevices = async () => devices as USBDevice[]
  }

  it("returns null when no Ledger is paired", async () => {
    pairDevices({ vendorId: 0x1234 })

    expect(await openConnectedLedgerTransport()).toBeNull()
  })

  it("claims the Ledger's vendor interface without resetting", async () => {
    const { device, calls } = fakeLedgerDevice()
    pairDevices({ vendorId: 0x1234 }, device)

    const transport = await openConnectedLedgerTransport()

    expect(transport?.device).toBe(device as unknown as USBDevice)
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

    await expect(openConnectedLedgerTransport()).rejects.toMatchObject({
      name: "TransportInterfaceNotAvailable",
      message: "Unable to claim interface.",
    })
    expect(calls).not.toContain("reset")
    expect(calls.at(-1)).toBe("close")
  })
})
