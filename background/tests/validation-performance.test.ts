import AjvJTD from "ajv/dist/jtd"
import AjvJSONSchema from "ajv"
import { jtdValidatorFor, jsonSchemaValidatorFor } from "../lib/validation"

// the ajv instance is hidden inside the validation module so it's a bit hard to test it
// if we were to make testing easier we would need to refactor the lazified ajv into their own module
// but in this particular case the win would be marginal (easier mocking) so probably not worth it
// note: this could change if we were to add extra abstraction over it or use another validation lib for any reason
jest.mock("ajv/dist/jtd")
jest.mock("ajv")

describe("lib/validation.ts performance", () => {
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
})
