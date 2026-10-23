import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { ledgerUSBVendorId } from "@ledgerhq/devices"
import hidFraming, { type ResponseAcc } from "@ledgerhq/devices/hid-framing"
import {
  DisconnectedDeviceDuringOperation,
  TransportError,
  TransportInterfaceNotAvailable,
} from "@ledgerhq/errors"

/**
 * The Ledger's WebUSB IN/OUT endpoint, as used by TransportWebUSB.
 */
const LEDGER_ENDPOINT_NUMBER = 3

/**
 * How many packets tagged with another transport's channel an exchange skips
 * before giving up, so a misbehaving device can't keep it reading forever.
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
 * A TransportWebUSB that never resets the device. The library resets the
 * Ledger when opening and closing a transport, but since Chromium's
 * "usb: Invalidate active configuration in UsbDeviceHandle upon ResetDevice"
 * (27cf6d8e7813, the kWebUsbResetInvalidatesConfiguration feature) a reset
 * drops the device's active configuration while Blink still reports it as
 * selected. selectConfiguration() is then skipped, claimInterface() fails
 * with "Unable to claim interface", and the reset's re-enumeration fires
 * another USB connect event that retries and fails the same way.
 */
class ResetlessTransportWebUSB extends TransportWebUSB {
  override async close(): Promise<void> {
    await this.exchangeBusyPromise
    await this.device.releaseInterface(this.interfaceNumber)
    await this.device.close()
  }

  /**
   * Mirrors TransportWebUSB.exchange, but skips response packets tagged with
   * a channel other than this transport's instead of failing with "Invalid
   * channel". The reset this transport no longer does used to flush the
   * device's IN endpoint; without it, a response left unread by an earlier
   * transport (say, the extension reloaded mid-exchange) can still be queued
   * ahead of this exchange's response, tagged with that transport's random
   * channel.
   */
  override async exchange(apdu: Buffer): Promise<Buffer> {
    const response = await this.exchangeAtomicImpl(async () => {
      const { channel, packetSize } = this
      const framing = hidFraming(channel, packetSize)

      for (const block of framing.makeBlocks(apdu)) {
        // Copied into a Uint8Array, which WebUSB's typings require to be
        // backed by a plain ArrayBuffer.
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

    // hw-transport 6.28 types exchangeAtomicImpl as resolving to
    // Buffer | void; it resolves to the Buffer returned above.
    if (!Buffer.isBuffer(response)) {
      throw new TransportError("Ledger exchange returned no response", "")
    }

    return response
  }
}

/**
 * Opens a transport to the first paired Ledger, if any, the way
 * TransportWebUSB.openConnected does but without resetting the device. The
 * library's per-transport USB disconnect listener is also left out;
 * LedgerService handles disconnects through its own navigator.usb listeners.
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
