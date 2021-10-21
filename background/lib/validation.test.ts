import { jtdValidatorFor } from "./validation"

describe("jtdValidatorFor", () => {
  it("the validation fn should pass for correct data", () => {
    const schemaDataArr = [
      {
        schema: {
          values: {
            properties: {
              last_updated_at: { type: "uint32" },
            },
            additionalProperties: true,
          },
        } as const,
        data: {
          ethereum: {
            usd: 3832.26,
            last_updated_at: 1634671650,
          },
        },
      },
      {
        schema: {
          properties: {
            transfers: {
              elements: { type: "string" },
            },
          },
        } as const,
        data: {
          transfers: ["The Fifth"],
        },
      },
    ]

    schemaDataArr.forEach((data) => {
      const validatorFn = jtdValidatorFor(data.schema)
      expect(validatorFn(data.data)).toBeTruthy()
    })
  })
  it("the validation fn should fail for incorrect data", () => {
    const schemaDataError = [
      {
        schema: {
          values: {
            properties: {
              last_updated_at: { type: "uint32" },
            },
            additionalProperties: true,
          },
        } as const,
        data: {
          ethereum: {
            usd: 3832.26,
            last_updated_at: "this should be uint32 but it's not",
          },
        },
        error: {
          instancePath: "/ethereum/last_updated_at",
          schemaPath: "/values/properties/last_updated_at/type",
          keyword: "type",
          params: { type: "uint32", nullable: false },
          message: "must be uint32",
        },
      },
      {
        schema: {
          properties: {
            transfers: {
              elements: { type: "string" },
            },
          },
        } as const,
        data: {
          transfers: "this shoud be an array of strings but it's not",
        },
        error: {
          instancePath: "/transfers",
          schemaPath: "/properties/transfers/elements",
          keyword: "elements",
          params: { type: "array", nullable: false },
          message: "must be array",
        },
      },
    ]

    schemaDataError.forEach((data) => {
      const validatorFn = jtdValidatorFor(data.schema)
      expect(validatorFn(data.data)).toBeFalsy()

      if (!Array.isArray(validatorFn.errors)) return
      expect(validatorFn.errors[0]).toEqual(data.error)
    })
  })
})

// describe("getValidatiorFn() should return a validation fn that works as expected", () => {
//   it("should work with JTD schema", () => {})
//   it("should work with JSON schema", () => {})
// })
// describe("performance optimization", () => {
//   it("should generate validation Fn only on first call then return it from cache", () => {})
//   it("should not compile validation fn beforehand", () => {})
//   it("should not instantiate Ajv before the first getValidatorFn() call is made", () => {})
// })
