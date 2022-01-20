/*
 * Temporary, partial typing used to test `navigator.usb.requestDevice()` popup.
 * TODO: remove this file when using real implementation.
 */

interface Navigator {
  readonly usb: USB
}

declare class USB extends EventTarget {
  requestDevice(options?: USBDeviceRequestOptions): Promise<unknown>
}

interface USBDeviceRequestOptions {
  filters: unknown[]
}
