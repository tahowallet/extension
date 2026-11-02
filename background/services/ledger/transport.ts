import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { ledgerUSBVendorId } from "@ledgerhq/devices"
import hidFraming, { type ResponseAcc } from "@ledgerhq/devices/hid-framing"
import {
  DisconnectedDeviceDuringOperation,
  TransportError,
  TransportInterfaceNotAvailable,
} from "@ledgerhq/errors"

const LEDGER_ENDPOINT_NUMBER = 3

/**
 * Keeps a misbehaving device from stalling an exchange with stale packets.
 */
export const MAX_DISCARDED_PACKETS = 64

function isDisconnectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("disconnected")
  )
}

/**
 * A TransportWebUSB that never resets the device. Since Chromium 27cf6d8e7813
 * (kWebUsbResetInvalidatesConfiguration), a reset unconfigures the device but
 * leaves `device.configuration` set. Claiming the interface then fails.
 */
class ResetlessTransportWebUSB extends TransportWebUSB {
  override async close(): Promise<void> {
    await this.exchangeBusyPromise
    await this.device.releaseInterface(this.interfaceNumber)
    await this.device.close()
  }

  /**
   * TransportWebUSB.exchange, but discards packets left on another channel by
   * a previous transport instead of failing. Without a reset on open, a
   * response left unread when the extension reloaded can still be queued.
   */
  override async exchange(apdu: Buffer): Promise<Buffer> {
    const response = await this.exchangeAtomicImpl(async () => {
      const { channel, packetSize } = this
      const framing = hidFraming(channel, packetSize)

      for (const block of framing.makeBlocks(apdu)) {
        // WebUSB's typings require a Uint8Array over a plain ArrayBuffer.
        await this.device.transferOut(
          LEDGER_ENDPOINT_NUMBER,
          new Uint8Array(block),
        )
      }

      let accumulated: ResponseAcc = null
      let result = framing.getReducedResult(accumulated)
      let discardedPackets = 0

      while (!result) {
        const { data } = await this.device.transferIn(
          LEDGER_ENDPOINT_NUMBER,
          packetSize,
        )
        const packet =
          data === undefined
            ? Buffer.alloc(0)
            : Buffer.from(data.buffer, data.byteOffset, data.byteLength)

        if (packet.length >= 2 && packet.readUInt16BE(0) !== channel) {
          discardedPackets += 1
          if (discardedPackets > MAX_DISCARDED_PACKETS) {
            throw new TransportError(
              `Discarded more than ${MAX_DISCARDED_PACKETS} packets from other channels`,
              "InvalidChannel",
            )
          }
        } else {
          accumulated = framing.reduceResponse(accumulated, packet)
          result = framing.getReducedResult(accumulated)
        }
      }

      return result
    }).catch((error: unknown) => {
      if (isDisconnectError(error)) {
        const disconnectError =
          error instanceof Error ? error : new Error(String(error))
        this._emitDisconnect(disconnectError)

        throw new DisconnectedDeviceDuringOperation(disconnectError.message)
      }

      throw error
    })

    // exchangeAtomicImpl is typed as resolving to Buffer | void.
    if (!Buffer.isBuffer(response)) {
      throw new TransportError("Ledger exchange returned no response", "")
    }

    return response
  }
}

/**
 * TransportWebUSB.openConnected without the device reset. It also leaves out
 * the library's disconnect listener; LedgerService listens for disconnects.
 */
export default async function openConnectedLedgerTransport(): Promise<TransportWebUSB | null> {
  const [device] = (await navigator.usb.getDevices()).filter(
    ({ vendorId }) => vendorId === ledgerUSBVendorId,
  )
  if (device === undefined) {
    return null
  }

  await device.open()
  if (device.configuration === null) {
    await device.selectConfiguration(1)
  }

  const ledgerInterface = device.configurations[0].interfaces.find(
    ({ alternates }) => alternates.some((a) => a.interfaceClass === 255),
  )
  if (ledgerInterface === undefined) {
    throw new TransportInterfaceNotAvailable(
      "No WebUSB interface found for your Ledger device.",
    )
  }

  try {
    await device.claimInterface(ledgerInterface.interfaceNumber)
  } catch (error) {
    await device.close()
    throw new TransportInterfaceNotAvailable(
      error instanceof Error ? error.message : String(error),
    )
  }

  return new ResetlessTransportWebUSB(device, ledgerInterface.interfaceNumber)
}
