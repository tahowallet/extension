const mock = jest.createMockFromModule<typeof import("uuid")>("uuid")
const actual = jest.requireActual<typeof import("uuid")>("uuid")

const v4Spy = jest.spyOn(actual, "v4")

module.exports = {
  ...mock,
  v4: v4Spy,
}
