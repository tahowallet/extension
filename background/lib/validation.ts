import AjvJSONSchema, { JSONSchemaType } from "ajv"
import AjvJTD, { JTDDataType } from "ajv/dist/jtd"
import { ValidateFunction } from "ajv/dist/types"

/**
 * TODO create the proper organisation for the validation when using it to validate anything else
 * a good starting point would a base validation class in /lib and
 * a validation instance in every service
 */

// Below, the JTD and JSON Schema Ajv instances are lazily instantiatied so the
// startup cost (which is not insignificant) is only paid when the relevant
// validations are first requested.
let instantiatedAjvJTD: AjvJTD | null = null
let instantiatedAjvJSONSchema: AjvJSONSchema | null = null

const ajvJTD = () => {
  instantiatedAjvJTD = instantiatedAjvJTD ?? new AjvJTD()
  return instantiatedAjvJTD
}
const ajvJSONSchema = () => {
  instantiatedAjvJSONSchema = instantiatedAjvJSONSchema ?? new AjvJTD()
  return instantiatedAjvJSONSchema
}

export type CoingeckoPriceData = {
  [coinId: string]:
    | {
        last_updated_at: number
        [currencyId: string]: number | undefined
      }
    | undefined
}

/**
 * https://github.com/ajv-validator/ajv/blob/master/spec/types/jtd-schema.spec.ts - jtd unit tests
 * https://ajv.js.org/json-type-definition.html - jtd spec ajv
 * https://jsontypedef.com/docs/jtd-in-5-minutes/ - jtd in 5 mins
 * https://github.com/jsontypedef/homebrew-jsontypedef - jtd tooling
 * https://ajv.js.org/guide/typescript.html - using with ts
 *
 */
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
const coingeckoPriceSchema: JSONSchemaType<CoingeckoPriceData> = {
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
}

// The type returned by Ajv validator functions, but without the schemaEnv
// property. Our code does not use it, and its non-optional and Ajv-internal
// nature makes our lazy wrapping difficult to implement correctly.
type EnvlessValidateFunction<T> = ((json: unknown) => json is T) &
  Omit<ValidateFunction<T> | ValidateFunction<JTDDataType<T>>, "schemaEnv">

/**
 * Returns a lazily-compiled JTD validator from a central Ajv instance.
 */
export function jtdValidatorFor<SchemaType>(
  jtdDefinition: SchemaType
): EnvlessValidateFunction<JTDDataType<SchemaType>> {
  let compiled: ValidateFunction<JTDDataType<SchemaType>> | null = null

  const wrapper: EnvlessValidateFunction<JTDDataType<SchemaType>> =
    Object.assign(
      (json: unknown): json is JTDDataType<SchemaType> => {
        try {
          compiled =
            compiled || ajvJTD().compile<JTDDataType<SchemaType>>(jtdDefinition)

          const result = compiled(json)
          // Copy errors and such, which Ajv carries on the validator function
          // object itself.
          Object.assign(wrapper, compiled)

          return result
        } catch (error) {
          // If there's a compilation error, communicate it in a way that
          // aligns with Ajv's typical way of communicating validation errors,
          // and report the JSON as invalid (since we can't know for sure).
          wrapper.errors = [
            {
              keyword: "COMPILATION FAILURE",
              params: { error },
              instancePath: "",
              schemaPath: "",
            },
          ]

          return false
        }
      },
      { schema: jtdDefinition }
    )

  return wrapper
}

/**
 * Returns a lazily-compiled JSON Schema validator from a central Ajv instance.
 */
export function jsonSchemaValidatorFor<T>(
  jsonSchemaDefinition: JSONSchemaType<T>
): EnvlessValidateFunction<T> {
  let compiled: ValidateFunction<T> | null = null

  const wrapper: EnvlessValidateFunction<T> = Object.assign(
    (json: unknown): json is T => {
      try {
        compiled = compiled || ajvJSONSchema().compile<T>(jsonSchemaDefinition)
        const result = compiled(json)
        // Copy errors and such, which Ajv carries on the validator function
        // object itself.
        Object.assign(wrapper, compiled)

        return result
      } catch (error) {
        // If there's a compilation error, communicate it in a way that
        // aligns with Ajv's typical way of communicating validation errors,
        // and report the JSON as invalid (since we can't know for sure).
        wrapper.errors = [
          {
            keyword: "COMPILATION FAILURE",
            params: { error },
            instancePath: "",
            schemaPath: "",
          },
        ]

        return false
      }
    },
    { schema: jsonSchemaDefinition }
  )

  return wrapper
}

export function getSimplePriceValidator(): EnvlessValidateFunction<CoingeckoPriceData> {
  return jsonSchemaValidatorFor<CoingeckoPriceData>(coingeckoPriceSchema)
}

// TODO implement me - I need at least a contract address to test this
// export function getTokenPriceValidator() {}
