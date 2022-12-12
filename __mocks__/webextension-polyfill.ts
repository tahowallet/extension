// eslint-disable-next-line import/no-extraneous-dependencies
import sinon from "sinon"

const mock = jest.createMockFromModule<typeof import("webextension-polyfill")>(
  "webextension-polyfill"
)

const setUninstallURL = sinon.stub()

module.exports = {
  ...mock,
  runtime: {
    ...mock.runtime,
    setUninstallURL,
  },
}
