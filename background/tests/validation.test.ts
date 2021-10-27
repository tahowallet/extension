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
      ] as Array<Array<{ [k: string]: unknown }>>

      it.each(schemaDataArr)("%#", ({ schema, data }) => {
        const validatorFn = jtdValidatorFor(schema)
        try {
          expect(validatorFn(data)).toBeTruthy()
        } catch (e) {
          console.log("schema: ", JSON.stringify(schema, null, 2))
          console.log("data: ", JSON.stringify(data, null, 2))
          console.log("validator error: ", validatorFn.errors)
          throw e
        }
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
            error: {
              instancePath: "/ethereum/last_updated_at",
              schemaPath: "/values/properties/last_updated_at/type",
              keyword: "type",
              params: { type: "uint32", nullable: false },
              message: "must be uint32",
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
              transfers: "this should be an array of strings but it's not",
            },
            error: {
              instancePath: "/transfers",
              schemaPath: "/properties/transfers/elements",
              keyword: "elements",
              params: { type: "array", nullable: false },
              message: "must be array",
            },
          },
        ],
      ] as Array<Array<{ [k: string]: unknown }>>

      it.each(schemaDataError)("%#", ({ schema, data, error }) => {
        const validatorFn = jtdValidatorFor(schema)

        try {
          expect(validatorFn(data)).toBeFalsy()

          if (!Array.isArray(validatorFn.errors)) return
          expect(validatorFn.errors[0]).toEqual(error)
        } catch (e) {
          console.log("schema: ", JSON.stringify(schema, null, 2))
          console.log("data: ", JSON.stringify(data, null, 2))
          console.log(
            "expected validator error: ",
            JSON.stringify(error, null, 2)
          )
          console.log("validator error: ", validatorFn.errors)
          throw e
        }
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
              required: [] as any,
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
        ],
      ]

      it.each(schemaDataArr)("%#", ({ schema, data }) => {
        // @ts-expect-error find out what's the problem with the argument typing
        const validatorFn = jsonSchemaValidatorFor(schema)

        try {
          expect(validatorFn(data)).toBeTruthy()
        } catch (e) {
          console.log("schema: ", JSON.stringify(schema, null, 2))
          console.log("data: ", JSON.stringify(data, null, 2))
          console.log("validator error: ", validatorFn.errors)
          throw e
        }
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
            error: {
              instancePath: "/ethereum",
              schemaPath: "#/additionalProperties/required",
              keyword: "required",
              params: { missingProperty: "last_updated_at" },
              message: "must have required property 'last_updated_at'",
            },
          },
        ],
      ]

      it.each(schemaDataError)("%#", ({ schema, data, error }) => {
        // @ts-expect-error find out what's the problem with the argument typing
        const validatorFn = jsonSchemaValidatorFor(schema)

        try {
          expect(validatorFn(data)).toBeFalsy()

          if (!Array.isArray(validatorFn.errors)) return
          expect(validatorFn.errors[0]).toEqual(error)
        } catch (e) {
          console.log("schema: ", JSON.stringify(schema, null, 2))
          console.log("data: ", JSON.stringify(data, null, 2))
          console.log(
            "expected validator error: ",
            JSON.stringify(error, null, 2)
          )
          console.log("validator error: ", validatorFn.errors)
          throw e
        }
      })
    })
  })
})
