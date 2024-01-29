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
      Promise.resolve(undefined as unknown as Tabs.Tab)
    ),
  },
  runtime: {
    ...browserMock.runtime,
    setUninstallURL: jest.fn(),
  },
}


// import { Tabs } from "webextension-polyfill";

const browserMock = jest.createMockFromModule<typeof import("webextension-polyfill")>("webextension-polyfill");

export const alarms = {
  create: jest.fn(),
  clear: jest.fn(),
  onAlarm: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

export const extension = {
  ...browserMock.extension,
  getBackgroundPage: jest.fn(),
};

export const tabs = {
  ...browserMock.tabs,
  getCurrent: jest.fn<Promise<Tabs.Tab | undefined>>(() => Promise.resolve(undefined)),
};

export const runtime = {
  ...browserMock.runtime,
  setUninstallURL: jest.fn(),
};





