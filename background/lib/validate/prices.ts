import { JSONSchemaType } from "ajv"

// Ajv's typing incorrectly requires nullable: true for last_updated_at because
// the remaining keys in the coin entry are optional. This in turn interferes
// with the fact that last_updated_at is listed in `required`. The two `as`
// type casts below trick the type system into allowing the schema correctly.
// Note that the schema will validate as required, and the casts allow it to
// match the corret TypeScript types.
//
// This all stems from Ajv also incorrectly requiring an optional property (`|
// undefined`) to be nullable (`| null`). See
// https://github.com/ajv-validator/ajv/issues/1664, which should be fixed in
// Ajv v9 via
// https://github.com/ajv-validator/ajv/commit/b4b806fd03a9906e9126ad86cef233fa405c9a3e
export const coingeckoPriceSchema: JSONSchemaType<CoingeckoPriceData> = {
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
} as const

export type CoingeckoPriceData = {
  [coinId: string]:
    | {
        last_updated_at: number
        [currencyId: string]: number | undefined
      }
    | undefined
}
