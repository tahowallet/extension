import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { ledgerUSBVendorId } from "@ledgerhq/devices"
import { TransportInterfaceNotAvailable } from "@ledgerhq/errors"

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
