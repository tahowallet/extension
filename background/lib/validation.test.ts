import { jsonSchemaValidatorFor, jtdValidatorFor } from "./validation"

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

describe("jsonSchemaValidatorFor", () => {
  it("the validation fn should pass for correct data", () => {
    const schemaDataArr = [
      {
        schema: {
          type: "object",
          required: [],
          additionalProperties: {
            type: "object",
            properties: {
              last_updated_at: { type: "number" } as {
                type: "number"
                nullable: true
              },
            },
            required: ["last_updated_at"],
            additionalProperties: { type: "number", nullable: true },
            nullable: true,
          },
        },
        data: {
          ethereum: {
            usd: 3836.53,
            eur: 3297.36,
            cny: 24487,
            last_updated_at: 1634672101,
          },
          bitcoin: {
            usd: 63909,
            eur: 54928,
            cny: 407908,
            last_updated_at: 1634672139,
          },
        },
      },
    ]

    schemaDataArr.forEach((data) => {
      // @ts-expect-error find out what's the problem with the argument typing
      const validatorFn = jsonSchemaValidatorFor(data.schema)
      expect(validatorFn(data.data)).toBeTruthy()
    })
  })
  it("the validation fn should fail for incorrect data", () => {
    const schemaDataError = [
      {
        schema: {
          type: "object",
          required: [],
          additionalProperties: {
            type: "object",
            properties: {
              last_updated_at: { type: "number" } as {
                type: "number"
                nullable: true
              },
            },
            required: ["last_updated_at"] as never[],
            additionalProperties: { type: "number", nullable: true },
            nullable: true,
          },
        },
        data: {
          ethereum: {
            usd: "3836.53", // wrong type
            eur: 3297.36,
            cny: 24487,
            // last_updated_at: 1634672101, // missing required prop
          },
          bitcoin: {
            usd: 63909,
            eur: 54928,
            cny: 407908,
            last_updated_at: 1634672139,
          },
        },
        error: {
          instancePath: "/ethereum",
          schemaPath: "#/additionalProperties/required",
          keyword: "required",
          params: { missingProperty: "last_updated_at" },
          message: "must have required property 'last_updated_at'",
        },
      },
    ]

    schemaDataError.forEach((data) => {
      // @ts-expect-error find out what's the problem with the argument typing
      const validatorFn = jsonSchemaValidatorFor(data.schema)
      expect(validatorFn(data.data)).toBeFalsy()

      if (!Array.isArray(validatorFn.errors)) return
      expect(validatorFn.errors[0]).toEqual(data.error)
    })
  })
})
