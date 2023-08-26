// Fixing this here requires digging into Jest a bit, kicking for now.
// eslint-disable-next-line import/no-import-module-exports
import sinon from "sinon"

const mock =
  jest.createMockFromModule<typeof import("@ethersproject/web")>(
    "@ethersproject/web",
  )

const actual =
  jest.requireActual<typeof import("@ethersproject/web")>("@ethersproject/web")

const fetchJson = sinon.stub()

module.exports = {
  ...mock,
  ...actual,
  fetchJson,
}
