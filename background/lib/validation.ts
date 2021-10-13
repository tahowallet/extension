import Ajv, { JTDDataType } from "ajv/dist/jtd"
import { AnyValidateFunction } from "ajv/dist/types"
import logger from "./logger"

/**
 * TODO create the proper organisation for the validation when using it to validate anything else
 * a good starting point would a base validation class in /lib and
 * a validation instance in every service
 */
const ajv = new Ajv()

/**
 * https://github.com/ajv-validator/ajv/blob/master/spec/types/jtd-schema.spec.ts - jtd unit tests
 * https://ajv.js.org/json-type-definition.html - jtd spec ajv
 * https://jsontypedef.com/docs/jtd-in-5-minutes/ - jtd in 5 mins
 * https://github.com/jsontypedef/homebrew-jsontypedef - jtd tooling
 * https://ajv.js.org/guide/typescript.html - using with ts
 *
 */
const coingeckoPriceSchema = {
  values: {
    properties: {
      last_updated_at: { type: "uint32" },
    },
    additionalProperties: true,
  },
} as const

type CoinGeckoPriceDataJtd = JTDDataType<typeof coingeckoPriceSchema>

export function getSimplePriceValidator(): AnyValidateFunction<CoinGeckoPriceDataJtd> {
  const cacheKey = "coingecko_simple_price"
  let validate = ajv.getSchema<CoinGeckoPriceDataJtd>(cacheKey)

  /**
   * Schema compile is a costly operation so we want to do it as lazyly as possible.
   * Parse it only when it's requested and do this only once and compile it only when used.
   *
   * The same could be achieved with using a $id in the cache but that keyword is
   * not known in jtd strict mode. Adding it as an exstra keyword felt hacky and did not really work.
   * https://ajv.js.org/guide/managing-schemas.html#pre-adding-all-schemas-vs-adding-on-demand
   */
  if (validate) return validate

  try {
    /**
     * addSchema does not compile the schema, but it's not necessary - be lazy
     * https://ajv.js.org/api.html#ajv-addschema-schema-object-object-key-string-ajv
     * > Although addSchema does not compile schemas, explicit compilation is not required
     * > the schema will be compiled when it is used first time.
     */
    ajv.addSchema(coingeckoPriceSchema, cacheKey)
    validate = ajv.getSchema<CoinGeckoPriceDataJtd>(cacheKey)
  } catch (e) {
    logger.error(e)
  }

  return validate
}

// TODO implement me - I need at least a contract address to test this
// export function getTokenPriceValidator() {}

export default ajv
