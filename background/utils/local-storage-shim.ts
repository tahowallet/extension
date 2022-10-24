import browser from "webextension-polyfill"

// This shim is to mimic the old localStorage api meanwhile using
// the new async api.
//
// Note: We cheat and mix sync save with async writes. The `saveLog` is async
// and is used from the sync `genericLogger`. The reasonable assumption here is
// that the write operation won't fail and we don't need to wait for it.
const localStorageShim = {
  getAllItems: async (): Promise<Record<string, unknown>> =>
    browser.storage.local.get(),
  getItem: async (key: string): Promise<string | undefined> =>
    (await browser.storage.local.get(key))[key],
  setItem: (key: string, val: unknown): Promise<void> =>
    browser.storage.local.set({ [key]: val }),
  removeItem: (keys: string): Promise<void> =>
    browser.storage.local.remove(keys),
}

export default localStorageShim
