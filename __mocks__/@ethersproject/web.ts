// eslint-disable-next-line import/no-extraneous-dependencies
import sinon from "sinon"

const mock =
  jest.createMockFromModule<typeof import("@ethersproject/web")>(
    "@ethersproject/web"
  )

const actual =
  jest.requireActual<typeof import("@ethersproject/web")>("@ethersproject/web")

const fetchJson = sinon.stub()

module.exports = {
  ...mock,
  ...actual,
  fetchJson,
}
