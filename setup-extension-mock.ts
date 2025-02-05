import "jest-webextension-mock"

global.chrome.runtime.id = "mocked-extension-runtime-id"

Object.assign(global.chrome, {
  ...global.chrome,
  windows: {
    ...global.chrome.windows,
    getCurrent: jest.fn(),
    create: jest.fn(),
    onRemoved: {
      ...(global.chrome.windows?.onRemoved ?? {}),
      addListener: jest.fn(),
    },
  },
  alarms: {
    ...global.chrome.alarms,
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      ...(global.chrome.alarms?.onAlarm ?? {}),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
})
