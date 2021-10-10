import Ajv from "ajv/dist/jtd"
import logger from "./logger"

/**
 * TODO create the proper organisation for the validation when using it to validate anything else
 * a good starting point would a base validation class in /lib and
 * a validation instance in every service
 */
const ajv = new Ajv()

/**
 * This is a small helper function that helps creating jtd schema by expanding concatenated keys
 * into separate keys + values
 *
 * eg.
 *   "usd,eur", expandTo: {type: "float64"} => { usd: {type: "float64"}, eur: {type: "float64"}}
 *
 * @param values single element or string of elements separated by ,
 * @param expandTo the template that will be the value of every expanded key
 * @returns an object with all the keys separate and the expandTo as values
 */
function expand(values: string, expandTo: unknown) {
  return values.split(",").reduce((acc, curr) => {
    acc[curr] = expandTo
    return acc
  }, {} as { [x: string]: unknown })
}

/**
 * Based on the runtime arguments generates a validation schema for
 * coingecko simple/price endpoint
 *
 * {
 *  properties: {
 *      coinId1: {
 *          properties: {
 *              currency1: {type: "float64"},
 *              currency2: {type: "float64"},
 *              currencyn: {type: "float64"},
 *              last_updated_at: { type: "uint32" },
 *          }
 *      }
 *      coinId2: {
 *          properties: {
 *              currency1: {type: "float64"},
 *              currency2: {type: "float64"},
 *              currencyn: {type: "float64"},
 *              last_updated_at: { type: "uint32" },
 *          },
 *      }
 *  }
 * }
 *
 * @param coinIds single coinid or string of coinids separated by a coma
 * @param currencySymbols single currency or string of currencies separated by a coma
 * @returns schema object
 */
function generatePriceJtdSchema(coinIds: string, currencySymbols: string) {
  const propertiesSlice = {
    properties: {
      ...expand(currencySymbols, { type: "float64" }),
      last_updated_at: { type: "uint32" },
    },
  }

  return {
    properties: {
      ...expand(coinIds, propertiesSlice),
    },
  }
}

function getCacheKey(coinIds, currencySymbols) {
  return `coingecko_simple/price_${coinIds}_${currencySymbols}`
}

/**
 * The purpose of the validation is to be sure, that after it passed our data looks exactly
 * as we expect it to be. Has all the keys, all the properties etc.
 *
 * Coingecko accepts everything but returns data only for values that it knows about.
 * So if we ask for a 'usd12341234' currency it will simply not include it in the response.
 *
 * To handle this we need a schema which can be written development time but be exact enough
 * so we can be sure our data is good at runtime. I could not find a schema description like this.
 * I could describe the shape of the response, but not the exact keys. But I think this is kind of
 * the core philosophy of JTD. Describe shape not values.
 * For this I used the values form. https://ajv.js.org/json-type-definition.html#values-form
 *
 * OR we generate the validation schema for the request at runtime.
 *
 * @param coinIds single coinid or string of coinids separated by a coma
 * @param currencySymbols single currency or string of currencies separated by a coma
 * @returns validation function
 */
function getSimplePriceValidator(coinIds: string, currencySymbols: string) {
  const cacheKey = getCacheKey(coinIds, currencySymbols)
  let validate = ajv.getSchema(cacheKey)

  /**
   * Schema compile is a costly operation so we want to do it as lazyly as possible.
   * Parse it only when it's requested and do this only once and compile it only when used.
   *
   * The same could be achieved with using a $id in the cache but that keyword is
   * not known in jtd strict mode. Adding it as an exstra keyword felt hacky and did not really work.
   * https://ajv.js.org/guide/managing-schemas.html#pre-adding-all-schemas-vs-adding-on-demand
   */
  if (validate) return validate

  // See RFC 8927 or jsontypedef.com to learn more about JTD.
  // https://ajv.js.org/guide/schema-language.html#json-type-definition
  const schema = generatePriceJtdSchema(coinIds, currencySymbols)

  try {
    /**
     * addSchema does not compile the schema, but it's not necessary - be lazy
     * https://ajv.js.org/api.html#ajv-addschema-schema-object-object-key-string-ajv
     * > Although addSchema does not compile schemas, explicit compilation is not required
     * > the schema will be compiled when it is used first time.
     */
    ajv.addSchema(schema, cacheKey)
    validate = ajv.getSchema(cacheKey)
  } catch (e) {
    logger.error(e)
  }

  return validate
}

// TODO implement me - I need at least a contract address to test this
// export function getTokenPriceValidator() {}

export default {
  ajv,
  getSimplePriceValidator,
}
