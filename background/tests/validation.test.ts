import { JSONSchemaType } from "ajv"
import { jsonSchemaValidatorFor, jtdValidatorFor } from "../lib/validation"

describe("lib/validation.ts", () => {
  describe("jtdValidatorFor", () => {
    describe("the validation fn should pass for correct data", () => {
      const schemaDataArr = [
        [
          {
            schema: {
              values: {
                properties: {
                  last_updated_at: { type: "uint32" },
                },
                additionalProperties: true,
              },
            },
            data: {
              ethereum: {
                usd: 3832.26,
                last_updated_at: 1634671650,
              },
            },
          },
        ],
        [
          {
            schema: {
              properties: {
                transfers: {
                  elements: { type: "string" },
                },
              },
            },
            data: {
              transfers: ["The Fifth"],
            },
          },
        ],
      ] as const

      it.each(schemaDataArr)("%#", ({ schema, data }) => {
        const validatorFn = jtdValidatorFor(schema)
        const validationResult = validatorFn(data)
        expect(validatorFn.errors).toBeNull()
        expect(validationResult).toBeTruthy()
      })
    })
    describe("the validation fn should fail for incorrect data", () => {
      const schemaDataError = [
        [
          {
            schema: {
              values: {
                properties: {
                  last_updated_at: { type: "uint32" },
                },
                additionalProperties: true,
              },
            },
            data: {
              ethereum: {
                usd: 3832.26,
                last_updated_at: "this should be uint32 but it's not",
              },
            },
            error: [
              {
                instancePath: "/ethereum/last_updated_at",
                schemaPath: "/values/properties/last_updated_at/type",
                keyword: "type",
                params: { type: "uint32", nullable: false },
                message: "must be uint32",
              },
            ],
          },
        ],
        [
          {
            schema: {
              properties: {
                transfers: {
                  elements: { type: "string" },
                },
              },
            },
            data: {
              transfers: "this should be an array of strings but it's not",
            },
            error: [
              {
                instancePath: "/transfers",
                schemaPath: "/properties/transfers/elements",
                keyword: "elements",
                params: { type: "array", nullable: false },
                message: "must be array",
              },
            ],
          },
        ],
      ] as const

      it.each(schemaDataError)("%#", ({ schema, data, error }) => {
        const validatorFn = jtdValidatorFor(schema)
        const validationResult = validatorFn(data)

        expect(validatorFn.errors).toMatchObject(error)
        expect(validationResult).toBeFalsy()
      })
    })
  })

  describe("jsonSchemaValidatorFor", () => {
    describe("the validation fn should pass for correct data", () => {
      const schemaDataArr = [
        [
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
        ],
      ] as const

      it.each(schemaDataArr)("%#", ({ schema, data }) => {
        const validatorFn = jsonSchemaValidatorFor<{
          [coin: string]: { [curr: string]: number }
        }>(schema)
        const validationResult = validatorFn(data)

        expect(validatorFn.errors).toBeNull()
        expect(validationResult).toBeTruthy()
      })
    })
    describe("the validation fn should fail for incorrect data", () => {
      const schemaDataError = [
        [
          {
            schema: {
              type: "object",
              required: [] as any,
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
            error: [
              {
                instancePath: "/ethereum",
                schemaPath: "#/additionalProperties/required",
                keyword: "required",
                params: { missingProperty: "last_updated_at" },
                message: "must have required property 'last_updated_at'",
              },
            ],
          },
        ],
      ] as const

      it.each(schemaDataError)("%#", ({ schema, data, error }) => {
        const validatorFn = jsonSchemaValidatorFor<{
          [curr: string]: { [coin: string]: number }
        }>(schema)
        const validationResult = validatorFn(data)

        expect(validatorFn.errors).toMatchObject(error)
        expect(validationResult).toBeFalsy()
      })
    })
    describe("the validation fn should not be affected by a previous test results", () => {
      const schema: JSONSchemaType<{
        [curr: string]: { [coin: string]: number }
      }> = {
        type: "object",
        required: [] as any,
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
      }
      const dataError = [
        {
          type: "schema pass",
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
          error: null,
        },
        {
          type: "data has multiple errors but schema produces only a single error",
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
          error: [
            {
              instancePath: "/ethereum",
              schemaPath: "#/additionalProperties/required",
              keyword: "required",
              params: { missingProperty: "last_updated_at" },
              message: "must have required property 'last_updated_at'",
            },
          ],
        },
      ] as const

      const validatorFn = jsonSchemaValidatorFor(schema)
      it.each(dataError)("$type", ({ data, error }) => {
        validatorFn(data)

        if (error !== null) {
          expect(validatorFn.errors).toMatchObject(error)
        } else {
          expect(validatorFn.errors).toBeNull()
        }
      })
    })
  })
})
