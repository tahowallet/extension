import AjvJTD from "ajv/dist/jtd"
import AjvJSONSchema from "ajv"
import { jtdValidatorFor, jsonSchemaValidatorFor } from "../lib/validation"

// this could be done in validation.ts without mocking the whole ajv module
// but I think it worth to keep it like this here for showcasing this pattern
// for mocking full node modules and wrinting tests agains them
jest.mock("ajv/dist/jtd")
jest.mock("ajv")

beforeEach(() => {
  // @ts-expect-error ts does not know about jest.mock
  AjvJTD.mockClear()
  // @ts-expect-error ts does not know about jest.mock
  AjvJSONSchema.mockClear()
})
describe("ajv should be instantiated only on actual validation call", () => {
  it("AjvJTD", () => {
    const jtdSchema = {
      hello: { type: "string" },
    }
    expect(AjvJTD).not.toHaveBeenCalled()

    const jtdValidatorFn = jtdValidatorFor(jtdSchema)

    expect(AjvJTD).not.toHaveBeenCalled()

    jtdValidatorFn({ hello: "world" })

    expect(AjvJTD).toHaveBeenCalled()
  })
  it("AjvJSONSchema", () => {
    const jsonScheama = {
      type: "object",
      required: ["hello"],
      properties: {
        hello: { type: "string" },
      },
    }
    expect(AjvJSONSchema).not.toHaveBeenCalled()

    // @ts-expect-error asdf asdf a
    const jsonValidatorFn = jsonSchemaValidatorFor(jsonScheama)

    expect(AjvJSONSchema).not.toHaveBeenCalled()

    jsonValidatorFn({ hello: "johny" })

    expect(AjvJSONSchema).toHaveBeenCalled()
  })
})
// it("validatorFn should be compiled only once per schema", () => {
//   const jtdSchema = {
//     hello: { type: "string" },
//   }
//   const validator1 = jtdValidatorFor(jtdSchema)
//   const validator2 = jtdValidatorFor(jtdSchema)

//   validator1({ hello: "world" })
//   validator2({ hello: "world" })

//   expect(AjvJTD).toHaveBeenCalledTimes(2)
//   //   it("should not compile validation fn beforehand", () => {})
//   //   it("should not instantiate Ajv before the first getValidatorFn() call is made", () => {})
// })
