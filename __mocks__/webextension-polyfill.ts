const browserMock = jest.createMockFromModule<
  typeof import("webextension-polyfill")
>("webextension-polyfill")

const setUninstallURL = jest.fn()

module.exports = {
  ...browserMock,
  runtime: {
    ...browserMock.runtime,
    setUninstallURL,
  },
}
