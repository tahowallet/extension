import AjvJTD from "ajv/dist/jtd"
import AjvJSON from "ajv"
import standaloneCode from "ajv/dist/standalone"
import { writeFileSync } from "fs"
import path from "path"
import { schema } from "@uniswap/token-lists"

import zeroExSpec from "./lib/validate/0x/openapi.json"
import {
  boarGetAssetTransfersJTD,
  boarTokenBalanceJTD,
  boarTokenMetadataJTD,
} from "./lib/validate/boar"
import { metadataJTD } from "./lib/validate/erc721"
import { coingeckoPriceSchema } from "./lib/validate/prices"

type Schema = { [keyword: string]: unknown }

function isSchema(value: unknown): value is Schema {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mapSubschemas(
  schemaObject: Schema,
  transform: (subschema: Schema) => Schema,
): Schema {
  const mapped: Schema = { ...schemaObject }
  const { properties, items } = schemaObject

  if (isSchema(properties)) {
    mapped.properties = Object.fromEntries(
      Object.entries(properties).map(([name, property]) => [
        name,
        isSchema(property) ? transform(property) : property,
      ]),
    )
  }
  if (isSchema(items)) {
    mapped.items = transform(items)
  }
  ;(["allOf", "anyOf", "oneOf"] as const).forEach((combinator) => {
    const subschemas = schemaObject[combinator]
    if (Array.isArray(subschemas)) {
      mapped[combinator] = subschemas.map((subschema: unknown) =>
        isSchema(subschema) ? transform(subschema) : subschema,
      )
    }
  })

  return mapped
}

/**
 * Converts an OpenAPI 3.0 response schema to a JSON Schema that still accepts
 * fields the API adds later.
 */
function toOpenJSONSchema(openAPISchema: Schema): Schema {
  const {
    nullable,
    additionalProperties: _additionalProperties,
    example: _example,
    description: _description,
    ...rest
  } = openAPISchema
  const jsonSchema = mapSubschemas(rest, toOpenJSONSchema)

  // The spec writes its numeric strings as `allOf: [{}, numericString]`.
  const { allOf } = jsonSchema
  if (Array.isArray(allOf)) {
    const constraints = allOf.filter(
      (subschema) => isSchema(subschema) && Object.keys(subschema).length > 0,
    )
    if (constraints.length === 1 && isSchema(constraints[0])) {
      delete jsonSchema.allOf
      Object.assign(jsonSchema, constraints[0])
    }
  }

  if (nullable !== true) {
    return jsonSchema
  }
  if (typeof jsonSchema.type === "string" && !("enum" in jsonSchema)) {
    return { ...jsonSchema, type: [jsonSchema.type, "null"] }
  }
  return { anyOf: [jsonSchema, { type: "null" }] }
}

/**
 * Moves object schemas that appear more than once into shared definitions,
 * so the standalone code checks each shape in a single function.
 */
function shareRepeatedObjectSchemas(
  rootSchemas: Schema[],
  id: string,
): { rootSchemas: Schema[]; definitions: Record<string, Schema> } {
  const occurrences = new Map<string, number>()
  const count = (subschema: Schema): Schema => {
    const key = JSON.stringify(subschema)
    occurrences.set(key, (occurrences.get(key) ?? 0) + 1)
    return mapSubschemas(subschema, count)
  }
  rootSchemas.forEach(count)

  const definitions: Record<string, Schema> = {}
  const names = new Map<string, string>()
  const share = (subschema: Schema): Schema => {
    const key = JSON.stringify(subschema)
    const isObjectShape = "properties" in subschema || "anyOf" in subschema
    if (!isObjectShape || (occurrences.get(key) ?? 0) < 2) {
      return mapSubschemas(subschema, share)
    }

    let name = names.get(key)
    if (name === undefined) {
      name = `shared${names.size}`
      names.set(key, name)
      definitions[name] = mapSubschemas(subschema, share)
    }
    return { $ref: `${id}#/definitions/${name}` }
  }

  return {
    rootSchemas: rootSchemas.map((rootSchema) =>
      mapSubschemas(rootSchema, share),
    ),
    definitions,
  }
}

const zeroExSchemaID = "0x-swap"
const {
  rootSchemas: [zeroExPriceSchema, zeroExQuoteSchema],
  definitions: zeroExDefinitions,
} = shareRepeatedObjectSchemas(
  (
    ["/swap/allowance-holder/price", "/swap/allowance-holder/quote"] as const
  ).map((operation) =>
    toOpenJSONSchema(
      zeroExSpec.paths[operation].get.responses["200"].content[
        "application/json"
      ].schema,
    ),
  ),
  zeroExSchemaID,
)

const ajvJTD = new AjvJTD({
  allErrors: true,
  code: { source: true, es5: true },
})
  .addSchema(metadataJTD, "isValidMetadata")
  .addSchema(boarGetAssetTransfersJTD, "isValidBoarAssetTransferResponse")
  .addSchema(boarTokenBalanceJTD, "isValidBoarTokenBalanceResponse")
  .addSchema(boarTokenMetadataJTD, "isValidBoarTokenMetadataResponse")

const jsonValidators = {
  isValidCoinGeckoPriceResponse: coingeckoPriceSchema,
  isValidUniswapTokenListResponse: schema,
  isValid0xSwapPriceResponse: zeroExPriceSchema,
  isValid0xSwapQuoteResponse: zeroExQuoteSchema,
}

const ajvJSON = new AjvJSON({
  allErrors: true,
  allowUnionTypes: true,
  // Keeps each shared 0x definition in one function instead of inlining it
  // at every use.
  inlineRefs: false,
  code: { source: true },
  formats: { "date-time": true, uri: true },
}).addSchema({ $id: zeroExSchemaID, definitions: zeroExDefinitions })

Object.entries(jsonValidators).forEach(([name, validatorSchema]) =>
  ajvJSON.addSchema(validatorSchema, name),
)

const jtdModuleCode = standaloneCode(ajvJTD).replace(
  '/*# sourceURL="https://uniswap.org/tokenlist.schema.json" */',
  "",
)
const jsonModuleCode = standaloneCode(
  ajvJSON,
  Object.fromEntries(Object.keys(jsonValidators).map((name) => [name, name])),
).replace('/*# sourceURL="https://uniswap.org/tokenlist.schema.json" */', "")

writeFileSync(
  path.join(__dirname, "/lib/validate/jtd-validators.js"),
  jtdModuleCode,
)

writeFileSync(
  path.join(__dirname, "/lib/validate/json-validators.js"),
  jsonModuleCode,
)
