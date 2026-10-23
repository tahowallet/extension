import "jest-webextension-mock"

chrome.runtime.id = "mocked-extension-runtime-id"

Object.assign(chrome, {
  ...chrome,
  runtime: {
    ...chrome.runtime,
    setUninstallURL: jest.fn(),
  },
  windows: {
    ...chrome.windows,
    getCurrent: jest.fn(),
    create: jest.fn(),
    onRemoved: {
      ...(chrome.windows?.onRemoved ?? {}),
      addListener: jest.fn(),
    },
  },
  alarms: {
    ...chrome.alarms,
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      ...(chrome.alarms?.onAlarm ?? {}),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
})
