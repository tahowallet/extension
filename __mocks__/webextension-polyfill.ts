// Fixing this here requires digging into Jest a bit, kicking for now.
// eslint-disable-next-line import/no-import-module-exports
import { Tabs } from "webextension-polyfill"

const browserMock = jest.createMockFromModule<
  typeof import("webextension-polyfill")
>("webextension-polyfill")

module.exports = {
  ...browserMock,
  alarms: {
    create: () => {},
    clear: () => {},
    onAlarm: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  extension: {
    ...browserMock.extension,
    getBackgroundPage: jest.fn(),
  },
  tabs: {
    ...browserMock.tabs,
    getCurrent: jest.fn(() =>
      // getCurrent can return undefined if there is no tab, and we act accordingly
      // in the code.
      Promise.resolve(undefined as unknown as Tabs.Tab),
    ),
  },
  windows: {
    getCurrent: () => {},
    create: () => {},
    onRemoved: {
      addListener: () => {},
    },
  },
  runtime: {
    ...browserMock.runtime,
    setUninstallURL: jest.fn(),
  },
}
