import { jtdValidatorFor } from "./validation"

describe("lazy-compiled/cacheing works as intended", () => {
  it("should return the validationFn that belongs to the schema", () => {
    const schemaResponseArr = [
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
          transfers: {
            elements: "The Fifth",
          },
        },
      },
    ]

    const validatorFn0 = jtdValidatorFor(schemaResponseArr[0].schema)
    const validatorFn1 = jtdValidatorFor(schemaResponseArr[1].schema)

    expect(validatorFn0(schemaResponseArr[0].data)).toBeTruthy()
    expect(validatorFn1(schemaResponseArr[1].data)).toBeTruthy()
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
