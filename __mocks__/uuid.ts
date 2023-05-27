const uuidMock = jest.createMockFromModule<typeof import("uuid")>("uuid")
const v4Mock = jest
  .fn()
  .mockImplementation(() => jest.requireActual("uuid").v4())

module.exports = {
  ...uuidMock,
  v4: v4Mock,
}
