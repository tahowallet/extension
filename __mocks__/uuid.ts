const uuidMock = jest.createMockFromModule<typeof import("uuid")>("uuid")
const uuidActual = jest.requireActual<typeof import("uuid")>("uuid")

const v4Spy = jest.spyOn(uuidActual, "v4")

module.exports = {
  ...uuidMock,
  v4: v4Spy,
}
