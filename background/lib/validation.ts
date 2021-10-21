import AjvJSONSchema, { JSONSchemaType } from "ajv"
import AjvJTD, { JTDDataType } from "ajv/dist/jtd"
import { ValidateFunction } from "ajv/dist/types"

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
  instantiatedAjvJSONSchema = instantiatedAjvJSONSchema ?? new AjvJSONSchema()
  return instantiatedAjvJSONSchema
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
          // NOTE: this changes the ajv api bc/ it won't copy the null vallues
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
        // NOTE: this changes the ajv api bc/ it won't copy the null vallues
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
