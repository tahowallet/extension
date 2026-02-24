"use strict"
exports.isValidCoinGeckoPriceResponse = validate10
const schema11 = {
  type: "object",
  required: [],
  additionalProperties: {
    type: "object",
    properties: { last_updated_at: { type: "number" } },
    required: ["last_updated_at"],
    additionalProperties: { type: "number", nullable: true },
    nullable: true,
  },
}
function validate10(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    for (const key0 in data) {
      let data0 = data[key0]
      if (
        !(data0 && typeof data0 == "object" && !Array.isArray(data0)) &&
        data0 !== null
      ) {
        const err0 = {
          instancePath:
            instancePath + "/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"),
          schemaPath: "#/additionalProperties/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      }
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        if (data0.last_updated_at === undefined) {
          const err1 = {
            instancePath:
              instancePath +
              "/" +
              key0.replace(/~/g, "~0").replace(/\//g, "~1"),
            schemaPath: "#/additionalProperties/required",
            keyword: "required",
            params: { missingProperty: "last_updated_at" },
            message: "must have required property '" + "last_updated_at" + "'",
          }
          if (vErrors === null) {
            vErrors = [err1]
          } else {
            vErrors.push(err1)
          }
          errors++
        }
        for (const key1 in data0) {
          if (!(key1 === "last_updated_at")) {
            let data1 = data0[key1]
            if (
              !(typeof data1 == "number" && isFinite(data1)) &&
              data1 !== null
            ) {
              const err2 = {
                instancePath:
                  instancePath +
                  "/" +
                  key0.replace(/~/g, "~0").replace(/\//g, "~1") +
                  "/" +
                  key1.replace(/~/g, "~0").replace(/\//g, "~1"),
                schemaPath: "#/additionalProperties/additionalProperties/type",
                keyword: "type",
                params: { type: "number" },
                message: "must be number",
              }
              if (vErrors === null) {
                vErrors = [err2]
              } else {
                vErrors.push(err2)
              }
              errors++
            }
          }
        }
        if (data0.last_updated_at !== undefined) {
          let data2 = data0.last_updated_at
          if (!(typeof data2 == "number" && isFinite(data2))) {
            const err3 = {
              instancePath:
                instancePath +
                "/" +
                key0.replace(/~/g, "~0").replace(/\//g, "~1") +
                "/last_updated_at",
              schemaPath:
                "#/additionalProperties/properties/last_updated_at/type",
              keyword: "type",
              params: { type: "number" },
              message: "must be number",
            }
            if (vErrors === null) {
              vErrors = [err3]
            } else {
              vErrors.push(err3)
            }
            errors++
          }
        }
      }
    }
  } else {
    const err4 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err4]
    } else {
      vErrors.push(err4)
    }
    errors++
  }
  validate10.errors = vErrors
  return errors === 0
}
exports.isValidUniswapTokenListResponse = validate11
const schema12 = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://uniswap.org/tokenlist.schema.json",
  title: "Uniswap Token List",
  description:
    "Schema for lists of tokens compatible with the Uniswap Interface",
  definitions: {
    Version: {
      type: "object",
      description: "The version of the list, used in change detection",
      examples: [{ major: 1, minor: 0, patch: 0 }],
      additionalProperties: false,
      properties: {
        major: {
          type: "integer",
          description:
            "The major version of the list. Must be incremented when tokens are removed from the list or token addresses are changed.",
          minimum: 0,
          examples: [1, 2],
        },
        minor: {
          type: "integer",
          description:
            "The minor version of the list. Must be incremented when tokens are added to the list.",
          minimum: 0,
          examples: [0, 1],
        },
        patch: {
          type: "integer",
          description:
            "The patch version of the list. Must be incremented for any changes to the list.",
          minimum: 0,
          examples: [0, 1],
        },
      },
      required: ["major", "minor", "patch"],
    },
    TagIdentifier: {
      type: "string",
      description: "The unique identifier of a tag",
      minLength: 1,
      maxLength: 10,
      pattern: "^[\\w]+$",
      examples: ["compound", "stablecoin"],
    },
    ExtensionIdentifier: {
      type: "string",
      description: "The name of a token extension property",
      minLength: 1,
      maxLength: 40,
      pattern: "^[\\w]+$",
      examples: ["color", "is_fee_on_transfer", "aliases"],
    },
    ExtensionMap: {
      type: "object",
      description:
        "An object containing any arbitrary or vendor-specific token metadata",
      maxProperties: 10,
      propertyNames: { $ref: "#/definitions/ExtensionIdentifier" },
      additionalProperties: { $ref: "#/definitions/ExtensionValue" },
      examples: [
        { color: "#000000", is_verified_by_me: true },
        {
          "x-bridged-addresses-by-chain": {
            1: {
              bridgeAddress: "0x4200000000000000000000000000000000000010",
              tokenAddress: "0x4200000000000000000000000000000000000010",
            },
          },
        },
      ],
    },
    ExtensionPrimitiveValue: {
      anyOf: [
        { type: "string", minLength: 1, maxLength: 42, examples: ["#00000"] },
        { type: "boolean", examples: [true] },
        { type: "number", examples: [15] },
        { type: "null" },
      ],
    },
    ExtensionValue: {
      anyOf: [
        { $ref: "#/definitions/ExtensionPrimitiveValue" },
        {
          type: "object",
          maxProperties: 10,
          propertyNames: { $ref: "#/definitions/ExtensionIdentifier" },
          additionalProperties: { $ref: "#/definitions/ExtensionValueInner0" },
        },
      ],
    },
    ExtensionValueInner0: {
      anyOf: [
        { $ref: "#/definitions/ExtensionPrimitiveValue" },
        {
          type: "object",
          maxProperties: 10,
          propertyNames: { $ref: "#/definitions/ExtensionIdentifier" },
          additionalProperties: { $ref: "#/definitions/ExtensionValueInner1" },
        },
      ],
    },
    ExtensionValueInner1: {
      anyOf: [{ $ref: "#/definitions/ExtensionPrimitiveValue" }],
    },
    TagDefinition: {
      type: "object",
      description:
        "Definition of a tag that can be associated with a token via its identifier",
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          description: "The name of the tag",
          pattern: "^[ \\w]+$",
          minLength: 1,
          maxLength: 20,
        },
        description: {
          type: "string",
          description: "A user-friendly description of the tag",
          pattern: "^[ \\w\\.,:]+$",
          minLength: 1,
          maxLength: 200,
        },
      },
      required: ["name", "description"],
      examples: [
        {
          name: "Stablecoin",
          description: "A token with value pegged to another asset",
        },
      ],
    },
    TokenInfo: {
      type: "object",
      description: "Metadata for a single token in a token list",
      additionalProperties: false,
      properties: {
        chainId: {
          type: "integer",
          description:
            "The chain ID of the Ethereum network where this token is deployed",
          minimum: 1,
          examples: [1, 42],
        },
        address: {
          type: "string",
          description:
            "The checksummed address of the token on the specified chain ID",
          pattern: "^0x[a-fA-F0-9]{40}$",
          examples: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
        },
        decimals: {
          type: "integer",
          description: "The number of decimals for the token balance",
          minimum: 0,
          maximum: 255,
          examples: [18],
        },
        name: {
          type: "string",
          description: "The name of the token",
          minLength: 1,
          maxLength: 40,
          pattern: "^[ \\w.'+\\-%/À-ÖØ-öø-ÿ:&\\[\\]\\(\\)]+$",
          examples: ["USD Coin"],
        },
        symbol: {
          type: "string",
          description: "The symbol for the token; must be alphanumeric",
          pattern: "^[a-zA-Z0-9+\\-%/$.]+$",
          minLength: 1,
          maxLength: 20,
          examples: ["USDC"],
        },
        logoURI: {
          type: "string",
          description:
            "A URI to the token logo asset; if not set, interface will attempt to find a logo based on the token address; suggest SVG or PNG of size 64x64",
          format: "uri",
          examples: ["ipfs://QmXfzKRvjZz3u5JRgC4v5mGVbm9ahrUiB4DgzHBsnWbTMM"],
        },
        tags: {
          type: "array",
          description:
            "An array of tag identifiers associated with the token; tags are defined at the list level",
          items: { $ref: "#/definitions/TagIdentifier" },
          maxItems: 10,
          examples: ["stablecoin", "compound"],
        },
        extensions: { $ref: "#/definitions/ExtensionMap" },
      },
      required: ["chainId", "address", "decimals", "name", "symbol"],
    },
  },
  type: "object",
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      description: "The name of the token list",
      minLength: 1,
      maxLength: 30,
      pattern: "^[\\w ]+$",
      examples: ["My Token List"],
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description:
        "The timestamp of this list version; i.e. when this immutable version of the list was created",
    },
    version: { $ref: "#/definitions/Version" },
    tokens: {
      type: "array",
      description: "The list of tokens included in the list",
      items: { $ref: "#/definitions/TokenInfo" },
      minItems: 1,
      maxItems: 10000,
    },
    keywords: {
      type: "array",
      description:
        "Keywords associated with the contents of the list; may be used in list discoverability",
      items: {
        type: "string",
        description: "A keyword to describe the contents of the list",
        minLength: 1,
        maxLength: 20,
        pattern: "^[\\w ]+$",
        examples: ["compound", "lending", "personal tokens"],
      },
      maxItems: 20,
      uniqueItems: true,
    },
    tags: {
      type: "object",
      description: "A mapping of tag identifiers to their name and description",
      propertyNames: { $ref: "#/definitions/TagIdentifier" },
      additionalProperties: { $ref: "#/definitions/TagDefinition" },
      maxProperties: 20,
      examples: [
        {
          stablecoin: {
            name: "Stablecoin",
            description: "A token with value pegged to another asset",
          },
        },
      ],
    },
    logoURI: {
      type: "string",
      description:
        "A URI for the logo of the token list; prefer SVG or PNG of size 256x256",
      format: "uri",
      examples: ["ipfs://QmXfzKRvjZz3u5JRgC4v5mGVbm9ahrUiB4DgzHBsnWbTMM"],
    },
  },
  required: ["name", "timestamp", "version", "tokens"],
}
const schema13 = {
  type: "object",
  description: "The version of the list, used in change detection",
  examples: [{ major: 1, minor: 0, patch: 0 }],
  additionalProperties: false,
  properties: {
    major: {
      type: "integer",
      description:
        "The major version of the list. Must be incremented when tokens are removed from the list or token addresses are changed.",
      minimum: 0,
      examples: [1, 2],
    },
    minor: {
      type: "integer",
      description:
        "The minor version of the list. Must be incremented when tokens are added to the list.",
      minimum: 0,
      examples: [0, 1],
    },
    patch: {
      type: "integer",
      description:
        "The patch version of the list. Must be incremented for any changes to the list.",
      minimum: 0,
      examples: [0, 1],
    },
  },
  required: ["major", "minor", "patch"],
}
const schema15 = {
  type: "string",
  description: "The unique identifier of a tag",
  minLength: 1,
  maxLength: 10,
  pattern: "^[\\w]+$",
  examples: ["compound", "stablecoin"],
}
const schema27 = {
  type: "object",
  description:
    "Definition of a tag that can be associated with a token via its identifier",
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      description: "The name of the tag",
      pattern: "^[ \\w]+$",
      minLength: 1,
      maxLength: 20,
    },
    description: {
      type: "string",
      description: "A user-friendly description of the tag",
      pattern: "^[ \\w\\.,:]+$",
      minLength: 1,
      maxLength: 200,
    },
  },
  required: ["name", "description"],
  examples: [
    {
      name: "Stablecoin",
      description: "A token with value pegged to another asset",
    },
  ],
}
const func4 = require("ajv/dist/runtime/ucs2length").default
const pattern0 = new RegExp("^[\\w ]+$", "u")
const pattern4 = new RegExp("^[\\w]+$", "u")
const pattern10 = new RegExp("^[ \\w]+$", "u")
const pattern11 = new RegExp("^[ \\w\\.,:]+$", "u")
const schema14 = {
  type: "object",
  description: "Metadata for a single token in a token list",
  additionalProperties: false,
  properties: {
    chainId: {
      type: "integer",
      description:
        "The chain ID of the Ethereum network where this token is deployed",
      minimum: 1,
      examples: [1, 42],
    },
    address: {
      type: "string",
      description:
        "The checksummed address of the token on the specified chain ID",
      pattern: "^0x[a-fA-F0-9]{40}$",
      examples: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
    },
    decimals: {
      type: "integer",
      description: "The number of decimals for the token balance",
      minimum: 0,
      maximum: 255,
      examples: [18],
    },
    name: {
      type: "string",
      description: "The name of the token",
      minLength: 1,
      maxLength: 40,
      pattern: "^[ \\w.'+\\-%/À-ÖØ-öø-ÿ:&\\[\\]\\(\\)]+$",
      examples: ["USD Coin"],
    },
    symbol: {
      type: "string",
      description: "The symbol for the token; must be alphanumeric",
      pattern: "^[a-zA-Z0-9+\\-%/$.]+$",
      minLength: 1,
      maxLength: 20,
      examples: ["USDC"],
    },
    logoURI: {
      type: "string",
      description:
        "A URI to the token logo asset; if not set, interface will attempt to find a logo based on the token address; suggest SVG or PNG of size 64x64",
      format: "uri",
      examples: ["ipfs://QmXfzKRvjZz3u5JRgC4v5mGVbm9ahrUiB4DgzHBsnWbTMM"],
    },
    tags: {
      type: "array",
      description:
        "An array of tag identifiers associated with the token; tags are defined at the list level",
      items: { $ref: "#/definitions/TagIdentifier" },
      maxItems: 10,
      examples: ["stablecoin", "compound"],
    },
    extensions: { $ref: "#/definitions/ExtensionMap" },
  },
  required: ["chainId", "address", "decimals", "name", "symbol"],
}
const pattern1 = new RegExp("^0x[a-fA-F0-9]{40}$", "u")
const pattern2 = new RegExp("^[ \\w.'+\\-%/À-ÖØ-öø-ÿ:&\\[\\]\\(\\)]+$", "u")
const pattern3 = new RegExp("^[a-zA-Z0-9+\\-%/$.]+$", "u")
const schema16 = {
  type: "object",
  description:
    "An object containing any arbitrary or vendor-specific token metadata",
  maxProperties: 10,
  propertyNames: { $ref: "#/definitions/ExtensionIdentifier" },
  additionalProperties: { $ref: "#/definitions/ExtensionValue" },
  examples: [
    { color: "#000000", is_verified_by_me: true },
    {
      "x-bridged-addresses-by-chain": {
        1: {
          bridgeAddress: "0x4200000000000000000000000000000000000010",
          tokenAddress: "0x4200000000000000000000000000000000000010",
        },
      },
    },
  ],
}
const schema17 = {
  type: "string",
  description: "The name of a token extension property",
  minLength: 1,
  maxLength: 40,
  pattern: "^[\\w]+$",
  examples: ["color", "is_fee_on_transfer", "aliases"],
}
const schema18 = {
  anyOf: [
    { $ref: "#/definitions/ExtensionPrimitiveValue" },
    {
      type: "object",
      maxProperties: 10,
      propertyNames: { $ref: "#/definitions/ExtensionIdentifier" },
      additionalProperties: { $ref: "#/definitions/ExtensionValueInner0" },
    },
  ],
}
const schema19 = {
  anyOf: [
    { type: "string", minLength: 1, maxLength: 42, examples: ["#00000"] },
    { type: "boolean", examples: [true] },
    { type: "number", examples: [15] },
    { type: "null" },
  ],
}
const schema21 = {
  anyOf: [
    { $ref: "#/definitions/ExtensionPrimitiveValue" },
    {
      type: "object",
      maxProperties: 10,
      propertyNames: { $ref: "#/definitions/ExtensionIdentifier" },
      additionalProperties: { $ref: "#/definitions/ExtensionValueInner1" },
    },
  ],
}
const schema24 = { anyOf: [{ $ref: "#/definitions/ExtensionPrimitiveValue" }] }
function validate16(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  const _errs1 = errors
  const _errs3 = errors
  let valid2 = false
  const _errs4 = errors
  if (typeof data === "string") {
    if (func4(data) > 42) {
      const err0 = {
        instancePath,
        schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/0/maxLength",
        keyword: "maxLength",
        params: { limit: 42 },
        message: "must NOT have more than 42 characters",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (func4(data) < 1) {
      const err1 = {
        instancePath,
        schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/0/minLength",
        keyword: "minLength",
        params: { limit: 1 },
        message: "must NOT have fewer than 1 characters",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
  } else {
    const err2 = {
      instancePath,
      schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/0/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string",
    }
    if (vErrors === null) {
      vErrors = [err2]
    } else {
      vErrors.push(err2)
    }
    errors++
  }
  var _valid1 = _errs4 === errors
  valid2 = valid2 || _valid1
  if (!valid2) {
    const _errs6 = errors
    if (typeof data !== "boolean") {
      const err3 = {
        instancePath,
        schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/1/type",
        keyword: "type",
        params: { type: "boolean" },
        message: "must be boolean",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    var _valid1 = _errs6 === errors
    valid2 = valid2 || _valid1
    if (!valid2) {
      const _errs8 = errors
      if (!(typeof data == "number" && isFinite(data))) {
        const err4 = {
          instancePath,
          schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/2/type",
          keyword: "type",
          params: { type: "number" },
          message: "must be number",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
      var _valid1 = _errs8 === errors
      valid2 = valid2 || _valid1
      if (!valid2) {
        const _errs10 = errors
        if (data !== null) {
          const err5 = {
            instancePath,
            schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/3/type",
            keyword: "type",
            params: { type: "null" },
            message: "must be null",
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
        var _valid1 = _errs10 === errors
        valid2 = valid2 || _valid1
      }
    }
  }
  if (!valid2) {
    const err6 = {
      instancePath,
      schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err6]
    } else {
      vErrors.push(err6)
    }
    errors++
  } else {
    errors = _errs3
    if (vErrors !== null) {
      if (_errs3) {
        vErrors.length = _errs3
      } else {
        vErrors = null
      }
    }
  }
  var _valid0 = _errs1 === errors
  valid0 = valid0 || _valid0
  if (!valid0) {
    const err7 = {
      instancePath,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err7]
    } else {
      vErrors.push(err7)
    }
    errors++
  } else {
    errors = _errs0
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0
      } else {
        vErrors = null
      }
    }
  }
  validate16.errors = vErrors
  return errors === 0
}
function validate15(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  const _errs1 = errors
  const _errs3 = errors
  let valid2 = false
  const _errs4 = errors
  if (typeof data === "string") {
    if (func4(data) > 42) {
      const err0 = {
        instancePath,
        schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/0/maxLength",
        keyword: "maxLength",
        params: { limit: 42 },
        message: "must NOT have more than 42 characters",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (func4(data) < 1) {
      const err1 = {
        instancePath,
        schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/0/minLength",
        keyword: "minLength",
        params: { limit: 1 },
        message: "must NOT have fewer than 1 characters",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
  } else {
    const err2 = {
      instancePath,
      schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/0/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string",
    }
    if (vErrors === null) {
      vErrors = [err2]
    } else {
      vErrors.push(err2)
    }
    errors++
  }
  var _valid1 = _errs4 === errors
  valid2 = valid2 || _valid1
  if (!valid2) {
    const _errs6 = errors
    if (typeof data !== "boolean") {
      const err3 = {
        instancePath,
        schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/1/type",
        keyword: "type",
        params: { type: "boolean" },
        message: "must be boolean",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    var _valid1 = _errs6 === errors
    valid2 = valid2 || _valid1
    if (!valid2) {
      const _errs8 = errors
      if (!(typeof data == "number" && isFinite(data))) {
        const err4 = {
          instancePath,
          schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/2/type",
          keyword: "type",
          params: { type: "number" },
          message: "must be number",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
      var _valid1 = _errs8 === errors
      valid2 = valid2 || _valid1
      if (!valid2) {
        const _errs10 = errors
        if (data !== null) {
          const err5 = {
            instancePath,
            schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/3/type",
            keyword: "type",
            params: { type: "null" },
            message: "must be null",
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
        var _valid1 = _errs10 === errors
        valid2 = valid2 || _valid1
      }
    }
  }
  if (!valid2) {
    const err6 = {
      instancePath,
      schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err6]
    } else {
      vErrors.push(err6)
    }
    errors++
  } else {
    errors = _errs3
    if (vErrors !== null) {
      if (_errs3) {
        vErrors.length = _errs3
      } else {
        vErrors = null
      }
    }
  }
  var _valid0 = _errs1 === errors
  valid0 = valid0 || _valid0
  if (!valid0) {
    const _errs12 = errors
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (Object.keys(data).length > 10) {
        const err7 = {
          instancePath,
          schemaPath: "#/anyOf/1/maxProperties",
          keyword: "maxProperties",
          params: { limit: 10 },
          message: "must NOT have more than 10 items",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
      for (const key0 in data) {
        const _errs14 = errors
        if (typeof key0 === "string") {
          if (func4(key0) > 40) {
            const err8 = {
              instancePath,
              schemaPath: "#/definitions/ExtensionIdentifier/maxLength",
              keyword: "maxLength",
              params: { limit: 40 },
              message: "must NOT have more than 40 characters",
              propertyName: key0,
            }
            if (vErrors === null) {
              vErrors = [err8]
            } else {
              vErrors.push(err8)
            }
            errors++
          }
          if (func4(key0) < 1) {
            const err9 = {
              instancePath,
              schemaPath: "#/definitions/ExtensionIdentifier/minLength",
              keyword: "minLength",
              params: { limit: 1 },
              message: "must NOT have fewer than 1 characters",
              propertyName: key0,
            }
            if (vErrors === null) {
              vErrors = [err9]
            } else {
              vErrors.push(err9)
            }
            errors++
          }
          if (!pattern4.test(key0)) {
            const err10 = {
              instancePath,
              schemaPath: "#/definitions/ExtensionIdentifier/pattern",
              keyword: "pattern",
              params: { pattern: "^[\\w]+$" },
              message: 'must match pattern "' + "^[\\w]+$" + '"',
              propertyName: key0,
            }
            if (vErrors === null) {
              vErrors = [err10]
            } else {
              vErrors.push(err10)
            }
            errors++
          }
        } else {
          const err11 = {
            instancePath,
            schemaPath: "#/definitions/ExtensionIdentifier/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
            propertyName: key0,
          }
          if (vErrors === null) {
            vErrors = [err11]
          } else {
            vErrors.push(err11)
          }
          errors++
        }
        var valid3 = _errs14 === errors
        if (!valid3) {
          const err12 = {
            instancePath,
            schemaPath: "#/anyOf/1/propertyNames",
            keyword: "propertyNames",
            params: { propertyName: key0 },
            message: "property name must be valid",
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
        }
      }
      for (const key1 in data) {
        if (
          !validate16(data[key1], {
            instancePath:
              instancePath +
              "/" +
              key1.replace(/~/g, "~0").replace(/\//g, "~1"),
            parentData: data,
            parentDataProperty: key1,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate16.errors
              : vErrors.concat(validate16.errors)
          errors = vErrors.length
        }
      }
    } else {
      const err13 = {
        instancePath,
        schemaPath: "#/anyOf/1/type",
        keyword: "type",
        params: { type: "object" },
        message: "must be object",
      }
      if (vErrors === null) {
        vErrors = [err13]
      } else {
        vErrors.push(err13)
      }
      errors++
    }
    var _valid0 = _errs12 === errors
    valid0 = valid0 || _valid0
  }
  if (!valid0) {
    const err14 = {
      instancePath,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err14]
    } else {
      vErrors.push(err14)
    }
    errors++
  } else {
    errors = _errs0
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0
      } else {
        vErrors = null
      }
    }
  }
  validate15.errors = vErrors
  return errors === 0
}
function validate14(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  const _errs1 = errors
  const _errs3 = errors
  let valid2 = false
  const _errs4 = errors
  if (typeof data === "string") {
    if (func4(data) > 42) {
      const err0 = {
        instancePath,
        schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/0/maxLength",
        keyword: "maxLength",
        params: { limit: 42 },
        message: "must NOT have more than 42 characters",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (func4(data) < 1) {
      const err1 = {
        instancePath,
        schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/0/minLength",
        keyword: "minLength",
        params: { limit: 1 },
        message: "must NOT have fewer than 1 characters",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
  } else {
    const err2 = {
      instancePath,
      schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/0/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string",
    }
    if (vErrors === null) {
      vErrors = [err2]
    } else {
      vErrors.push(err2)
    }
    errors++
  }
  var _valid1 = _errs4 === errors
  valid2 = valid2 || _valid1
  if (!valid2) {
    const _errs6 = errors
    if (typeof data !== "boolean") {
      const err3 = {
        instancePath,
        schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/1/type",
        keyword: "type",
        params: { type: "boolean" },
        message: "must be boolean",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    var _valid1 = _errs6 === errors
    valid2 = valid2 || _valid1
    if (!valid2) {
      const _errs8 = errors
      if (!(typeof data == "number" && isFinite(data))) {
        const err4 = {
          instancePath,
          schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/2/type",
          keyword: "type",
          params: { type: "number" },
          message: "must be number",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
      var _valid1 = _errs8 === errors
      valid2 = valid2 || _valid1
      if (!valid2) {
        const _errs10 = errors
        if (data !== null) {
          const err5 = {
            instancePath,
            schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf/3/type",
            keyword: "type",
            params: { type: "null" },
            message: "must be null",
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
        var _valid1 = _errs10 === errors
        valid2 = valid2 || _valid1
      }
    }
  }
  if (!valid2) {
    const err6 = {
      instancePath,
      schemaPath: "#/definitions/ExtensionPrimitiveValue/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err6]
    } else {
      vErrors.push(err6)
    }
    errors++
  } else {
    errors = _errs3
    if (vErrors !== null) {
      if (_errs3) {
        vErrors.length = _errs3
      } else {
        vErrors = null
      }
    }
  }
  var _valid0 = _errs1 === errors
  valid0 = valid0 || _valid0
  if (!valid0) {
    const _errs12 = errors
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (Object.keys(data).length > 10) {
        const err7 = {
          instancePath,
          schemaPath: "#/anyOf/1/maxProperties",
          keyword: "maxProperties",
          params: { limit: 10 },
          message: "must NOT have more than 10 items",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
      for (const key0 in data) {
        const _errs14 = errors
        if (typeof key0 === "string") {
          if (func4(key0) > 40) {
            const err8 = {
              instancePath,
              schemaPath: "#/definitions/ExtensionIdentifier/maxLength",
              keyword: "maxLength",
              params: { limit: 40 },
              message: "must NOT have more than 40 characters",
              propertyName: key0,
            }
            if (vErrors === null) {
              vErrors = [err8]
            } else {
              vErrors.push(err8)
            }
            errors++
          }
          if (func4(key0) < 1) {
            const err9 = {
              instancePath,
              schemaPath: "#/definitions/ExtensionIdentifier/minLength",
              keyword: "minLength",
              params: { limit: 1 },
              message: "must NOT have fewer than 1 characters",
              propertyName: key0,
            }
            if (vErrors === null) {
              vErrors = [err9]
            } else {
              vErrors.push(err9)
            }
            errors++
          }
          if (!pattern4.test(key0)) {
            const err10 = {
              instancePath,
              schemaPath: "#/definitions/ExtensionIdentifier/pattern",
              keyword: "pattern",
              params: { pattern: "^[\\w]+$" },
              message: 'must match pattern "' + "^[\\w]+$" + '"',
              propertyName: key0,
            }
            if (vErrors === null) {
              vErrors = [err10]
            } else {
              vErrors.push(err10)
            }
            errors++
          }
        } else {
          const err11 = {
            instancePath,
            schemaPath: "#/definitions/ExtensionIdentifier/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
            propertyName: key0,
          }
          if (vErrors === null) {
            vErrors = [err11]
          } else {
            vErrors.push(err11)
          }
          errors++
        }
        var valid3 = _errs14 === errors
        if (!valid3) {
          const err12 = {
            instancePath,
            schemaPath: "#/anyOf/1/propertyNames",
            keyword: "propertyNames",
            params: { propertyName: key0 },
            message: "property name must be valid",
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
        }
      }
      for (const key1 in data) {
        if (
          !validate15(data[key1], {
            instancePath:
              instancePath +
              "/" +
              key1.replace(/~/g, "~0").replace(/\//g, "~1"),
            parentData: data,
            parentDataProperty: key1,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate15.errors
              : vErrors.concat(validate15.errors)
          errors = vErrors.length
        }
      }
    } else {
      const err13 = {
        instancePath,
        schemaPath: "#/anyOf/1/type",
        keyword: "type",
        params: { type: "object" },
        message: "must be object",
      }
      if (vErrors === null) {
        vErrors = [err13]
      } else {
        vErrors.push(err13)
      }
      errors++
    }
    var _valid0 = _errs12 === errors
    valid0 = valid0 || _valid0
  }
  if (!valid0) {
    const err14 = {
      instancePath,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err14]
    } else {
      vErrors.push(err14)
    }
    errors++
  } else {
    errors = _errs0
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0
      } else {
        vErrors = null
      }
    }
  }
  validate14.errors = vErrors
  return errors === 0
}
function validate13(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (Object.keys(data).length > 10) {
      const err0 = {
        instancePath,
        schemaPath: "#/maxProperties",
        keyword: "maxProperties",
        params: { limit: 10 },
        message: "must NOT have more than 10 items",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    for (const key0 in data) {
      const _errs1 = errors
      if (typeof key0 === "string") {
        if (func4(key0) > 40) {
          const err1 = {
            instancePath,
            schemaPath: "#/definitions/ExtensionIdentifier/maxLength",
            keyword: "maxLength",
            params: { limit: 40 },
            message: "must NOT have more than 40 characters",
            propertyName: key0,
          }
          if (vErrors === null) {
            vErrors = [err1]
          } else {
            vErrors.push(err1)
          }
          errors++
        }
        if (func4(key0) < 1) {
          const err2 = {
            instancePath,
            schemaPath: "#/definitions/ExtensionIdentifier/minLength",
            keyword: "minLength",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 characters",
            propertyName: key0,
          }
          if (vErrors === null) {
            vErrors = [err2]
          } else {
            vErrors.push(err2)
          }
          errors++
        }
        if (!pattern4.test(key0)) {
          const err3 = {
            instancePath,
            schemaPath: "#/definitions/ExtensionIdentifier/pattern",
            keyword: "pattern",
            params: { pattern: "^[\\w]+$" },
            message: 'must match pattern "' + "^[\\w]+$" + '"',
            propertyName: key0,
          }
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        }
      } else {
        const err4 = {
          instancePath,
          schemaPath: "#/definitions/ExtensionIdentifier/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
          propertyName: key0,
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
      var valid0 = _errs1 === errors
      if (!valid0) {
        const err5 = {
          instancePath,
          schemaPath: "#/propertyNames",
          keyword: "propertyNames",
          params: { propertyName: key0 },
          message: "property name must be valid",
        }
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    for (const key1 in data) {
      if (
        !validate14(data[key1], {
          instancePath:
            instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),
          parentData: data,
          parentDataProperty: key1,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate14.errors
            : vErrors.concat(validate14.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err6 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err6]
    } else {
      vErrors.push(err6)
    }
    errors++
  }
  validate13.errors = vErrors
  return errors === 0
}
function validate12(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.chainId === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "chainId" },
        message: "must have required property '" + "chainId" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.address === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "address" },
        message: "must have required property '" + "address" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.decimals === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "decimals" },
        message: "must have required property '" + "decimals" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.name === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "name" },
        message: "must have required property '" + "name" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.symbol === undefined) {
      const err4 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "symbol" },
        message: "must have required property '" + "symbol" + "'",
      }
      if (vErrors === null) {
        vErrors = [err4]
      } else {
        vErrors.push(err4)
      }
      errors++
    }
    for (const key0 in data) {
      if (
        !(
          key0 === "chainId" ||
          key0 === "address" ||
          key0 === "decimals" ||
          key0 === "name" ||
          key0 === "symbol" ||
          key0 === "logoURI" ||
          key0 === "tags" ||
          key0 === "extensions"
        )
      ) {
        const err5 = {
          instancePath,
          schemaPath: "#/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: key0 },
          message: "must NOT have additional properties",
        }
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    if (data.chainId !== undefined) {
      let data0 = data.chainId
      if (
        !(
          typeof data0 == "number" &&
          !(data0 % 1) &&
          !isNaN(data0) &&
          isFinite(data0)
        )
      ) {
        const err6 = {
          instancePath: instancePath + "/chainId",
          schemaPath: "#/properties/chainId/type",
          keyword: "type",
          params: { type: "integer" },
          message: "must be integer",
        }
        if (vErrors === null) {
          vErrors = [err6]
        } else {
          vErrors.push(err6)
        }
        errors++
      }
      if (typeof data0 == "number" && isFinite(data0)) {
        if (data0 < 1 || isNaN(data0)) {
          const err7 = {
            instancePath: instancePath + "/chainId",
            schemaPath: "#/properties/chainId/minimum",
            keyword: "minimum",
            params: { comparison: ">=", limit: 1 },
            message: "must be >= 1",
          }
          if (vErrors === null) {
            vErrors = [err7]
          } else {
            vErrors.push(err7)
          }
          errors++
        }
      }
    }
    if (data.address !== undefined) {
      let data1 = data.address
      if (typeof data1 === "string") {
        if (!pattern1.test(data1)) {
          const err8 = {
            instancePath: instancePath + "/address",
            schemaPath: "#/properties/address/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      } else {
        const err9 = {
          instancePath: instancePath + "/address",
          schemaPath: "#/properties/address/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
      }
    }
    if (data.decimals !== undefined) {
      let data2 = data.decimals
      if (
        !(
          typeof data2 == "number" &&
          !(data2 % 1) &&
          !isNaN(data2) &&
          isFinite(data2)
        )
      ) {
        const err10 = {
          instancePath: instancePath + "/decimals",
          schemaPath: "#/properties/decimals/type",
          keyword: "type",
          params: { type: "integer" },
          message: "must be integer",
        }
        if (vErrors === null) {
          vErrors = [err10]
        } else {
          vErrors.push(err10)
        }
        errors++
      }
      if (typeof data2 == "number" && isFinite(data2)) {
        if (data2 > 255 || isNaN(data2)) {
          const err11 = {
            instancePath: instancePath + "/decimals",
            schemaPath: "#/properties/decimals/maximum",
            keyword: "maximum",
            params: { comparison: "<=", limit: 255 },
            message: "must be <= 255",
          }
          if (vErrors === null) {
            vErrors = [err11]
          } else {
            vErrors.push(err11)
          }
          errors++
        }
        if (data2 < 0 || isNaN(data2)) {
          const err12 = {
            instancePath: instancePath + "/decimals",
            schemaPath: "#/properties/decimals/minimum",
            keyword: "minimum",
            params: { comparison: ">=", limit: 0 },
            message: "must be >= 0",
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
        }
      }
    }
    if (data.name !== undefined) {
      let data3 = data.name
      if (typeof data3 === "string") {
        if (func4(data3) > 40) {
          const err13 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/maxLength",
            keyword: "maxLength",
            params: { limit: 40 },
            message: "must NOT have more than 40 characters",
          }
          if (vErrors === null) {
            vErrors = [err13]
          } else {
            vErrors.push(err13)
          }
          errors++
        }
        if (func4(data3) < 1) {
          const err14 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/minLength",
            keyword: "minLength",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 characters",
          }
          if (vErrors === null) {
            vErrors = [err14]
          } else {
            vErrors.push(err14)
          }
          errors++
        }
        if (!pattern2.test(data3)) {
          const err15 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/pattern",
            keyword: "pattern",
            params: { pattern: "^[ \\w.'+\\-%/À-ÖØ-öø-ÿ:&\\[\\]\\(\\)]+$" },
            message:
              'must match pattern "' +
              "^[ \\w.'+\\-%/À-ÖØ-öø-ÿ:&\\[\\]\\(\\)]+$" +
              '"',
          }
          if (vErrors === null) {
            vErrors = [err15]
          } else {
            vErrors.push(err15)
          }
          errors++
        }
      } else {
        const err16 = {
          instancePath: instancePath + "/name",
          schemaPath: "#/properties/name/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err16]
        } else {
          vErrors.push(err16)
        }
        errors++
      }
    }
    if (data.symbol !== undefined) {
      let data4 = data.symbol
      if (typeof data4 === "string") {
        if (func4(data4) > 20) {
          const err17 = {
            instancePath: instancePath + "/symbol",
            schemaPath: "#/properties/symbol/maxLength",
            keyword: "maxLength",
            params: { limit: 20 },
            message: "must NOT have more than 20 characters",
          }
          if (vErrors === null) {
            vErrors = [err17]
          } else {
            vErrors.push(err17)
          }
          errors++
        }
        if (func4(data4) < 1) {
          const err18 = {
            instancePath: instancePath + "/symbol",
            schemaPath: "#/properties/symbol/minLength",
            keyword: "minLength",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 characters",
          }
          if (vErrors === null) {
            vErrors = [err18]
          } else {
            vErrors.push(err18)
          }
          errors++
        }
        if (!pattern3.test(data4)) {
          const err19 = {
            instancePath: instancePath + "/symbol",
            schemaPath: "#/properties/symbol/pattern",
            keyword: "pattern",
            params: { pattern: "^[a-zA-Z0-9+\\-%/$.]+$" },
            message: 'must match pattern "' + "^[a-zA-Z0-9+\\-%/$.]+$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err19]
          } else {
            vErrors.push(err19)
          }
          errors++
        }
      } else {
        const err20 = {
          instancePath: instancePath + "/symbol",
          schemaPath: "#/properties/symbol/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err20]
        } else {
          vErrors.push(err20)
        }
        errors++
      }
    }
    if (data.logoURI !== undefined) {
      if (!(typeof data.logoURI === "string")) {
        const err21 = {
          instancePath: instancePath + "/logoURI",
          schemaPath: "#/properties/logoURI/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err21]
        } else {
          vErrors.push(err21)
        }
        errors++
      }
    }
    if (data.tags !== undefined) {
      let data6 = data.tags
      if (Array.isArray(data6)) {
        if (data6.length > 10) {
          const err22 = {
            instancePath: instancePath + "/tags",
            schemaPath: "#/properties/tags/maxItems",
            keyword: "maxItems",
            params: { limit: 10 },
            message: "must NOT have more than 10 items",
          }
          if (vErrors === null) {
            vErrors = [err22]
          } else {
            vErrors.push(err22)
          }
          errors++
        }
        const len0 = data6.length
        for (let i0 = 0; i0 < len0; i0++) {
          let data7 = data6[i0]
          if (typeof data7 === "string") {
            if (func4(data7) > 10) {
              const err23 = {
                instancePath: instancePath + "/tags/" + i0,
                schemaPath: "#/definitions/TagIdentifier/maxLength",
                keyword: "maxLength",
                params: { limit: 10 },
                message: "must NOT have more than 10 characters",
              }
              if (vErrors === null) {
                vErrors = [err23]
              } else {
                vErrors.push(err23)
              }
              errors++
            }
            if (func4(data7) < 1) {
              const err24 = {
                instancePath: instancePath + "/tags/" + i0,
                schemaPath: "#/definitions/TagIdentifier/minLength",
                keyword: "minLength",
                params: { limit: 1 },
                message: "must NOT have fewer than 1 characters",
              }
              if (vErrors === null) {
                vErrors = [err24]
              } else {
                vErrors.push(err24)
              }
              errors++
            }
            if (!pattern4.test(data7)) {
              const err25 = {
                instancePath: instancePath + "/tags/" + i0,
                schemaPath: "#/definitions/TagIdentifier/pattern",
                keyword: "pattern",
                params: { pattern: "^[\\w]+$" },
                message: 'must match pattern "' + "^[\\w]+$" + '"',
              }
              if (vErrors === null) {
                vErrors = [err25]
              } else {
                vErrors.push(err25)
              }
              errors++
            }
          } else {
            const err26 = {
              instancePath: instancePath + "/tags/" + i0,
              schemaPath: "#/definitions/TagIdentifier/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            }
            if (vErrors === null) {
              vErrors = [err26]
            } else {
              vErrors.push(err26)
            }
            errors++
          }
        }
      } else {
        const err27 = {
          instancePath: instancePath + "/tags",
          schemaPath: "#/properties/tags/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err27]
        } else {
          vErrors.push(err27)
        }
        errors++
      }
    }
    if (data.extensions !== undefined) {
      if (
        !validate13(data.extensions, {
          instancePath: instancePath + "/extensions",
          parentData: data,
          parentDataProperty: "extensions",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate13.errors
            : vErrors.concat(validate13.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err28 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err28]
    } else {
      vErrors.push(err28)
    }
    errors++
  }
  validate12.errors = vErrors
  return errors === 0
}
function validate11(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.name === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "name" },
        message: "must have required property '" + "name" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.timestamp === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "timestamp" },
        message: "must have required property '" + "timestamp" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.version === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "version" },
        message: "must have required property '" + "version" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.tokens === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "tokens" },
        message: "must have required property '" + "tokens" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    for (const key0 in data) {
      if (
        !(
          key0 === "name" ||
          key0 === "timestamp" ||
          key0 === "version" ||
          key0 === "tokens" ||
          key0 === "keywords" ||
          key0 === "tags" ||
          key0 === "logoURI"
        )
      ) {
        const err4 = {
          instancePath,
          schemaPath: "#/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: key0 },
          message: "must NOT have additional properties",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
    }
    if (data.name !== undefined) {
      let data0 = data.name
      if (typeof data0 === "string") {
        if (func4(data0) > 30) {
          const err5 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/maxLength",
            keyword: "maxLength",
            params: { limit: 30 },
            message: "must NOT have more than 30 characters",
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
        if (func4(data0) < 1) {
          const err6 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/minLength",
            keyword: "minLength",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 characters",
          }
          if (vErrors === null) {
            vErrors = [err6]
          } else {
            vErrors.push(err6)
          }
          errors++
        }
        if (!pattern0.test(data0)) {
          const err7 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/pattern",
            keyword: "pattern",
            params: { pattern: "^[\\w ]+$" },
            message: 'must match pattern "' + "^[\\w ]+$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err7]
          } else {
            vErrors.push(err7)
          }
          errors++
        }
      } else {
        const err8 = {
          instancePath: instancePath + "/name",
          schemaPath: "#/properties/name/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err8]
        } else {
          vErrors.push(err8)
        }
        errors++
      }
    }
    if (data.timestamp !== undefined) {
      if (!(typeof data.timestamp === "string")) {
        const err9 = {
          instancePath: instancePath + "/timestamp",
          schemaPath: "#/properties/timestamp/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
      }
    }
    if (data.version !== undefined) {
      let data2 = data.version
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.major === undefined) {
          const err10 = {
            instancePath: instancePath + "/version",
            schemaPath: "#/definitions/Version/required",
            keyword: "required",
            params: { missingProperty: "major" },
            message: "must have required property '" + "major" + "'",
          }
          if (vErrors === null) {
            vErrors = [err10]
          } else {
            vErrors.push(err10)
          }
          errors++
        }
        if (data2.minor === undefined) {
          const err11 = {
            instancePath: instancePath + "/version",
            schemaPath: "#/definitions/Version/required",
            keyword: "required",
            params: { missingProperty: "minor" },
            message: "must have required property '" + "minor" + "'",
          }
          if (vErrors === null) {
            vErrors = [err11]
          } else {
            vErrors.push(err11)
          }
          errors++
        }
        if (data2.patch === undefined) {
          const err12 = {
            instancePath: instancePath + "/version",
            schemaPath: "#/definitions/Version/required",
            keyword: "required",
            params: { missingProperty: "patch" },
            message: "must have required property '" + "patch" + "'",
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
        }
        for (const key1 in data2) {
          if (!(key1 === "major" || key1 === "minor" || key1 === "patch")) {
            const err13 = {
              instancePath: instancePath + "/version",
              schemaPath: "#/definitions/Version/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key1 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err13]
            } else {
              vErrors.push(err13)
            }
            errors++
          }
        }
        if (data2.major !== undefined) {
          let data3 = data2.major
          if (
            !(
              typeof data3 == "number" &&
              !(data3 % 1) &&
              !isNaN(data3) &&
              isFinite(data3)
            )
          ) {
            const err14 = {
              instancePath: instancePath + "/version/major",
              schemaPath: "#/definitions/Version/properties/major/type",
              keyword: "type",
              params: { type: "integer" },
              message: "must be integer",
            }
            if (vErrors === null) {
              vErrors = [err14]
            } else {
              vErrors.push(err14)
            }
            errors++
          }
          if (typeof data3 == "number" && isFinite(data3)) {
            if (data3 < 0 || isNaN(data3)) {
              const err15 = {
                instancePath: instancePath + "/version/major",
                schemaPath: "#/definitions/Version/properties/major/minimum",
                keyword: "minimum",
                params: { comparison: ">=", limit: 0 },
                message: "must be >= 0",
              }
              if (vErrors === null) {
                vErrors = [err15]
              } else {
                vErrors.push(err15)
              }
              errors++
            }
          }
        }
        if (data2.minor !== undefined) {
          let data4 = data2.minor
          if (
            !(
              typeof data4 == "number" &&
              !(data4 % 1) &&
              !isNaN(data4) &&
              isFinite(data4)
            )
          ) {
            const err16 = {
              instancePath: instancePath + "/version/minor",
              schemaPath: "#/definitions/Version/properties/minor/type",
              keyword: "type",
              params: { type: "integer" },
              message: "must be integer",
            }
            if (vErrors === null) {
              vErrors = [err16]
            } else {
              vErrors.push(err16)
            }
            errors++
          }
          if (typeof data4 == "number" && isFinite(data4)) {
            if (data4 < 0 || isNaN(data4)) {
              const err17 = {
                instancePath: instancePath + "/version/minor",
                schemaPath: "#/definitions/Version/properties/minor/minimum",
                keyword: "minimum",
                params: { comparison: ">=", limit: 0 },
                message: "must be >= 0",
              }
              if (vErrors === null) {
                vErrors = [err17]
              } else {
                vErrors.push(err17)
              }
              errors++
            }
          }
        }
        if (data2.patch !== undefined) {
          let data5 = data2.patch
          if (
            !(
              typeof data5 == "number" &&
              !(data5 % 1) &&
              !isNaN(data5) &&
              isFinite(data5)
            )
          ) {
            const err18 = {
              instancePath: instancePath + "/version/patch",
              schemaPath: "#/definitions/Version/properties/patch/type",
              keyword: "type",
              params: { type: "integer" },
              message: "must be integer",
            }
            if (vErrors === null) {
              vErrors = [err18]
            } else {
              vErrors.push(err18)
            }
            errors++
          }
          if (typeof data5 == "number" && isFinite(data5)) {
            if (data5 < 0 || isNaN(data5)) {
              const err19 = {
                instancePath: instancePath + "/version/patch",
                schemaPath: "#/definitions/Version/properties/patch/minimum",
                keyword: "minimum",
                params: { comparison: ">=", limit: 0 },
                message: "must be >= 0",
              }
              if (vErrors === null) {
                vErrors = [err19]
              } else {
                vErrors.push(err19)
              }
              errors++
            }
          }
        }
      } else {
        const err20 = {
          instancePath: instancePath + "/version",
          schemaPath: "#/definitions/Version/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err20]
        } else {
          vErrors.push(err20)
        }
        errors++
      }
    }
    if (data.tokens !== undefined) {
      let data6 = data.tokens
      if (Array.isArray(data6)) {
        if (data6.length > 10000) {
          const err21 = {
            instancePath: instancePath + "/tokens",
            schemaPath: "#/properties/tokens/maxItems",
            keyword: "maxItems",
            params: { limit: 10000 },
            message: "must NOT have more than 10000 items",
          }
          if (vErrors === null) {
            vErrors = [err21]
          } else {
            vErrors.push(err21)
          }
          errors++
        }
        if (data6.length < 1) {
          const err22 = {
            instancePath: instancePath + "/tokens",
            schemaPath: "#/properties/tokens/minItems",
            keyword: "minItems",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 items",
          }
          if (vErrors === null) {
            vErrors = [err22]
          } else {
            vErrors.push(err22)
          }
          errors++
        }
        const len0 = data6.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate12(data6[i0], {
              instancePath: instancePath + "/tokens/" + i0,
              parentData: data6,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate12.errors
                : vErrors.concat(validate12.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err23 = {
          instancePath: instancePath + "/tokens",
          schemaPath: "#/properties/tokens/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err23]
        } else {
          vErrors.push(err23)
        }
        errors++
      }
    }
    if (data.keywords !== undefined) {
      let data8 = data.keywords
      if (Array.isArray(data8)) {
        if (data8.length > 20) {
          const err24 = {
            instancePath: instancePath + "/keywords",
            schemaPath: "#/properties/keywords/maxItems",
            keyword: "maxItems",
            params: { limit: 20 },
            message: "must NOT have more than 20 items",
          }
          if (vErrors === null) {
            vErrors = [err24]
          } else {
            vErrors.push(err24)
          }
          errors++
        }
        const len1 = data8.length
        for (let i1 = 0; i1 < len1; i1++) {
          let data9 = data8[i1]
          if (typeof data9 === "string") {
            if (func4(data9) > 20) {
              const err25 = {
                instancePath: instancePath + "/keywords/" + i1,
                schemaPath: "#/properties/keywords/items/maxLength",
                keyword: "maxLength",
                params: { limit: 20 },
                message: "must NOT have more than 20 characters",
              }
              if (vErrors === null) {
                vErrors = [err25]
              } else {
                vErrors.push(err25)
              }
              errors++
            }
            if (func4(data9) < 1) {
              const err26 = {
                instancePath: instancePath + "/keywords/" + i1,
                schemaPath: "#/properties/keywords/items/minLength",
                keyword: "minLength",
                params: { limit: 1 },
                message: "must NOT have fewer than 1 characters",
              }
              if (vErrors === null) {
                vErrors = [err26]
              } else {
                vErrors.push(err26)
              }
              errors++
            }
            if (!pattern0.test(data9)) {
              const err27 = {
                instancePath: instancePath + "/keywords/" + i1,
                schemaPath: "#/properties/keywords/items/pattern",
                keyword: "pattern",
                params: { pattern: "^[\\w ]+$" },
                message: 'must match pattern "' + "^[\\w ]+$" + '"',
              }
              if (vErrors === null) {
                vErrors = [err27]
              } else {
                vErrors.push(err27)
              }
              errors++
            }
          } else {
            const err28 = {
              instancePath: instancePath + "/keywords/" + i1,
              schemaPath: "#/properties/keywords/items/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            }
            if (vErrors === null) {
              vErrors = [err28]
            } else {
              vErrors.push(err28)
            }
            errors++
          }
        }
        let i2 = data8.length
        let j0
        if (i2 > 1) {
          const indices0 = {}
          for (; i2--; ) {
            let item0 = data8[i2]
            if (typeof item0 !== "string") {
              continue
            }
            if (typeof indices0[item0] == "number") {
              j0 = indices0[item0]
              const err29 = {
                instancePath: instancePath + "/keywords",
                schemaPath: "#/properties/keywords/uniqueItems",
                keyword: "uniqueItems",
                params: { i: i2, j: j0 },
                message:
                  "must NOT have duplicate items (items ## " +
                  j0 +
                  " and " +
                  i2 +
                  " are identical)",
              }
              if (vErrors === null) {
                vErrors = [err29]
              } else {
                vErrors.push(err29)
              }
              errors++
              break
            }
            indices0[item0] = i2
          }
        }
      } else {
        const err30 = {
          instancePath: instancePath + "/keywords",
          schemaPath: "#/properties/keywords/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err30]
        } else {
          vErrors.push(err30)
        }
        errors++
      }
    }
    if (data.tags !== undefined) {
      let data10 = data.tags
      if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
        if (Object.keys(data10).length > 20) {
          const err31 = {
            instancePath: instancePath + "/tags",
            schemaPath: "#/properties/tags/maxProperties",
            keyword: "maxProperties",
            params: { limit: 20 },
            message: "must NOT have more than 20 items",
          }
          if (vErrors === null) {
            vErrors = [err31]
          } else {
            vErrors.push(err31)
          }
          errors++
        }
        for (const key2 in data10) {
          const _errs25 = errors
          if (typeof key2 === "string") {
            if (func4(key2) > 10) {
              const err32 = {
                instancePath: instancePath + "/tags",
                schemaPath: "#/definitions/TagIdentifier/maxLength",
                keyword: "maxLength",
                params: { limit: 10 },
                message: "must NOT have more than 10 characters",
                propertyName: key2,
              }
              if (vErrors === null) {
                vErrors = [err32]
              } else {
                vErrors.push(err32)
              }
              errors++
            }
            if (func4(key2) < 1) {
              const err33 = {
                instancePath: instancePath + "/tags",
                schemaPath: "#/definitions/TagIdentifier/minLength",
                keyword: "minLength",
                params: { limit: 1 },
                message: "must NOT have fewer than 1 characters",
                propertyName: key2,
              }
              if (vErrors === null) {
                vErrors = [err33]
              } else {
                vErrors.push(err33)
              }
              errors++
            }
            if (!pattern4.test(key2)) {
              const err34 = {
                instancePath: instancePath + "/tags",
                schemaPath: "#/definitions/TagIdentifier/pattern",
                keyword: "pattern",
                params: { pattern: "^[\\w]+$" },
                message: 'must match pattern "' + "^[\\w]+$" + '"',
                propertyName: key2,
              }
              if (vErrors === null) {
                vErrors = [err34]
              } else {
                vErrors.push(err34)
              }
              errors++
            }
          } else {
            const err35 = {
              instancePath: instancePath + "/tags",
              schemaPath: "#/definitions/TagIdentifier/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
              propertyName: key2,
            }
            if (vErrors === null) {
              vErrors = [err35]
            } else {
              vErrors.push(err35)
            }
            errors++
          }
          var valid8 = _errs25 === errors
          if (!valid8) {
            const err36 = {
              instancePath: instancePath + "/tags",
              schemaPath: "#/properties/tags/propertyNames",
              keyword: "propertyNames",
              params: { propertyName: key2 },
              message: "property name must be valid",
            }
            if (vErrors === null) {
              vErrors = [err36]
            } else {
              vErrors.push(err36)
            }
            errors++
          }
        }
        for (const key3 in data10) {
          let data11 = data10[key3]
          if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
            if (data11.name === undefined) {
              const err37 = {
                instancePath:
                  instancePath +
                  "/tags/" +
                  key3.replace(/~/g, "~0").replace(/\//g, "~1"),
                schemaPath: "#/definitions/TagDefinition/required",
                keyword: "required",
                params: { missingProperty: "name" },
                message: "must have required property '" + "name" + "'",
              }
              if (vErrors === null) {
                vErrors = [err37]
              } else {
                vErrors.push(err37)
              }
              errors++
            }
            if (data11.description === undefined) {
              const err38 = {
                instancePath:
                  instancePath +
                  "/tags/" +
                  key3.replace(/~/g, "~0").replace(/\//g, "~1"),
                schemaPath: "#/definitions/TagDefinition/required",
                keyword: "required",
                params: { missingProperty: "description" },
                message: "must have required property '" + "description" + "'",
              }
              if (vErrors === null) {
                vErrors = [err38]
              } else {
                vErrors.push(err38)
              }
              errors++
            }
            for (const key4 in data11) {
              if (!(key4 === "name" || key4 === "description")) {
                const err39 = {
                  instancePath:
                    instancePath +
                    "/tags/" +
                    key3.replace(/~/g, "~0").replace(/\//g, "~1"),
                  schemaPath:
                    "#/definitions/TagDefinition/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key4 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err39]
                } else {
                  vErrors.push(err39)
                }
                errors++
              }
            }
            if (data11.name !== undefined) {
              let data12 = data11.name
              if (typeof data12 === "string") {
                if (func4(data12) > 20) {
                  const err40 = {
                    instancePath:
                      instancePath +
                      "/tags/" +
                      key3.replace(/~/g, "~0").replace(/\//g, "~1") +
                      "/name",
                    schemaPath:
                      "#/definitions/TagDefinition/properties/name/maxLength",
                    keyword: "maxLength",
                    params: { limit: 20 },
                    message: "must NOT have more than 20 characters",
                  }
                  if (vErrors === null) {
                    vErrors = [err40]
                  } else {
                    vErrors.push(err40)
                  }
                  errors++
                }
                if (func4(data12) < 1) {
                  const err41 = {
                    instancePath:
                      instancePath +
                      "/tags/" +
                      key3.replace(/~/g, "~0").replace(/\//g, "~1") +
                      "/name",
                    schemaPath:
                      "#/definitions/TagDefinition/properties/name/minLength",
                    keyword: "minLength",
                    params: { limit: 1 },
                    message: "must NOT have fewer than 1 characters",
                  }
                  if (vErrors === null) {
                    vErrors = [err41]
                  } else {
                    vErrors.push(err41)
                  }
                  errors++
                }
                if (!pattern10.test(data12)) {
                  const err42 = {
                    instancePath:
                      instancePath +
                      "/tags/" +
                      key3.replace(/~/g, "~0").replace(/\//g, "~1") +
                      "/name",
                    schemaPath:
                      "#/definitions/TagDefinition/properties/name/pattern",
                    keyword: "pattern",
                    params: { pattern: "^[ \\w]+$" },
                    message: 'must match pattern "' + "^[ \\w]+$" + '"',
                  }
                  if (vErrors === null) {
                    vErrors = [err42]
                  } else {
                    vErrors.push(err42)
                  }
                  errors++
                }
              } else {
                const err43 = {
                  instancePath:
                    instancePath +
                    "/tags/" +
                    key3.replace(/~/g, "~0").replace(/\//g, "~1") +
                    "/name",
                  schemaPath:
                    "#/definitions/TagDefinition/properties/name/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err43]
                } else {
                  vErrors.push(err43)
                }
                errors++
              }
            }
            if (data11.description !== undefined) {
              let data13 = data11.description
              if (typeof data13 === "string") {
                if (func4(data13) > 200) {
                  const err44 = {
                    instancePath:
                      instancePath +
                      "/tags/" +
                      key3.replace(/~/g, "~0").replace(/\//g, "~1") +
                      "/description",
                    schemaPath:
                      "#/definitions/TagDefinition/properties/description/maxLength",
                    keyword: "maxLength",
                    params: { limit: 200 },
                    message: "must NOT have more than 200 characters",
                  }
                  if (vErrors === null) {
                    vErrors = [err44]
                  } else {
                    vErrors.push(err44)
                  }
                  errors++
                }
                if (func4(data13) < 1) {
                  const err45 = {
                    instancePath:
                      instancePath +
                      "/tags/" +
                      key3.replace(/~/g, "~0").replace(/\//g, "~1") +
                      "/description",
                    schemaPath:
                      "#/definitions/TagDefinition/properties/description/minLength",
                    keyword: "minLength",
                    params: { limit: 1 },
                    message: "must NOT have fewer than 1 characters",
                  }
                  if (vErrors === null) {
                    vErrors = [err45]
                  } else {
                    vErrors.push(err45)
                  }
                  errors++
                }
                if (!pattern11.test(data13)) {
                  const err46 = {
                    instancePath:
                      instancePath +
                      "/tags/" +
                      key3.replace(/~/g, "~0").replace(/\//g, "~1") +
                      "/description",
                    schemaPath:
                      "#/definitions/TagDefinition/properties/description/pattern",
                    keyword: "pattern",
                    params: { pattern: "^[ \\w\\.,:]+$" },
                    message: 'must match pattern "' + "^[ \\w\\.,:]+$" + '"',
                  }
                  if (vErrors === null) {
                    vErrors = [err46]
                  } else {
                    vErrors.push(err46)
                  }
                  errors++
                }
              } else {
                const err47 = {
                  instancePath:
                    instancePath +
                    "/tags/" +
                    key3.replace(/~/g, "~0").replace(/\//g, "~1") +
                    "/description",
                  schemaPath:
                    "#/definitions/TagDefinition/properties/description/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err47]
                } else {
                  vErrors.push(err47)
                }
                errors++
              }
            }
          } else {
            const err48 = {
              instancePath:
                instancePath +
                "/tags/" +
                key3.replace(/~/g, "~0").replace(/\//g, "~1"),
              schemaPath: "#/definitions/TagDefinition/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err48]
            } else {
              vErrors.push(err48)
            }
            errors++
          }
        }
      } else {
        const err49 = {
          instancePath: instancePath + "/tags",
          schemaPath: "#/properties/tags/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err49]
        } else {
          vErrors.push(err49)
        }
        errors++
      }
    }
    if (data.logoURI !== undefined) {
      if (!(typeof data.logoURI === "string")) {
        const err50 = {
          instancePath: instancePath + "/logoURI",
          schemaPath: "#/properties/logoURI/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err50]
        } else {
          vErrors.push(err50)
        }
        errors++
      }
    }
  } else {
    const err51 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err51]
    } else {
      vErrors.push(err51)
    }
    errors++
  }
  validate11.errors = vErrors
  return errors === 0
}
exports.isValid0xSwapPriceResponse = validate22
const schema28 = {
  $schema: "http://json-schema.org/draft-07/schema#",
  oneOf: [
    {
      type: "object",
      properties: {
        liquidityAvailable: { const: true },
        allowanceTarget: { oneOf: [{ type: "string" }, { type: "null" }] },
        blockNumber: { type: "string" },
        buyAmount: { type: "string" },
        buyToken: { type: "string" },
        fees: {
          type: "object",
          properties: {
            integratorFee: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    amount: { type: "string" },
                    token: { type: "string" },
                    type: { const: "volume" },
                  },
                  required: ["amount", "token", "type"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            integratorFees: {
              oneOf: [
                {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      amount: { type: "string" },
                      token: { type: "string" },
                      type: { const: "volume" },
                    },
                    required: ["amount", "token", "type"],
                    additionalProperties: false,
                  },
                },
                { type: "null" },
              ],
            },
            zeroExFee: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    amount: { type: "string" },
                    token: { type: "string" },
                    type: { const: "volume" },
                  },
                  required: ["amount", "token", "type"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            gasFee: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    amount: { type: "string" },
                    token: { type: "string" },
                    type: { const: "gas" },
                  },
                  required: ["amount", "token", "type"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
          },
          required: ["integratorFee", "integratorFees", "zeroExFee", "gasFee"],
          additionalProperties: false,
        },
        gas: { oneOf: [{ type: "string" }, { type: "null" }] },
        gasPrice: { type: "string" },
        issues: {
          type: "object",
          properties: {
            allowance: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    actual: { type: "string" },
                    spender: { type: "string" },
                  },
                  required: ["actual", "spender"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            balance: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    actual: { type: "string" },
                    expected: { type: "string" },
                  },
                  required: ["token", "actual", "expected"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            simulationIncomplete: { type: "boolean" },
            invalidSourcesPassed: { type: "array", items: { type: "string" } },
          },
          required: [
            "allowance",
            "balance",
            "simulationIncomplete",
            "invalidSourcesPassed",
          ],
          additionalProperties: false,
        },
        minBuyAmount: { type: "string" },
        route: {
          type: "object",
          properties: {
            fills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string" },
                  to: { type: "string" },
                  source: { type: "string" },
                  proportionBps: { type: "string" },
                },
                required: ["from", "to", "source", "proportionBps"],
                additionalProperties: false,
              },
            },
            tokens: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  address: { type: "string" },
                  symbol: { type: "string" },
                },
                required: ["address", "symbol"],
                additionalProperties: false,
              },
            },
          },
          required: ["fills", "tokens"],
          additionalProperties: false,
        },
        sellAmount: { type: "string" },
        sellToken: { type: "string" },
        tokenMetadata: {
          type: "object",
          properties: {
            buyToken: {
              type: "object",
              properties: {
                buyTaxBps: { oneOf: [{ type: "string" }, { type: "null" }] },
                sellTaxBps: { oneOf: [{ type: "string" }, { type: "null" }] },
                transferTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
              },
              required: ["buyTaxBps", "sellTaxBps", "transferTaxBps"],
              additionalProperties: false,
            },
            sellToken: {
              type: "object",
              properties: {
                buyTaxBps: { oneOf: [{ type: "string" }, { type: "null" }] },
                sellTaxBps: { oneOf: [{ type: "string" }, { type: "null" }] },
                transferTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
              },
              required: ["buyTaxBps", "sellTaxBps", "transferTaxBps"],
              additionalProperties: false,
            },
          },
          required: ["buyToken", "sellToken"],
          additionalProperties: false,
        },
        totalNetworkFee: { oneOf: [{ type: "string" }, { type: "null" }] },
        zid: { type: "string" },
      },
      required: [
        "liquidityAvailable",
        "allowanceTarget",
        "blockNumber",
        "buyAmount",
        "buyToken",
        "fees",
        "gas",
        "gasPrice",
        "issues",
        "minBuyAmount",
        "route",
        "sellAmount",
        "sellToken",
        "tokenMetadata",
        "totalNetworkFee",
        "zid",
      ],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        liquidityAvailable: { const: false },
        zid: { type: "string" },
      },
      required: ["liquidityAvailable", "zid"],
      additionalProperties: false,
    },
  ],
}
const func32 = Object.prototype.hasOwnProperty
function validate22(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  let passing0 = null
  const _errs1 = errors
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.liquidityAvailable === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "liquidityAvailable" },
        message: "must have required property '" + "liquidityAvailable" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.allowanceTarget === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "allowanceTarget" },
        message: "must have required property '" + "allowanceTarget" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.blockNumber === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "blockNumber" },
        message: "must have required property '" + "blockNumber" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.buyAmount === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "buyAmount" },
        message: "must have required property '" + "buyAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.buyToken === undefined) {
      const err4 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "buyToken" },
        message: "must have required property '" + "buyToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err4]
      } else {
        vErrors.push(err4)
      }
      errors++
    }
    if (data.fees === undefined) {
      const err5 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "fees" },
        message: "must have required property '" + "fees" + "'",
      }
      if (vErrors === null) {
        vErrors = [err5]
      } else {
        vErrors.push(err5)
      }
      errors++
    }
    if (data.gas === undefined) {
      const err6 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "gas" },
        message: "must have required property '" + "gas" + "'",
      }
      if (vErrors === null) {
        vErrors = [err6]
      } else {
        vErrors.push(err6)
      }
      errors++
    }
    if (data.gasPrice === undefined) {
      const err7 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "gasPrice" },
        message: "must have required property '" + "gasPrice" + "'",
      }
      if (vErrors === null) {
        vErrors = [err7]
      } else {
        vErrors.push(err7)
      }
      errors++
    }
    if (data.issues === undefined) {
      const err8 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "issues" },
        message: "must have required property '" + "issues" + "'",
      }
      if (vErrors === null) {
        vErrors = [err8]
      } else {
        vErrors.push(err8)
      }
      errors++
    }
    if (data.minBuyAmount === undefined) {
      const err9 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "minBuyAmount" },
        message: "must have required property '" + "minBuyAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err9]
      } else {
        vErrors.push(err9)
      }
      errors++
    }
    if (data.route === undefined) {
      const err10 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "route" },
        message: "must have required property '" + "route" + "'",
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
    }
    if (data.sellAmount === undefined) {
      const err11 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "sellAmount" },
        message: "must have required property '" + "sellAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err11]
      } else {
        vErrors.push(err11)
      }
      errors++
    }
    if (data.sellToken === undefined) {
      const err12 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "sellToken" },
        message: "must have required property '" + "sellToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err12]
      } else {
        vErrors.push(err12)
      }
      errors++
    }
    if (data.tokenMetadata === undefined) {
      const err13 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "tokenMetadata" },
        message: "must have required property '" + "tokenMetadata" + "'",
      }
      if (vErrors === null) {
        vErrors = [err13]
      } else {
        vErrors.push(err13)
      }
      errors++
    }
    if (data.totalNetworkFee === undefined) {
      const err14 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "totalNetworkFee" },
        message: "must have required property '" + "totalNetworkFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err14]
      } else {
        vErrors.push(err14)
      }
      errors++
    }
    if (data.zid === undefined) {
      const err15 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "zid" },
        message: "must have required property '" + "zid" + "'",
      }
      if (vErrors === null) {
        vErrors = [err15]
      } else {
        vErrors.push(err15)
      }
      errors++
    }
    for (const key0 in data) {
      if (!func32.call(schema28.oneOf[0].properties, key0)) {
        const err16 = {
          instancePath,
          schemaPath: "#/oneOf/0/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: key0 },
          message: "must NOT have additional properties",
        }
        if (vErrors === null) {
          vErrors = [err16]
        } else {
          vErrors.push(err16)
        }
        errors++
      }
    }
    if (data.liquidityAvailable !== undefined) {
      if (true !== data.liquidityAvailable) {
        const err17 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/oneOf/0/properties/liquidityAvailable/const",
          keyword: "const",
          params: { allowedValue: true },
          message: "must be equal to constant",
        }
        if (vErrors === null) {
          vErrors = [err17]
        } else {
          vErrors.push(err17)
        }
        errors++
      }
    }
    if (data.allowanceTarget !== undefined) {
      let data1 = data.allowanceTarget
      const _errs6 = errors
      let valid2 = false
      let passing1 = null
      const _errs7 = errors
      if (typeof data1 !== "string") {
        const err18 = {
          instancePath: instancePath + "/allowanceTarget",
          schemaPath: "#/oneOf/0/properties/allowanceTarget/oneOf/0/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err18]
        } else {
          vErrors.push(err18)
        }
        errors++
      }
      var _valid1 = _errs7 === errors
      if (_valid1) {
        valid2 = true
        passing1 = 0
      }
      const _errs9 = errors
      if (data1 !== null) {
        const err19 = {
          instancePath: instancePath + "/allowanceTarget",
          schemaPath: "#/oneOf/0/properties/allowanceTarget/oneOf/1/type",
          keyword: "type",
          params: { type: "null" },
          message: "must be null",
        }
        if (vErrors === null) {
          vErrors = [err19]
        } else {
          vErrors.push(err19)
        }
        errors++
      }
      var _valid1 = _errs9 === errors
      if (_valid1 && valid2) {
        valid2 = false
        passing1 = [passing1, 1]
      } else {
        if (_valid1) {
          valid2 = true
          passing1 = 1
        }
      }
      if (!valid2) {
        const err20 = {
          instancePath: instancePath + "/allowanceTarget",
          schemaPath: "#/oneOf/0/properties/allowanceTarget/oneOf",
          keyword: "oneOf",
          params: { passingSchemas: passing1 },
          message: "must match exactly one schema in oneOf",
        }
        if (vErrors === null) {
          vErrors = [err20]
        } else {
          vErrors.push(err20)
        }
        errors++
      } else {
        errors = _errs6
        if (vErrors !== null) {
          if (_errs6) {
            vErrors.length = _errs6
          } else {
            vErrors = null
          }
        }
      }
    }
    if (data.blockNumber !== undefined) {
      if (typeof data.blockNumber !== "string") {
        const err21 = {
          instancePath: instancePath + "/blockNumber",
          schemaPath: "#/oneOf/0/properties/blockNumber/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err21]
        } else {
          vErrors.push(err21)
        }
        errors++
      }
    }
    if (data.buyAmount !== undefined) {
      if (typeof data.buyAmount !== "string") {
        const err22 = {
          instancePath: instancePath + "/buyAmount",
          schemaPath: "#/oneOf/0/properties/buyAmount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err22]
        } else {
          vErrors.push(err22)
        }
        errors++
      }
    }
    if (data.buyToken !== undefined) {
      if (typeof data.buyToken !== "string") {
        const err23 = {
          instancePath: instancePath + "/buyToken",
          schemaPath: "#/oneOf/0/properties/buyToken/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err23]
        } else {
          vErrors.push(err23)
        }
        errors++
      }
    }
    if (data.fees !== undefined) {
      let data5 = data.fees
      if (data5 && typeof data5 == "object" && !Array.isArray(data5)) {
        if (data5.integratorFee === undefined) {
          const err24 = {
            instancePath: instancePath + "/fees",
            schemaPath: "#/oneOf/0/properties/fees/required",
            keyword: "required",
            params: { missingProperty: "integratorFee" },
            message: "must have required property '" + "integratorFee" + "'",
          }
          if (vErrors === null) {
            vErrors = [err24]
          } else {
            vErrors.push(err24)
          }
          errors++
        }
        if (data5.integratorFees === undefined) {
          const err25 = {
            instancePath: instancePath + "/fees",
            schemaPath: "#/oneOf/0/properties/fees/required",
            keyword: "required",
            params: { missingProperty: "integratorFees" },
            message: "must have required property '" + "integratorFees" + "'",
          }
          if (vErrors === null) {
            vErrors = [err25]
          } else {
            vErrors.push(err25)
          }
          errors++
        }
        if (data5.zeroExFee === undefined) {
          const err26 = {
            instancePath: instancePath + "/fees",
            schemaPath: "#/oneOf/0/properties/fees/required",
            keyword: "required",
            params: { missingProperty: "zeroExFee" },
            message: "must have required property '" + "zeroExFee" + "'",
          }
          if (vErrors === null) {
            vErrors = [err26]
          } else {
            vErrors.push(err26)
          }
          errors++
        }
        if (data5.gasFee === undefined) {
          const err27 = {
            instancePath: instancePath + "/fees",
            schemaPath: "#/oneOf/0/properties/fees/required",
            keyword: "required",
            params: { missingProperty: "gasFee" },
            message: "must have required property '" + "gasFee" + "'",
          }
          if (vErrors === null) {
            vErrors = [err27]
          } else {
            vErrors.push(err27)
          }
          errors++
        }
        for (const key1 in data5) {
          if (
            !(
              key1 === "integratorFee" ||
              key1 === "integratorFees" ||
              key1 === "zeroExFee" ||
              key1 === "gasFee"
            )
          ) {
            const err28 = {
              instancePath: instancePath + "/fees",
              schemaPath: "#/oneOf/0/properties/fees/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key1 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err28]
            } else {
              vErrors.push(err28)
            }
            errors++
          }
        }
        if (data5.integratorFee !== undefined) {
          let data6 = data5.integratorFee
          const _errs21 = errors
          let valid4 = false
          let passing2 = null
          const _errs22 = errors
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.amount === undefined) {
              const err29 = {
                instancePath: instancePath + "/fees/integratorFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "amount" },
                message: "must have required property '" + "amount" + "'",
              }
              if (vErrors === null) {
                vErrors = [err29]
              } else {
                vErrors.push(err29)
              }
              errors++
            }
            if (data6.token === undefined) {
              const err30 = {
                instancePath: instancePath + "/fees/integratorFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "token" },
                message: "must have required property '" + "token" + "'",
              }
              if (vErrors === null) {
                vErrors = [err30]
              } else {
                vErrors.push(err30)
              }
              errors++
            }
            if (data6.type === undefined) {
              const err31 = {
                instancePath: instancePath + "/fees/integratorFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "type" },
                message: "must have required property '" + "type" + "'",
              }
              if (vErrors === null) {
                vErrors = [err31]
              } else {
                vErrors.push(err31)
              }
              errors++
            }
            for (const key2 in data6) {
              if (!(key2 === "amount" || key2 === "token" || key2 === "type")) {
                const err32 = {
                  instancePath: instancePath + "/fees/integratorFee",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key2 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err32]
                } else {
                  vErrors.push(err32)
                }
                errors++
              }
            }
            if (data6.amount !== undefined) {
              if (typeof data6.amount !== "string") {
                const err33 = {
                  instancePath: instancePath + "/fees/integratorFee/amount",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/properties/amount/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err33]
                } else {
                  vErrors.push(err33)
                }
                errors++
              }
            }
            if (data6.token !== undefined) {
              if (typeof data6.token !== "string") {
                const err34 = {
                  instancePath: instancePath + "/fees/integratorFee/token",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/properties/token/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err34]
                } else {
                  vErrors.push(err34)
                }
                errors++
              }
            }
            if (data6.type !== undefined) {
              if ("volume" !== data6.type) {
                const err35 = {
                  instancePath: instancePath + "/fees/integratorFee/type",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "volume" },
                  message: "must be equal to constant",
                }
                if (vErrors === null) {
                  vErrors = [err35]
                } else {
                  vErrors.push(err35)
                }
                errors++
              }
            }
          } else {
            const err36 = {
              instancePath: instancePath + "/fees/integratorFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err36]
            } else {
              vErrors.push(err36)
            }
            errors++
          }
          var _valid2 = _errs22 === errors
          if (_valid2) {
            valid4 = true
            passing2 = 0
          }
          const _errs30 = errors
          if (data6 !== null) {
            const err37 = {
              instancePath: instancePath + "/fees/integratorFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err37]
            } else {
              vErrors.push(err37)
            }
            errors++
          }
          var _valid2 = _errs30 === errors
          if (_valid2 && valid4) {
            valid4 = false
            passing2 = [passing2, 1]
          } else {
            if (_valid2) {
              valid4 = true
              passing2 = 1
            }
          }
          if (!valid4) {
            const err38 = {
              instancePath: instancePath + "/fees/integratorFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFee/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing2 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err38]
            } else {
              vErrors.push(err38)
            }
            errors++
          } else {
            errors = _errs21
            if (vErrors !== null) {
              if (_errs21) {
                vErrors.length = _errs21
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data5.integratorFees !== undefined) {
          let data10 = data5.integratorFees
          const _errs33 = errors
          let valid6 = false
          let passing3 = null
          const _errs34 = errors
          if (Array.isArray(data10)) {
            const len0 = data10.length
            for (let i0 = 0; i0 < len0; i0++) {
              let data11 = data10[i0]
              if (
                data11 &&
                typeof data11 == "object" &&
                !Array.isArray(data11)
              ) {
                if (data11.amount === undefined) {
                  const err39 = {
                    instancePath: instancePath + "/fees/integratorFees/" + i0,
                    schemaPath:
                      "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/required",
                    keyword: "required",
                    params: { missingProperty: "amount" },
                    message: "must have required property '" + "amount" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err39]
                  } else {
                    vErrors.push(err39)
                  }
                  errors++
                }
                if (data11.token === undefined) {
                  const err40 = {
                    instancePath: instancePath + "/fees/integratorFees/" + i0,
                    schemaPath:
                      "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/required",
                    keyword: "required",
                    params: { missingProperty: "token" },
                    message: "must have required property '" + "token" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err40]
                  } else {
                    vErrors.push(err40)
                  }
                  errors++
                }
                if (data11.type === undefined) {
                  const err41 = {
                    instancePath: instancePath + "/fees/integratorFees/" + i0,
                    schemaPath:
                      "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/required",
                    keyword: "required",
                    params: { missingProperty: "type" },
                    message: "must have required property '" + "type" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err41]
                  } else {
                    vErrors.push(err41)
                  }
                  errors++
                }
                for (const key3 in data11) {
                  if (
                    !(key3 === "amount" || key3 === "token" || key3 === "type")
                  ) {
                    const err42 = {
                      instancePath: instancePath + "/fees/integratorFees/" + i0,
                      schemaPath:
                        "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/additionalProperties",
                      keyword: "additionalProperties",
                      params: { additionalProperty: key3 },
                      message: "must NOT have additional properties",
                    }
                    if (vErrors === null) {
                      vErrors = [err42]
                    } else {
                      vErrors.push(err42)
                    }
                    errors++
                  }
                }
                if (data11.amount !== undefined) {
                  if (typeof data11.amount !== "string") {
                    const err43 = {
                      instancePath:
                        instancePath + "/fees/integratorFees/" + i0 + "/amount",
                      schemaPath:
                        "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/properties/amount/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err43]
                    } else {
                      vErrors.push(err43)
                    }
                    errors++
                  }
                }
                if (data11.token !== undefined) {
                  if (typeof data11.token !== "string") {
                    const err44 = {
                      instancePath:
                        instancePath + "/fees/integratorFees/" + i0 + "/token",
                      schemaPath:
                        "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/properties/token/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err44]
                    } else {
                      vErrors.push(err44)
                    }
                    errors++
                  }
                }
                if (data11.type !== undefined) {
                  if ("volume" !== data11.type) {
                    const err45 = {
                      instancePath:
                        instancePath + "/fees/integratorFees/" + i0 + "/type",
                      schemaPath:
                        "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/properties/type/const",
                      keyword: "const",
                      params: { allowedValue: "volume" },
                      message: "must be equal to constant",
                    }
                    if (vErrors === null) {
                      vErrors = [err45]
                    } else {
                      vErrors.push(err45)
                    }
                    errors++
                  }
                }
              } else {
                const err46 = {
                  instancePath: instancePath + "/fees/integratorFees/" + i0,
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                }
                if (vErrors === null) {
                  vErrors = [err46]
                } else {
                  vErrors.push(err46)
                }
                errors++
              }
            }
          } else {
            const err47 = {
              instancePath: instancePath + "/fees/integratorFees",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array",
            }
            if (vErrors === null) {
              vErrors = [err47]
            } else {
              vErrors.push(err47)
            }
            errors++
          }
          var _valid3 = _errs34 === errors
          if (_valid3) {
            valid6 = true
            passing3 = 0
          }
          const _errs44 = errors
          if (data10 !== null) {
            const err48 = {
              instancePath: instancePath + "/fees/integratorFees",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err48]
            } else {
              vErrors.push(err48)
            }
            errors++
          }
          var _valid3 = _errs44 === errors
          if (_valid3 && valid6) {
            valid6 = false
            passing3 = [passing3, 1]
          } else {
            if (_valid3) {
              valid6 = true
              passing3 = 1
            }
          }
          if (!valid6) {
            const err49 = {
              instancePath: instancePath + "/fees/integratorFees",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFees/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing3 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err49]
            } else {
              vErrors.push(err49)
            }
            errors++
          } else {
            errors = _errs33
            if (vErrors !== null) {
              if (_errs33) {
                vErrors.length = _errs33
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data5.zeroExFee !== undefined) {
          let data15 = data5.zeroExFee
          const _errs47 = errors
          let valid10 = false
          let passing4 = null
          const _errs48 = errors
          if (data15 && typeof data15 == "object" && !Array.isArray(data15)) {
            if (data15.amount === undefined) {
              const err50 = {
                instancePath: instancePath + "/fees/zeroExFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "amount" },
                message: "must have required property '" + "amount" + "'",
              }
              if (vErrors === null) {
                vErrors = [err50]
              } else {
                vErrors.push(err50)
              }
              errors++
            }
            if (data15.token === undefined) {
              const err51 = {
                instancePath: instancePath + "/fees/zeroExFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "token" },
                message: "must have required property '" + "token" + "'",
              }
              if (vErrors === null) {
                vErrors = [err51]
              } else {
                vErrors.push(err51)
              }
              errors++
            }
            if (data15.type === undefined) {
              const err52 = {
                instancePath: instancePath + "/fees/zeroExFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "type" },
                message: "must have required property '" + "type" + "'",
              }
              if (vErrors === null) {
                vErrors = [err52]
              } else {
                vErrors.push(err52)
              }
              errors++
            }
            for (const key4 in data15) {
              if (!(key4 === "amount" || key4 === "token" || key4 === "type")) {
                const err53 = {
                  instancePath: instancePath + "/fees/zeroExFee",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key4 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err53]
                } else {
                  vErrors.push(err53)
                }
                errors++
              }
            }
            if (data15.amount !== undefined) {
              if (typeof data15.amount !== "string") {
                const err54 = {
                  instancePath: instancePath + "/fees/zeroExFee/amount",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/properties/amount/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err54]
                } else {
                  vErrors.push(err54)
                }
                errors++
              }
            }
            if (data15.token !== undefined) {
              if (typeof data15.token !== "string") {
                const err55 = {
                  instancePath: instancePath + "/fees/zeroExFee/token",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/properties/token/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err55]
                } else {
                  vErrors.push(err55)
                }
                errors++
              }
            }
            if (data15.type !== undefined) {
              if ("volume" !== data15.type) {
                const err56 = {
                  instancePath: instancePath + "/fees/zeroExFee/type",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "volume" },
                  message: "must be equal to constant",
                }
                if (vErrors === null) {
                  vErrors = [err56]
                } else {
                  vErrors.push(err56)
                }
                errors++
              }
            }
          } else {
            const err57 = {
              instancePath: instancePath + "/fees/zeroExFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err57]
            } else {
              vErrors.push(err57)
            }
            errors++
          }
          var _valid4 = _errs48 === errors
          if (_valid4) {
            valid10 = true
            passing4 = 0
          }
          const _errs56 = errors
          if (data15 !== null) {
            const err58 = {
              instancePath: instancePath + "/fees/zeroExFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err58]
            } else {
              vErrors.push(err58)
            }
            errors++
          }
          var _valid4 = _errs56 === errors
          if (_valid4 && valid10) {
            valid10 = false
            passing4 = [passing4, 1]
          } else {
            if (_valid4) {
              valid10 = true
              passing4 = 1
            }
          }
          if (!valid10) {
            const err59 = {
              instancePath: instancePath + "/fees/zeroExFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing4 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err59]
            } else {
              vErrors.push(err59)
            }
            errors++
          } else {
            errors = _errs47
            if (vErrors !== null) {
              if (_errs47) {
                vErrors.length = _errs47
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data5.gasFee !== undefined) {
          let data19 = data5.gasFee
          const _errs59 = errors
          let valid12 = false
          let passing5 = null
          const _errs60 = errors
          if (data19 && typeof data19 == "object" && !Array.isArray(data19)) {
            if (data19.amount === undefined) {
              const err60 = {
                instancePath: instancePath + "/fees/gasFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "amount" },
                message: "must have required property '" + "amount" + "'",
              }
              if (vErrors === null) {
                vErrors = [err60]
              } else {
                vErrors.push(err60)
              }
              errors++
            }
            if (data19.token === undefined) {
              const err61 = {
                instancePath: instancePath + "/fees/gasFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "token" },
                message: "must have required property '" + "token" + "'",
              }
              if (vErrors === null) {
                vErrors = [err61]
              } else {
                vErrors.push(err61)
              }
              errors++
            }
            if (data19.type === undefined) {
              const err62 = {
                instancePath: instancePath + "/fees/gasFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "type" },
                message: "must have required property '" + "type" + "'",
              }
              if (vErrors === null) {
                vErrors = [err62]
              } else {
                vErrors.push(err62)
              }
              errors++
            }
            for (const key5 in data19) {
              if (!(key5 === "amount" || key5 === "token" || key5 === "type")) {
                const err63 = {
                  instancePath: instancePath + "/fees/gasFee",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key5 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err63]
                } else {
                  vErrors.push(err63)
                }
                errors++
              }
            }
            if (data19.amount !== undefined) {
              if (typeof data19.amount !== "string") {
                const err64 = {
                  instancePath: instancePath + "/fees/gasFee/amount",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/properties/amount/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err64]
                } else {
                  vErrors.push(err64)
                }
                errors++
              }
            }
            if (data19.token !== undefined) {
              if (typeof data19.token !== "string") {
                const err65 = {
                  instancePath: instancePath + "/fees/gasFee/token",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/properties/token/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err65]
                } else {
                  vErrors.push(err65)
                }
                errors++
              }
            }
            if (data19.type !== undefined) {
              if ("gas" !== data19.type) {
                const err66 = {
                  instancePath: instancePath + "/fees/gasFee/type",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/properties/type/const",
                  keyword: "const",
                  params: { allowedValue: "gas" },
                  message: "must be equal to constant",
                }
                if (vErrors === null) {
                  vErrors = [err66]
                } else {
                  vErrors.push(err66)
                }
                errors++
              }
            }
          } else {
            const err67 = {
              instancePath: instancePath + "/fees/gasFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err67]
            } else {
              vErrors.push(err67)
            }
            errors++
          }
          var _valid5 = _errs60 === errors
          if (_valid5) {
            valid12 = true
            passing5 = 0
          }
          const _errs68 = errors
          if (data19 !== null) {
            const err68 = {
              instancePath: instancePath + "/fees/gasFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/gasFee/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err68]
            } else {
              vErrors.push(err68)
            }
            errors++
          }
          var _valid5 = _errs68 === errors
          if (_valid5 && valid12) {
            valid12 = false
            passing5 = [passing5, 1]
          } else {
            if (_valid5) {
              valid12 = true
              passing5 = 1
            }
          }
          if (!valid12) {
            const err69 = {
              instancePath: instancePath + "/fees/gasFee",
              schemaPath: "#/oneOf/0/properties/fees/properties/gasFee/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing5 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err69]
            } else {
              vErrors.push(err69)
            }
            errors++
          } else {
            errors = _errs59
            if (vErrors !== null) {
              if (_errs59) {
                vErrors.length = _errs59
              } else {
                vErrors = null
              }
            }
          }
        }
      } else {
        const err70 = {
          instancePath: instancePath + "/fees",
          schemaPath: "#/oneOf/0/properties/fees/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err70]
        } else {
          vErrors.push(err70)
        }
        errors++
      }
    }
    if (data.gas !== undefined) {
      let data23 = data.gas
      const _errs71 = errors
      let valid14 = false
      let passing6 = null
      const _errs72 = errors
      if (typeof data23 !== "string") {
        const err71 = {
          instancePath: instancePath + "/gas",
          schemaPath: "#/oneOf/0/properties/gas/oneOf/0/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err71]
        } else {
          vErrors.push(err71)
        }
        errors++
      }
      var _valid6 = _errs72 === errors
      if (_valid6) {
        valid14 = true
        passing6 = 0
      }
      const _errs74 = errors
      if (data23 !== null) {
        const err72 = {
          instancePath: instancePath + "/gas",
          schemaPath: "#/oneOf/0/properties/gas/oneOf/1/type",
          keyword: "type",
          params: { type: "null" },
          message: "must be null",
        }
        if (vErrors === null) {
          vErrors = [err72]
        } else {
          vErrors.push(err72)
        }
        errors++
      }
      var _valid6 = _errs74 === errors
      if (_valid6 && valid14) {
        valid14 = false
        passing6 = [passing6, 1]
      } else {
        if (_valid6) {
          valid14 = true
          passing6 = 1
        }
      }
      if (!valid14) {
        const err73 = {
          instancePath: instancePath + "/gas",
          schemaPath: "#/oneOf/0/properties/gas/oneOf",
          keyword: "oneOf",
          params: { passingSchemas: passing6 },
          message: "must match exactly one schema in oneOf",
        }
        if (vErrors === null) {
          vErrors = [err73]
        } else {
          vErrors.push(err73)
        }
        errors++
      } else {
        errors = _errs71
        if (vErrors !== null) {
          if (_errs71) {
            vErrors.length = _errs71
          } else {
            vErrors = null
          }
        }
      }
    }
    if (data.gasPrice !== undefined) {
      if (typeof data.gasPrice !== "string") {
        const err74 = {
          instancePath: instancePath + "/gasPrice",
          schemaPath: "#/oneOf/0/properties/gasPrice/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err74]
        } else {
          vErrors.push(err74)
        }
        errors++
      }
    }
    if (data.issues !== undefined) {
      let data25 = data.issues
      if (data25 && typeof data25 == "object" && !Array.isArray(data25)) {
        if (data25.allowance === undefined) {
          const err75 = {
            instancePath: instancePath + "/issues",
            schemaPath: "#/oneOf/0/properties/issues/required",
            keyword: "required",
            params: { missingProperty: "allowance" },
            message: "must have required property '" + "allowance" + "'",
          }
          if (vErrors === null) {
            vErrors = [err75]
          } else {
            vErrors.push(err75)
          }
          errors++
        }
        if (data25.balance === undefined) {
          const err76 = {
            instancePath: instancePath + "/issues",
            schemaPath: "#/oneOf/0/properties/issues/required",
            keyword: "required",
            params: { missingProperty: "balance" },
            message: "must have required property '" + "balance" + "'",
          }
          if (vErrors === null) {
            vErrors = [err76]
          } else {
            vErrors.push(err76)
          }
          errors++
        }
        if (data25.simulationIncomplete === undefined) {
          const err77 = {
            instancePath: instancePath + "/issues",
            schemaPath: "#/oneOf/0/properties/issues/required",
            keyword: "required",
            params: { missingProperty: "simulationIncomplete" },
            message:
              "must have required property '" + "simulationIncomplete" + "'",
          }
          if (vErrors === null) {
            vErrors = [err77]
          } else {
            vErrors.push(err77)
          }
          errors++
        }
        if (data25.invalidSourcesPassed === undefined) {
          const err78 = {
            instancePath: instancePath + "/issues",
            schemaPath: "#/oneOf/0/properties/issues/required",
            keyword: "required",
            params: { missingProperty: "invalidSourcesPassed" },
            message:
              "must have required property '" + "invalidSourcesPassed" + "'",
          }
          if (vErrors === null) {
            vErrors = [err78]
          } else {
            vErrors.push(err78)
          }
          errors++
        }
        for (const key6 in data25) {
          if (
            !(
              key6 === "allowance" ||
              key6 === "balance" ||
              key6 === "simulationIncomplete" ||
              key6 === "invalidSourcesPassed"
            )
          ) {
            const err79 = {
              instancePath: instancePath + "/issues",
              schemaPath: "#/oneOf/0/properties/issues/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key6 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err79]
            } else {
              vErrors.push(err79)
            }
            errors++
          }
        }
        if (data25.allowance !== undefined) {
          let data26 = data25.allowance
          const _errs82 = errors
          let valid16 = false
          let passing7 = null
          const _errs83 = errors
          if (data26 && typeof data26 == "object" && !Array.isArray(data26)) {
            if (data26.actual === undefined) {
              const err80 = {
                instancePath: instancePath + "/issues/allowance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "actual" },
                message: "must have required property '" + "actual" + "'",
              }
              if (vErrors === null) {
                vErrors = [err80]
              } else {
                vErrors.push(err80)
              }
              errors++
            }
            if (data26.spender === undefined) {
              const err81 = {
                instancePath: instancePath + "/issues/allowance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "spender" },
                message: "must have required property '" + "spender" + "'",
              }
              if (vErrors === null) {
                vErrors = [err81]
              } else {
                vErrors.push(err81)
              }
              errors++
            }
            for (const key7 in data26) {
              if (!(key7 === "actual" || key7 === "spender")) {
                const err82 = {
                  instancePath: instancePath + "/issues/allowance",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key7 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err82]
                } else {
                  vErrors.push(err82)
                }
                errors++
              }
            }
            if (data26.actual !== undefined) {
              if (typeof data26.actual !== "string") {
                const err83 = {
                  instancePath: instancePath + "/issues/allowance/actual",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/properties/actual/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err83]
                } else {
                  vErrors.push(err83)
                }
                errors++
              }
            }
            if (data26.spender !== undefined) {
              if (typeof data26.spender !== "string") {
                const err84 = {
                  instancePath: instancePath + "/issues/allowance/spender",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/properties/spender/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err84]
                } else {
                  vErrors.push(err84)
                }
                errors++
              }
            }
          } else {
            const err85 = {
              instancePath: instancePath + "/issues/allowance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err85]
            } else {
              vErrors.push(err85)
            }
            errors++
          }
          var _valid7 = _errs83 === errors
          if (_valid7) {
            valid16 = true
            passing7 = 0
          }
          const _errs90 = errors
          if (data26 !== null) {
            const err86 = {
              instancePath: instancePath + "/issues/allowance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/allowance/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err86]
            } else {
              vErrors.push(err86)
            }
            errors++
          }
          var _valid7 = _errs90 === errors
          if (_valid7 && valid16) {
            valid16 = false
            passing7 = [passing7, 1]
          } else {
            if (_valid7) {
              valid16 = true
              passing7 = 1
            }
          }
          if (!valid16) {
            const err87 = {
              instancePath: instancePath + "/issues/allowance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/allowance/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing7 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err87]
            } else {
              vErrors.push(err87)
            }
            errors++
          } else {
            errors = _errs82
            if (vErrors !== null) {
              if (_errs82) {
                vErrors.length = _errs82
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data25.balance !== undefined) {
          let data29 = data25.balance
          const _errs93 = errors
          let valid18 = false
          let passing8 = null
          const _errs94 = errors
          if (data29 && typeof data29 == "object" && !Array.isArray(data29)) {
            if (data29.token === undefined) {
              const err88 = {
                instancePath: instancePath + "/issues/balance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/balance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "token" },
                message: "must have required property '" + "token" + "'",
              }
              if (vErrors === null) {
                vErrors = [err88]
              } else {
                vErrors.push(err88)
              }
              errors++
            }
            if (data29.actual === undefined) {
              const err89 = {
                instancePath: instancePath + "/issues/balance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/balance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "actual" },
                message: "must have required property '" + "actual" + "'",
              }
              if (vErrors === null) {
                vErrors = [err89]
              } else {
                vErrors.push(err89)
              }
              errors++
            }
            if (data29.expected === undefined) {
              const err90 = {
                instancePath: instancePath + "/issues/balance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/balance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "expected" },
                message: "must have required property '" + "expected" + "'",
              }
              if (vErrors === null) {
                vErrors = [err90]
              } else {
                vErrors.push(err90)
              }
              errors++
            }
            for (const key8 in data29) {
              if (
                !(key8 === "token" || key8 === "actual" || key8 === "expected")
              ) {
                const err91 = {
                  instancePath: instancePath + "/issues/balance",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/balance/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key8 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err91]
                } else {
                  vErrors.push(err91)
                }
                errors++
              }
            }
            if (data29.token !== undefined) {
              if (typeof data29.token !== "string") {
                const err92 = {
                  instancePath: instancePath + "/issues/balance/token",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/balance/oneOf/0/properties/token/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err92]
                } else {
                  vErrors.push(err92)
                }
                errors++
              }
            }
            if (data29.actual !== undefined) {
              if (typeof data29.actual !== "string") {
                const err93 = {
                  instancePath: instancePath + "/issues/balance/actual",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/balance/oneOf/0/properties/actual/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err93]
                } else {
                  vErrors.push(err93)
                }
                errors++
              }
            }
            if (data29.expected !== undefined) {
              if (typeof data29.expected !== "string") {
                const err94 = {
                  instancePath: instancePath + "/issues/balance/expected",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/balance/oneOf/0/properties/expected/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err94]
                } else {
                  vErrors.push(err94)
                }
                errors++
              }
            }
          } else {
            const err95 = {
              instancePath: instancePath + "/issues/balance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/balance/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err95]
            } else {
              vErrors.push(err95)
            }
            errors++
          }
          var _valid8 = _errs94 === errors
          if (_valid8) {
            valid18 = true
            passing8 = 0
          }
          const _errs103 = errors
          if (data29 !== null) {
            const err96 = {
              instancePath: instancePath + "/issues/balance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/balance/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err96]
            } else {
              vErrors.push(err96)
            }
            errors++
          }
          var _valid8 = _errs103 === errors
          if (_valid8 && valid18) {
            valid18 = false
            passing8 = [passing8, 1]
          } else {
            if (_valid8) {
              valid18 = true
              passing8 = 1
            }
          }
          if (!valid18) {
            const err97 = {
              instancePath: instancePath + "/issues/balance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/balance/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing8 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err97]
            } else {
              vErrors.push(err97)
            }
            errors++
          } else {
            errors = _errs93
            if (vErrors !== null) {
              if (_errs93) {
                vErrors.length = _errs93
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data25.simulationIncomplete !== undefined) {
          if (typeof data25.simulationIncomplete !== "boolean") {
            const err98 = {
              instancePath: instancePath + "/issues/simulationIncomplete",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/simulationIncomplete/type",
              keyword: "type",
              params: { type: "boolean" },
              message: "must be boolean",
            }
            if (vErrors === null) {
              vErrors = [err98]
            } else {
              vErrors.push(err98)
            }
            errors++
          }
        }
        if (data25.invalidSourcesPassed !== undefined) {
          let data34 = data25.invalidSourcesPassed
          if (Array.isArray(data34)) {
            const len1 = data34.length
            for (let i1 = 0; i1 < len1; i1++) {
              if (typeof data34[i1] !== "string") {
                const err99 = {
                  instancePath:
                    instancePath + "/issues/invalidSourcesPassed/" + i1,
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/invalidSourcesPassed/items/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err99]
                } else {
                  vErrors.push(err99)
                }
                errors++
              }
            }
          } else {
            const err100 = {
              instancePath: instancePath + "/issues/invalidSourcesPassed",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/invalidSourcesPassed/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array",
            }
            if (vErrors === null) {
              vErrors = [err100]
            } else {
              vErrors.push(err100)
            }
            errors++
          }
        }
      } else {
        const err101 = {
          instancePath: instancePath + "/issues",
          schemaPath: "#/oneOf/0/properties/issues/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err101]
        } else {
          vErrors.push(err101)
        }
        errors++
      }
    }
    if (data.minBuyAmount !== undefined) {
      if (typeof data.minBuyAmount !== "string") {
        const err102 = {
          instancePath: instancePath + "/minBuyAmount",
          schemaPath: "#/oneOf/0/properties/minBuyAmount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err102]
        } else {
          vErrors.push(err102)
        }
        errors++
      }
    }
    if (data.route !== undefined) {
      let data37 = data.route
      if (data37 && typeof data37 == "object" && !Array.isArray(data37)) {
        if (data37.fills === undefined) {
          const err103 = {
            instancePath: instancePath + "/route",
            schemaPath: "#/oneOf/0/properties/route/required",
            keyword: "required",
            params: { missingProperty: "fills" },
            message: "must have required property '" + "fills" + "'",
          }
          if (vErrors === null) {
            vErrors = [err103]
          } else {
            vErrors.push(err103)
          }
          errors++
        }
        if (data37.tokens === undefined) {
          const err104 = {
            instancePath: instancePath + "/route",
            schemaPath: "#/oneOf/0/properties/route/required",
            keyword: "required",
            params: { missingProperty: "tokens" },
            message: "must have required property '" + "tokens" + "'",
          }
          if (vErrors === null) {
            vErrors = [err104]
          } else {
            vErrors.push(err104)
          }
          errors++
        }
        for (const key9 in data37) {
          if (!(key9 === "fills" || key9 === "tokens")) {
            const err105 = {
              instancePath: instancePath + "/route",
              schemaPath: "#/oneOf/0/properties/route/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key9 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err105]
            } else {
              vErrors.push(err105)
            }
            errors++
          }
        }
        if (data37.fills !== undefined) {
          let data38 = data37.fills
          if (Array.isArray(data38)) {
            const len2 = data38.length
            for (let i2 = 0; i2 < len2; i2++) {
              let data39 = data38[i2]
              if (
                data39 &&
                typeof data39 == "object" &&
                !Array.isArray(data39)
              ) {
                if (data39.from === undefined) {
                  const err106 = {
                    instancePath: instancePath + "/route/fills/" + i2,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/fills/items/required",
                    keyword: "required",
                    params: { missingProperty: "from" },
                    message: "must have required property '" + "from" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err106]
                  } else {
                    vErrors.push(err106)
                  }
                  errors++
                }
                if (data39.to === undefined) {
                  const err107 = {
                    instancePath: instancePath + "/route/fills/" + i2,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/fills/items/required",
                    keyword: "required",
                    params: { missingProperty: "to" },
                    message: "must have required property '" + "to" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err107]
                  } else {
                    vErrors.push(err107)
                  }
                  errors++
                }
                if (data39.source === undefined) {
                  const err108 = {
                    instancePath: instancePath + "/route/fills/" + i2,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/fills/items/required",
                    keyword: "required",
                    params: { missingProperty: "source" },
                    message: "must have required property '" + "source" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err108]
                  } else {
                    vErrors.push(err108)
                  }
                  errors++
                }
                if (data39.proportionBps === undefined) {
                  const err109 = {
                    instancePath: instancePath + "/route/fills/" + i2,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/fills/items/required",
                    keyword: "required",
                    params: { missingProperty: "proportionBps" },
                    message:
                      "must have required property '" + "proportionBps" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err109]
                  } else {
                    vErrors.push(err109)
                  }
                  errors++
                }
                for (const key10 in data39) {
                  if (
                    !(
                      key10 === "from" ||
                      key10 === "to" ||
                      key10 === "source" ||
                      key10 === "proportionBps"
                    )
                  ) {
                    const err110 = {
                      instancePath: instancePath + "/route/fills/" + i2,
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/additionalProperties",
                      keyword: "additionalProperties",
                      params: { additionalProperty: key10 },
                      message: "must NOT have additional properties",
                    }
                    if (vErrors === null) {
                      vErrors = [err110]
                    } else {
                      vErrors.push(err110)
                    }
                    errors++
                  }
                }
                if (data39.from !== undefined) {
                  if (typeof data39.from !== "string") {
                    const err111 = {
                      instancePath:
                        instancePath + "/route/fills/" + i2 + "/from",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/properties/from/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err111]
                    } else {
                      vErrors.push(err111)
                    }
                    errors++
                  }
                }
                if (data39.to !== undefined) {
                  if (typeof data39.to !== "string") {
                    const err112 = {
                      instancePath: instancePath + "/route/fills/" + i2 + "/to",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/properties/to/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err112]
                    } else {
                      vErrors.push(err112)
                    }
                    errors++
                  }
                }
                if (data39.source !== undefined) {
                  if (typeof data39.source !== "string") {
                    const err113 = {
                      instancePath:
                        instancePath + "/route/fills/" + i2 + "/source",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/properties/source/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err113]
                    } else {
                      vErrors.push(err113)
                    }
                    errors++
                  }
                }
                if (data39.proportionBps !== undefined) {
                  if (typeof data39.proportionBps !== "string") {
                    const err114 = {
                      instancePath:
                        instancePath + "/route/fills/" + i2 + "/proportionBps",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/properties/proportionBps/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err114]
                    } else {
                      vErrors.push(err114)
                    }
                    errors++
                  }
                }
              } else {
                const err115 = {
                  instancePath: instancePath + "/route/fills/" + i2,
                  schemaPath:
                    "#/oneOf/0/properties/route/properties/fills/items/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                }
                if (vErrors === null) {
                  vErrors = [err115]
                } else {
                  vErrors.push(err115)
                }
                errors++
              }
            }
          } else {
            const err116 = {
              instancePath: instancePath + "/route/fills",
              schemaPath: "#/oneOf/0/properties/route/properties/fills/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array",
            }
            if (vErrors === null) {
              vErrors = [err116]
            } else {
              vErrors.push(err116)
            }
            errors++
          }
        }
        if (data37.tokens !== undefined) {
          let data44 = data37.tokens
          if (Array.isArray(data44)) {
            const len3 = data44.length
            for (let i3 = 0; i3 < len3; i3++) {
              let data45 = data44[i3]
              if (
                data45 &&
                typeof data45 == "object" &&
                !Array.isArray(data45)
              ) {
                if (data45.address === undefined) {
                  const err117 = {
                    instancePath: instancePath + "/route/tokens/" + i3,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/tokens/items/required",
                    keyword: "required",
                    params: { missingProperty: "address" },
                    message: "must have required property '" + "address" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err117]
                  } else {
                    vErrors.push(err117)
                  }
                  errors++
                }
                if (data45.symbol === undefined) {
                  const err118 = {
                    instancePath: instancePath + "/route/tokens/" + i3,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/tokens/items/required",
                    keyword: "required",
                    params: { missingProperty: "symbol" },
                    message: "must have required property '" + "symbol" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err118]
                  } else {
                    vErrors.push(err118)
                  }
                  errors++
                }
                for (const key11 in data45) {
                  if (!(key11 === "address" || key11 === "symbol")) {
                    const err119 = {
                      instancePath: instancePath + "/route/tokens/" + i3,
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/tokens/items/additionalProperties",
                      keyword: "additionalProperties",
                      params: { additionalProperty: key11 },
                      message: "must NOT have additional properties",
                    }
                    if (vErrors === null) {
                      vErrors = [err119]
                    } else {
                      vErrors.push(err119)
                    }
                    errors++
                  }
                }
                if (data45.address !== undefined) {
                  if (typeof data45.address !== "string") {
                    const err120 = {
                      instancePath:
                        instancePath + "/route/tokens/" + i3 + "/address",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/tokens/items/properties/address/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err120]
                    } else {
                      vErrors.push(err120)
                    }
                    errors++
                  }
                }
                if (data45.symbol !== undefined) {
                  if (typeof data45.symbol !== "string") {
                    const err121 = {
                      instancePath:
                        instancePath + "/route/tokens/" + i3 + "/symbol",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/tokens/items/properties/symbol/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err121]
                    } else {
                      vErrors.push(err121)
                    }
                    errors++
                  }
                }
              } else {
                const err122 = {
                  instancePath: instancePath + "/route/tokens/" + i3,
                  schemaPath:
                    "#/oneOf/0/properties/route/properties/tokens/items/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                }
                if (vErrors === null) {
                  vErrors = [err122]
                } else {
                  vErrors.push(err122)
                }
                errors++
              }
            }
          } else {
            const err123 = {
              instancePath: instancePath + "/route/tokens",
              schemaPath: "#/oneOf/0/properties/route/properties/tokens/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array",
            }
            if (vErrors === null) {
              vErrors = [err123]
            } else {
              vErrors.push(err123)
            }
            errors++
          }
        }
      } else {
        const err124 = {
          instancePath: instancePath + "/route",
          schemaPath: "#/oneOf/0/properties/route/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err124]
        } else {
          vErrors.push(err124)
        }
        errors++
      }
    }
    if (data.sellAmount !== undefined) {
      if (typeof data.sellAmount !== "string") {
        const err125 = {
          instancePath: instancePath + "/sellAmount",
          schemaPath: "#/oneOf/0/properties/sellAmount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err125]
        } else {
          vErrors.push(err125)
        }
        errors++
      }
    }
    if (data.sellToken !== undefined) {
      if (typeof data.sellToken !== "string") {
        const err126 = {
          instancePath: instancePath + "/sellToken",
          schemaPath: "#/oneOf/0/properties/sellToken/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err126]
        } else {
          vErrors.push(err126)
        }
        errors++
      }
    }
    if (data.tokenMetadata !== undefined) {
      let data50 = data.tokenMetadata
      if (data50 && typeof data50 == "object" && !Array.isArray(data50)) {
        if (data50.buyToken === undefined) {
          const err127 = {
            instancePath: instancePath + "/tokenMetadata",
            schemaPath: "#/oneOf/0/properties/tokenMetadata/required",
            keyword: "required",
            params: { missingProperty: "buyToken" },
            message: "must have required property '" + "buyToken" + "'",
          }
          if (vErrors === null) {
            vErrors = [err127]
          } else {
            vErrors.push(err127)
          }
          errors++
        }
        if (data50.sellToken === undefined) {
          const err128 = {
            instancePath: instancePath + "/tokenMetadata",
            schemaPath: "#/oneOf/0/properties/tokenMetadata/required",
            keyword: "required",
            params: { missingProperty: "sellToken" },
            message: "must have required property '" + "sellToken" + "'",
          }
          if (vErrors === null) {
            vErrors = [err128]
          } else {
            vErrors.push(err128)
          }
          errors++
        }
        for (const key12 in data50) {
          if (!(key12 === "buyToken" || key12 === "sellToken")) {
            const err129 = {
              instancePath: instancePath + "/tokenMetadata",
              schemaPath:
                "#/oneOf/0/properties/tokenMetadata/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key12 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err129]
            } else {
              vErrors.push(err129)
            }
            errors++
          }
        }
        if (data50.buyToken !== undefined) {
          let data51 = data50.buyToken
          if (data51 && typeof data51 == "object" && !Array.isArray(data51)) {
            if (data51.buyTaxBps === undefined) {
              const err130 = {
                instancePath: instancePath + "/tokenMetadata/buyToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/buyToken/required",
                keyword: "required",
                params: { missingProperty: "buyTaxBps" },
                message: "must have required property '" + "buyTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err130]
              } else {
                vErrors.push(err130)
              }
              errors++
            }
            if (data51.sellTaxBps === undefined) {
              const err131 = {
                instancePath: instancePath + "/tokenMetadata/buyToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/buyToken/required",
                keyword: "required",
                params: { missingProperty: "sellTaxBps" },
                message: "must have required property '" + "sellTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err131]
              } else {
                vErrors.push(err131)
              }
              errors++
            }
            if (data51.transferTaxBps === undefined) {
              const err132 = {
                instancePath: instancePath + "/tokenMetadata/buyToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/buyToken/required",
                keyword: "required",
                params: { missingProperty: "transferTaxBps" },
                message:
                  "must have required property '" + "transferTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err132]
              } else {
                vErrors.push(err132)
              }
              errors++
            }
            for (const key13 in data51) {
              if (
                !(
                  key13 === "buyTaxBps" ||
                  key13 === "sellTaxBps" ||
                  key13 === "transferTaxBps"
                )
              ) {
                const err133 = {
                  instancePath: instancePath + "/tokenMetadata/buyToken",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key13 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err133]
                } else {
                  vErrors.push(err133)
                }
                errors++
              }
            }
            if (data51.buyTaxBps !== undefined) {
              let data52 = data51.buyTaxBps
              const _errs149 = errors
              let valid31 = false
              let passing9 = null
              const _errs150 = errors
              if (typeof data52 !== "string") {
                const err134 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/buyTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err134]
                } else {
                  vErrors.push(err134)
                }
                errors++
              }
              var _valid9 = _errs150 === errors
              if (_valid9) {
                valid31 = true
                passing9 = 0
              }
              const _errs152 = errors
              if (data52 !== null) {
                const err135 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/buyTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err135]
                } else {
                  vErrors.push(err135)
                }
                errors++
              }
              var _valid9 = _errs152 === errors
              if (_valid9 && valid31) {
                valid31 = false
                passing9 = [passing9, 1]
              } else {
                if (_valid9) {
                  valid31 = true
                  passing9 = 1
                }
              }
              if (!valid31) {
                const err136 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/buyTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing9 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err136]
                } else {
                  vErrors.push(err136)
                }
                errors++
              } else {
                errors = _errs149
                if (vErrors !== null) {
                  if (_errs149) {
                    vErrors.length = _errs149
                  } else {
                    vErrors = null
                  }
                }
              }
            }
            if (data51.sellTaxBps !== undefined) {
              let data53 = data51.sellTaxBps
              const _errs155 = errors
              let valid32 = false
              let passing10 = null
              const _errs156 = errors
              if (typeof data53 !== "string") {
                const err137 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/sellTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err137]
                } else {
                  vErrors.push(err137)
                }
                errors++
              }
              var _valid10 = _errs156 === errors
              if (_valid10) {
                valid32 = true
                passing10 = 0
              }
              const _errs158 = errors
              if (data53 !== null) {
                const err138 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/sellTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err138]
                } else {
                  vErrors.push(err138)
                }
                errors++
              }
              var _valid10 = _errs158 === errors
              if (_valid10 && valid32) {
                valid32 = false
                passing10 = [passing10, 1]
              } else {
                if (_valid10) {
                  valid32 = true
                  passing10 = 1
                }
              }
              if (!valid32) {
                const err139 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/sellTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing10 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err139]
                } else {
                  vErrors.push(err139)
                }
                errors++
              } else {
                errors = _errs155
                if (vErrors !== null) {
                  if (_errs155) {
                    vErrors.length = _errs155
                  } else {
                    vErrors = null
                  }
                }
              }
            }
            if (data51.transferTaxBps !== undefined) {
              let data54 = data51.transferTaxBps
              const _errs161 = errors
              let valid33 = false
              let passing11 = null
              const _errs162 = errors
              if (typeof data54 !== "string") {
                const err140 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/transferTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err140]
                } else {
                  vErrors.push(err140)
                }
                errors++
              }
              var _valid11 = _errs162 === errors
              if (_valid11) {
                valid33 = true
                passing11 = 0
              }
              const _errs164 = errors
              if (data54 !== null) {
                const err141 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/transferTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err141]
                } else {
                  vErrors.push(err141)
                }
                errors++
              }
              var _valid11 = _errs164 === errors
              if (_valid11 && valid33) {
                valid33 = false
                passing11 = [passing11, 1]
              } else {
                if (_valid11) {
                  valid33 = true
                  passing11 = 1
                }
              }
              if (!valid33) {
                const err142 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/transferTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing11 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err142]
                } else {
                  vErrors.push(err142)
                }
                errors++
              } else {
                errors = _errs161
                if (vErrors !== null) {
                  if (_errs161) {
                    vErrors.length = _errs161
                  } else {
                    vErrors = null
                  }
                }
              }
            }
          } else {
            const err143 = {
              instancePath: instancePath + "/tokenMetadata/buyToken",
              schemaPath:
                "#/oneOf/0/properties/tokenMetadata/properties/buyToken/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err143]
            } else {
              vErrors.push(err143)
            }
            errors++
          }
        }
        if (data50.sellToken !== undefined) {
          let data55 = data50.sellToken
          if (data55 && typeof data55 == "object" && !Array.isArray(data55)) {
            if (data55.buyTaxBps === undefined) {
              const err144 = {
                instancePath: instancePath + "/tokenMetadata/sellToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/sellToken/required",
                keyword: "required",
                params: { missingProperty: "buyTaxBps" },
                message: "must have required property '" + "buyTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err144]
              } else {
                vErrors.push(err144)
              }
              errors++
            }
            if (data55.sellTaxBps === undefined) {
              const err145 = {
                instancePath: instancePath + "/tokenMetadata/sellToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/sellToken/required",
                keyword: "required",
                params: { missingProperty: "sellTaxBps" },
                message: "must have required property '" + "sellTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err145]
              } else {
                vErrors.push(err145)
              }
              errors++
            }
            if (data55.transferTaxBps === undefined) {
              const err146 = {
                instancePath: instancePath + "/tokenMetadata/sellToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/sellToken/required",
                keyword: "required",
                params: { missingProperty: "transferTaxBps" },
                message:
                  "must have required property '" + "transferTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err146]
              } else {
                vErrors.push(err146)
              }
              errors++
            }
            for (const key14 in data55) {
              if (
                !(
                  key14 === "buyTaxBps" ||
                  key14 === "sellTaxBps" ||
                  key14 === "transferTaxBps"
                )
              ) {
                const err147 = {
                  instancePath: instancePath + "/tokenMetadata/sellToken",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key14 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err147]
                } else {
                  vErrors.push(err147)
                }
                errors++
              }
            }
            if (data55.buyTaxBps !== undefined) {
              let data56 = data55.buyTaxBps
              const _errs170 = errors
              let valid35 = false
              let passing12 = null
              const _errs171 = errors
              if (typeof data56 !== "string") {
                const err148 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/buyTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err148]
                } else {
                  vErrors.push(err148)
                }
                errors++
              }
              var _valid12 = _errs171 === errors
              if (_valid12) {
                valid35 = true
                passing12 = 0
              }
              const _errs173 = errors
              if (data56 !== null) {
                const err149 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/buyTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err149]
                } else {
                  vErrors.push(err149)
                }
                errors++
              }
              var _valid12 = _errs173 === errors
              if (_valid12 && valid35) {
                valid35 = false
                passing12 = [passing12, 1]
              } else {
                if (_valid12) {
                  valid35 = true
                  passing12 = 1
                }
              }
              if (!valid35) {
                const err150 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/buyTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing12 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err150]
                } else {
                  vErrors.push(err150)
                }
                errors++
              } else {
                errors = _errs170
                if (vErrors !== null) {
                  if (_errs170) {
                    vErrors.length = _errs170
                  } else {
                    vErrors = null
                  }
                }
              }
            }
            if (data55.sellTaxBps !== undefined) {
              let data57 = data55.sellTaxBps
              const _errs176 = errors
              let valid36 = false
              let passing13 = null
              const _errs177 = errors
              if (typeof data57 !== "string") {
                const err151 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/sellTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err151]
                } else {
                  vErrors.push(err151)
                }
                errors++
              }
              var _valid13 = _errs177 === errors
              if (_valid13) {
                valid36 = true
                passing13 = 0
              }
              const _errs179 = errors
              if (data57 !== null) {
                const err152 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/sellTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err152]
                } else {
                  vErrors.push(err152)
                }
                errors++
              }
              var _valid13 = _errs179 === errors
              if (_valid13 && valid36) {
                valid36 = false
                passing13 = [passing13, 1]
              } else {
                if (_valid13) {
                  valid36 = true
                  passing13 = 1
                }
              }
              if (!valid36) {
                const err153 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/sellTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing13 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err153]
                } else {
                  vErrors.push(err153)
                }
                errors++
              } else {
                errors = _errs176
                if (vErrors !== null) {
                  if (_errs176) {
                    vErrors.length = _errs176
                  } else {
                    vErrors = null
                  }
                }
              }
            }
            if (data55.transferTaxBps !== undefined) {
              let data58 = data55.transferTaxBps
              const _errs182 = errors
              let valid37 = false
              let passing14 = null
              const _errs183 = errors
              if (typeof data58 !== "string") {
                const err154 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/transferTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err154]
                } else {
                  vErrors.push(err154)
                }
                errors++
              }
              var _valid14 = _errs183 === errors
              if (_valid14) {
                valid37 = true
                passing14 = 0
              }
              const _errs185 = errors
              if (data58 !== null) {
                const err155 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/transferTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err155]
                } else {
                  vErrors.push(err155)
                }
                errors++
              }
              var _valid14 = _errs185 === errors
              if (_valid14 && valid37) {
                valid37 = false
                passing14 = [passing14, 1]
              } else {
                if (_valid14) {
                  valid37 = true
                  passing14 = 1
                }
              }
              if (!valid37) {
                const err156 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/transferTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing14 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err156]
                } else {
                  vErrors.push(err156)
                }
                errors++
              } else {
                errors = _errs182
                if (vErrors !== null) {
                  if (_errs182) {
                    vErrors.length = _errs182
                  } else {
                    vErrors = null
                  }
                }
              }
            }
          } else {
            const err157 = {
              instancePath: instancePath + "/tokenMetadata/sellToken",
              schemaPath:
                "#/oneOf/0/properties/tokenMetadata/properties/sellToken/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err157]
            } else {
              vErrors.push(err157)
            }
            errors++
          }
        }
      } else {
        const err158 = {
          instancePath: instancePath + "/tokenMetadata",
          schemaPath: "#/oneOf/0/properties/tokenMetadata/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err158]
        } else {
          vErrors.push(err158)
        }
        errors++
      }
    }
    if (data.totalNetworkFee !== undefined) {
      let data59 = data.totalNetworkFee
      const _errs188 = errors
      let valid38 = false
      let passing15 = null
      const _errs189 = errors
      if (typeof data59 !== "string") {
        const err159 = {
          instancePath: instancePath + "/totalNetworkFee",
          schemaPath: "#/oneOf/0/properties/totalNetworkFee/oneOf/0/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err159]
        } else {
          vErrors.push(err159)
        }
        errors++
      }
      var _valid15 = _errs189 === errors
      if (_valid15) {
        valid38 = true
        passing15 = 0
      }
      const _errs191 = errors
      if (data59 !== null) {
        const err160 = {
          instancePath: instancePath + "/totalNetworkFee",
          schemaPath: "#/oneOf/0/properties/totalNetworkFee/oneOf/1/type",
          keyword: "type",
          params: { type: "null" },
          message: "must be null",
        }
        if (vErrors === null) {
          vErrors = [err160]
        } else {
          vErrors.push(err160)
        }
        errors++
      }
      var _valid15 = _errs191 === errors
      if (_valid15 && valid38) {
        valid38 = false
        passing15 = [passing15, 1]
      } else {
        if (_valid15) {
          valid38 = true
          passing15 = 1
        }
      }
      if (!valid38) {
        const err161 = {
          instancePath: instancePath + "/totalNetworkFee",
          schemaPath: "#/oneOf/0/properties/totalNetworkFee/oneOf",
          keyword: "oneOf",
          params: { passingSchemas: passing15 },
          message: "must match exactly one schema in oneOf",
        }
        if (vErrors === null) {
          vErrors = [err161]
        } else {
          vErrors.push(err161)
        }
        errors++
      } else {
        errors = _errs188
        if (vErrors !== null) {
          if (_errs188) {
            vErrors.length = _errs188
          } else {
            vErrors = null
          }
        }
      }
    }
    if (data.zid !== undefined) {
      if (typeof data.zid !== "string") {
        const err162 = {
          instancePath: instancePath + "/zid",
          schemaPath: "#/oneOf/0/properties/zid/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err162]
        } else {
          vErrors.push(err162)
        }
        errors++
      }
    }
  } else {
    const err163 = {
      instancePath,
      schemaPath: "#/oneOf/0/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err163]
    } else {
      vErrors.push(err163)
    }
    errors++
  }
  var _valid0 = _errs1 === errors
  if (_valid0) {
    valid0 = true
    passing0 = 0
  }
  const _errs195 = errors
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.liquidityAvailable === undefined) {
      const err164 = {
        instancePath,
        schemaPath: "#/oneOf/1/required",
        keyword: "required",
        params: { missingProperty: "liquidityAvailable" },
        message: "must have required property '" + "liquidityAvailable" + "'",
      }
      if (vErrors === null) {
        vErrors = [err164]
      } else {
        vErrors.push(err164)
      }
      errors++
    }
    if (data.zid === undefined) {
      const err165 = {
        instancePath,
        schemaPath: "#/oneOf/1/required",
        keyword: "required",
        params: { missingProperty: "zid" },
        message: "must have required property '" + "zid" + "'",
      }
      if (vErrors === null) {
        vErrors = [err165]
      } else {
        vErrors.push(err165)
      }
      errors++
    }
    for (const key15 in data) {
      if (!(key15 === "liquidityAvailable" || key15 === "zid")) {
        const err166 = {
          instancePath,
          schemaPath: "#/oneOf/1/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: key15 },
          message: "must NOT have additional properties",
        }
        if (vErrors === null) {
          vErrors = [err166]
        } else {
          vErrors.push(err166)
        }
        errors++
      }
    }
    if (data.liquidityAvailable !== undefined) {
      if (false !== data.liquidityAvailable) {
        const err167 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/oneOf/1/properties/liquidityAvailable/const",
          keyword: "const",
          params: { allowedValue: false },
          message: "must be equal to constant",
        }
        if (vErrors === null) {
          vErrors = [err167]
        } else {
          vErrors.push(err167)
        }
        errors++
      }
    }
    if (data.zid !== undefined) {
      if (typeof data.zid !== "string") {
        const err168 = {
          instancePath: instancePath + "/zid",
          schemaPath: "#/oneOf/1/properties/zid/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err168]
        } else {
          vErrors.push(err168)
        }
        errors++
      }
    }
  } else {
    const err169 = {
      instancePath,
      schemaPath: "#/oneOf/1/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err169]
    } else {
      vErrors.push(err169)
    }
    errors++
  }
  var _valid0 = _errs195 === errors
  if (_valid0 && valid0) {
    valid0 = false
    passing0 = [passing0, 1]
  } else {
    if (_valid0) {
      valid0 = true
      passing0 = 1
    }
  }
  if (!valid0) {
    const err170 = {
      instancePath,
      schemaPath: "#/oneOf",
      keyword: "oneOf",
      params: { passingSchemas: passing0 },
      message: "must match exactly one schema in oneOf",
    }
    if (vErrors === null) {
      vErrors = [err170]
    } else {
      vErrors.push(err170)
    }
    errors++
  } else {
    errors = _errs0
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0
      } else {
        vErrors = null
      }
    }
  }
  validate22.errors = vErrors
  return errors === 0
}
exports.isValid0xSwapQuoteResponse = validate23
const schema29 = {
  $schema: "http://json-schema.org/draft-07/schema#",
  oneOf: [
    {
      type: "object",
      properties: {
        liquidityAvailable: { type: "boolean", const: true },
        allowanceTarget: { oneOf: [{ type: "string" }, { type: "null" }] },
        blockNumber: { type: "string" },
        buyAmount: { type: "string" },
        buyToken: { type: "string" },
        fees: {
          type: "object",
          properties: {
            integratorFee: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    amount: { type: "string" },
                    token: { type: "string" },
                    type: { type: "string", enum: ["volume"] },
                  },
                  required: ["amount", "token", "type"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            integratorFees: {
              oneOf: [
                {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      amount: { type: "string" },
                      token: { type: "string" },
                      type: { type: "string", enum: ["volume"] },
                    },
                    required: ["amount", "token", "type"],
                    additionalProperties: false,
                  },
                },
                { type: "null" },
              ],
            },
            zeroExFee: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    amount: { type: "string" },
                    token: { type: "string" },
                    type: { type: "string", enum: ["volume"] },
                  },
                  required: ["amount", "token", "type"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            gasFee: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    amount: { type: "string" },
                    token: { type: "string" },
                    type: { type: "string", enum: ["gas"] },
                  },
                  required: ["amount", "token", "type"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
          },
          required: ["integratorFee", "integratorFees", "zeroExFee", "gasFee"],
          additionalProperties: false,
        },
        issues: {
          type: "object",
          properties: {
            allowance: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    actual: { type: "string" },
                    spender: { type: "string" },
                  },
                  required: ["actual", "spender"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            balance: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    actual: { type: "string" },
                    expected: { type: "string" },
                  },
                  required: ["token", "actual", "expected"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            simulationIncomplete: { type: "boolean" },
            invalidSourcesPassed: { type: "array", items: { type: "string" } },
          },
          required: [
            "allowance",
            "balance",
            "simulationIncomplete",
            "invalidSourcesPassed",
          ],
          additionalProperties: false,
        },
        minBuyAmount: { type: "string" },
        route: {
          type: "object",
          properties: {
            fills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string" },
                  to: { type: "string" },
                  source: { type: "string" },
                  proportionBps: { type: "string" },
                },
                required: ["from", "to", "source", "proportionBps"],
                additionalProperties: false,
              },
            },
            tokens: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  address: { type: "string" },
                  symbol: { type: "string" },
                },
                required: ["address", "symbol"],
                additionalProperties: false,
              },
            },
          },
          required: ["fills", "tokens"],
          additionalProperties: false,
        },
        sellAmount: { type: "string" },
        sellToken: { type: "string" },
        tokenMetadata: {
          type: "object",
          properties: {
            buyToken: {
              type: "object",
              properties: {
                buyTaxBps: { oneOf: [{ type: "string" }, { type: "null" }] },
                sellTaxBps: { oneOf: [{ type: "string" }, { type: "null" }] },
                transferTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
              },
              required: ["buyTaxBps", "sellTaxBps", "transferTaxBps"],
              additionalProperties: false,
            },
            sellToken: {
              type: "object",
              properties: {
                buyTaxBps: { oneOf: [{ type: "string" }, { type: "null" }] },
                sellTaxBps: { oneOf: [{ type: "string" }, { type: "null" }] },
                transferTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
              },
              required: ["buyTaxBps", "sellTaxBps", "transferTaxBps"],
              additionalProperties: false,
            },
          },
          required: ["buyToken", "sellToken"],
          additionalProperties: false,
        },
        totalNetworkFee: { oneOf: [{ type: "string" }, { type: "null" }] },
        transaction: {
          type: "object",
          properties: {
            to: { type: "string" },
            data: { type: "string" },
            gas: { oneOf: [{ type: "string" }, { type: "null" }] },
            gasPrice: { type: "string" },
            value: { type: "string" },
          },
          required: ["to", "data", "gas", "gasPrice", "value"],
          additionalProperties: false,
        },
        zid: { type: "string" },
      },
      required: [
        "liquidityAvailable",
        "allowanceTarget",
        "blockNumber",
        "buyAmount",
        "buyToken",
        "fees",
        "issues",
        "minBuyAmount",
        "route",
        "sellAmount",
        "sellToken",
        "tokenMetadata",
        "totalNetworkFee",
        "transaction",
        "zid",
      ],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        liquidityAvailable: { type: "boolean", const: false },
        zid: { type: "string" },
      },
      required: ["liquidityAvailable", "zid"],
      additionalProperties: false,
    },
  ],
}
const func0 = require("ajv/dist/runtime/equal").default
function validate23(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  let passing0 = null
  const _errs1 = errors
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.liquidityAvailable === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "liquidityAvailable" },
        message: "must have required property '" + "liquidityAvailable" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.allowanceTarget === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "allowanceTarget" },
        message: "must have required property '" + "allowanceTarget" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.blockNumber === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "blockNumber" },
        message: "must have required property '" + "blockNumber" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.buyAmount === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "buyAmount" },
        message: "must have required property '" + "buyAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.buyToken === undefined) {
      const err4 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "buyToken" },
        message: "must have required property '" + "buyToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err4]
      } else {
        vErrors.push(err4)
      }
      errors++
    }
    if (data.fees === undefined) {
      const err5 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "fees" },
        message: "must have required property '" + "fees" + "'",
      }
      if (vErrors === null) {
        vErrors = [err5]
      } else {
        vErrors.push(err5)
      }
      errors++
    }
    if (data.issues === undefined) {
      const err6 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "issues" },
        message: "must have required property '" + "issues" + "'",
      }
      if (vErrors === null) {
        vErrors = [err6]
      } else {
        vErrors.push(err6)
      }
      errors++
    }
    if (data.minBuyAmount === undefined) {
      const err7 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "minBuyAmount" },
        message: "must have required property '" + "minBuyAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err7]
      } else {
        vErrors.push(err7)
      }
      errors++
    }
    if (data.route === undefined) {
      const err8 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "route" },
        message: "must have required property '" + "route" + "'",
      }
      if (vErrors === null) {
        vErrors = [err8]
      } else {
        vErrors.push(err8)
      }
      errors++
    }
    if (data.sellAmount === undefined) {
      const err9 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "sellAmount" },
        message: "must have required property '" + "sellAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err9]
      } else {
        vErrors.push(err9)
      }
      errors++
    }
    if (data.sellToken === undefined) {
      const err10 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "sellToken" },
        message: "must have required property '" + "sellToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
    }
    if (data.tokenMetadata === undefined) {
      const err11 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "tokenMetadata" },
        message: "must have required property '" + "tokenMetadata" + "'",
      }
      if (vErrors === null) {
        vErrors = [err11]
      } else {
        vErrors.push(err11)
      }
      errors++
    }
    if (data.totalNetworkFee === undefined) {
      const err12 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "totalNetworkFee" },
        message: "must have required property '" + "totalNetworkFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err12]
      } else {
        vErrors.push(err12)
      }
      errors++
    }
    if (data.transaction === undefined) {
      const err13 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "transaction" },
        message: "must have required property '" + "transaction" + "'",
      }
      if (vErrors === null) {
        vErrors = [err13]
      } else {
        vErrors.push(err13)
      }
      errors++
    }
    if (data.zid === undefined) {
      const err14 = {
        instancePath,
        schemaPath: "#/oneOf/0/required",
        keyword: "required",
        params: { missingProperty: "zid" },
        message: "must have required property '" + "zid" + "'",
      }
      if (vErrors === null) {
        vErrors = [err14]
      } else {
        vErrors.push(err14)
      }
      errors++
    }
    for (const key0 in data) {
      if (!func32.call(schema29.oneOf[0].properties, key0)) {
        const err15 = {
          instancePath,
          schemaPath: "#/oneOf/0/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: key0 },
          message: "must NOT have additional properties",
        }
        if (vErrors === null) {
          vErrors = [err15]
        } else {
          vErrors.push(err15)
        }
        errors++
      }
    }
    if (data.liquidityAvailable !== undefined) {
      let data0 = data.liquidityAvailable
      if (typeof data0 !== "boolean") {
        const err16 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/oneOf/0/properties/liquidityAvailable/type",
          keyword: "type",
          params: { type: "boolean" },
          message: "must be boolean",
        }
        if (vErrors === null) {
          vErrors = [err16]
        } else {
          vErrors.push(err16)
        }
        errors++
      }
      if (true !== data0) {
        const err17 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/oneOf/0/properties/liquidityAvailable/const",
          keyword: "const",
          params: { allowedValue: true },
          message: "must be equal to constant",
        }
        if (vErrors === null) {
          vErrors = [err17]
        } else {
          vErrors.push(err17)
        }
        errors++
      }
    }
    if (data.allowanceTarget !== undefined) {
      let data1 = data.allowanceTarget
      const _errs7 = errors
      let valid2 = false
      let passing1 = null
      const _errs8 = errors
      if (typeof data1 !== "string") {
        const err18 = {
          instancePath: instancePath + "/allowanceTarget",
          schemaPath: "#/oneOf/0/properties/allowanceTarget/oneOf/0/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err18]
        } else {
          vErrors.push(err18)
        }
        errors++
      }
      var _valid1 = _errs8 === errors
      if (_valid1) {
        valid2 = true
        passing1 = 0
      }
      const _errs10 = errors
      if (data1 !== null) {
        const err19 = {
          instancePath: instancePath + "/allowanceTarget",
          schemaPath: "#/oneOf/0/properties/allowanceTarget/oneOf/1/type",
          keyword: "type",
          params: { type: "null" },
          message: "must be null",
        }
        if (vErrors === null) {
          vErrors = [err19]
        } else {
          vErrors.push(err19)
        }
        errors++
      }
      var _valid1 = _errs10 === errors
      if (_valid1 && valid2) {
        valid2 = false
        passing1 = [passing1, 1]
      } else {
        if (_valid1) {
          valid2 = true
          passing1 = 1
        }
      }
      if (!valid2) {
        const err20 = {
          instancePath: instancePath + "/allowanceTarget",
          schemaPath: "#/oneOf/0/properties/allowanceTarget/oneOf",
          keyword: "oneOf",
          params: { passingSchemas: passing1 },
          message: "must match exactly one schema in oneOf",
        }
        if (vErrors === null) {
          vErrors = [err20]
        } else {
          vErrors.push(err20)
        }
        errors++
      } else {
        errors = _errs7
        if (vErrors !== null) {
          if (_errs7) {
            vErrors.length = _errs7
          } else {
            vErrors = null
          }
        }
      }
    }
    if (data.blockNumber !== undefined) {
      if (typeof data.blockNumber !== "string") {
        const err21 = {
          instancePath: instancePath + "/blockNumber",
          schemaPath: "#/oneOf/0/properties/blockNumber/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err21]
        } else {
          vErrors.push(err21)
        }
        errors++
      }
    }
    if (data.buyAmount !== undefined) {
      if (typeof data.buyAmount !== "string") {
        const err22 = {
          instancePath: instancePath + "/buyAmount",
          schemaPath: "#/oneOf/0/properties/buyAmount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err22]
        } else {
          vErrors.push(err22)
        }
        errors++
      }
    }
    if (data.buyToken !== undefined) {
      if (typeof data.buyToken !== "string") {
        const err23 = {
          instancePath: instancePath + "/buyToken",
          schemaPath: "#/oneOf/0/properties/buyToken/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err23]
        } else {
          vErrors.push(err23)
        }
        errors++
      }
    }
    if (data.fees !== undefined) {
      let data5 = data.fees
      if (data5 && typeof data5 == "object" && !Array.isArray(data5)) {
        if (data5.integratorFee === undefined) {
          const err24 = {
            instancePath: instancePath + "/fees",
            schemaPath: "#/oneOf/0/properties/fees/required",
            keyword: "required",
            params: { missingProperty: "integratorFee" },
            message: "must have required property '" + "integratorFee" + "'",
          }
          if (vErrors === null) {
            vErrors = [err24]
          } else {
            vErrors.push(err24)
          }
          errors++
        }
        if (data5.integratorFees === undefined) {
          const err25 = {
            instancePath: instancePath + "/fees",
            schemaPath: "#/oneOf/0/properties/fees/required",
            keyword: "required",
            params: { missingProperty: "integratorFees" },
            message: "must have required property '" + "integratorFees" + "'",
          }
          if (vErrors === null) {
            vErrors = [err25]
          } else {
            vErrors.push(err25)
          }
          errors++
        }
        if (data5.zeroExFee === undefined) {
          const err26 = {
            instancePath: instancePath + "/fees",
            schemaPath: "#/oneOf/0/properties/fees/required",
            keyword: "required",
            params: { missingProperty: "zeroExFee" },
            message: "must have required property '" + "zeroExFee" + "'",
          }
          if (vErrors === null) {
            vErrors = [err26]
          } else {
            vErrors.push(err26)
          }
          errors++
        }
        if (data5.gasFee === undefined) {
          const err27 = {
            instancePath: instancePath + "/fees",
            schemaPath: "#/oneOf/0/properties/fees/required",
            keyword: "required",
            params: { missingProperty: "gasFee" },
            message: "must have required property '" + "gasFee" + "'",
          }
          if (vErrors === null) {
            vErrors = [err27]
          } else {
            vErrors.push(err27)
          }
          errors++
        }
        for (const key1 in data5) {
          if (
            !(
              key1 === "integratorFee" ||
              key1 === "integratorFees" ||
              key1 === "zeroExFee" ||
              key1 === "gasFee"
            )
          ) {
            const err28 = {
              instancePath: instancePath + "/fees",
              schemaPath: "#/oneOf/0/properties/fees/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key1 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err28]
            } else {
              vErrors.push(err28)
            }
            errors++
          }
        }
        if (data5.integratorFee !== undefined) {
          let data6 = data5.integratorFee
          const _errs22 = errors
          let valid4 = false
          let passing2 = null
          const _errs23 = errors
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.amount === undefined) {
              const err29 = {
                instancePath: instancePath + "/fees/integratorFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "amount" },
                message: "must have required property '" + "amount" + "'",
              }
              if (vErrors === null) {
                vErrors = [err29]
              } else {
                vErrors.push(err29)
              }
              errors++
            }
            if (data6.token === undefined) {
              const err30 = {
                instancePath: instancePath + "/fees/integratorFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "token" },
                message: "must have required property '" + "token" + "'",
              }
              if (vErrors === null) {
                vErrors = [err30]
              } else {
                vErrors.push(err30)
              }
              errors++
            }
            if (data6.type === undefined) {
              const err31 = {
                instancePath: instancePath + "/fees/integratorFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "type" },
                message: "must have required property '" + "type" + "'",
              }
              if (vErrors === null) {
                vErrors = [err31]
              } else {
                vErrors.push(err31)
              }
              errors++
            }
            for (const key2 in data6) {
              if (!(key2 === "amount" || key2 === "token" || key2 === "type")) {
                const err32 = {
                  instancePath: instancePath + "/fees/integratorFee",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key2 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err32]
                } else {
                  vErrors.push(err32)
                }
                errors++
              }
            }
            if (data6.amount !== undefined) {
              if (typeof data6.amount !== "string") {
                const err33 = {
                  instancePath: instancePath + "/fees/integratorFee/amount",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/properties/amount/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err33]
                } else {
                  vErrors.push(err33)
                }
                errors++
              }
            }
            if (data6.token !== undefined) {
              if (typeof data6.token !== "string") {
                const err34 = {
                  instancePath: instancePath + "/fees/integratorFee/token",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/properties/token/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err34]
                } else {
                  vErrors.push(err34)
                }
                errors++
              }
            }
            if (data6.type !== undefined) {
              let data9 = data6.type
              if (typeof data9 !== "string") {
                const err35 = {
                  instancePath: instancePath + "/fees/integratorFee/type",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/properties/type/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err35]
                } else {
                  vErrors.push(err35)
                }
                errors++
              }
              if (!(data9 === "volume")) {
                const err36 = {
                  instancePath: instancePath + "/fees/integratorFee/type",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/properties/type/enum",
                  keyword: "enum",
                  params: {
                    allowedValues:
                      schema29.oneOf[0].properties.fees.properties.integratorFee
                        .oneOf[0].properties.type.enum,
                  },
                  message: "must be equal to one of the allowed values",
                }
                if (vErrors === null) {
                  vErrors = [err36]
                } else {
                  vErrors.push(err36)
                }
                errors++
              }
            }
          } else {
            const err37 = {
              instancePath: instancePath + "/fees/integratorFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err37]
            } else {
              vErrors.push(err37)
            }
            errors++
          }
          var _valid2 = _errs23 === errors
          if (_valid2) {
            valid4 = true
            passing2 = 0
          }
          const _errs32 = errors
          if (data6 !== null) {
            const err38 = {
              instancePath: instancePath + "/fees/integratorFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFee/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err38]
            } else {
              vErrors.push(err38)
            }
            errors++
          }
          var _valid2 = _errs32 === errors
          if (_valid2 && valid4) {
            valid4 = false
            passing2 = [passing2, 1]
          } else {
            if (_valid2) {
              valid4 = true
              passing2 = 1
            }
          }
          if (!valid4) {
            const err39 = {
              instancePath: instancePath + "/fees/integratorFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFee/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing2 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err39]
            } else {
              vErrors.push(err39)
            }
            errors++
          } else {
            errors = _errs22
            if (vErrors !== null) {
              if (_errs22) {
                vErrors.length = _errs22
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data5.integratorFees !== undefined) {
          let data10 = data5.integratorFees
          const _errs35 = errors
          let valid6 = false
          let passing3 = null
          const _errs36 = errors
          if (Array.isArray(data10)) {
            const len0 = data10.length
            for (let i0 = 0; i0 < len0; i0++) {
              let data11 = data10[i0]
              if (
                data11 &&
                typeof data11 == "object" &&
                !Array.isArray(data11)
              ) {
                if (data11.amount === undefined) {
                  const err40 = {
                    instancePath: instancePath + "/fees/integratorFees/" + i0,
                    schemaPath:
                      "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/required",
                    keyword: "required",
                    params: { missingProperty: "amount" },
                    message: "must have required property '" + "amount" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err40]
                  } else {
                    vErrors.push(err40)
                  }
                  errors++
                }
                if (data11.token === undefined) {
                  const err41 = {
                    instancePath: instancePath + "/fees/integratorFees/" + i0,
                    schemaPath:
                      "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/required",
                    keyword: "required",
                    params: { missingProperty: "token" },
                    message: "must have required property '" + "token" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err41]
                  } else {
                    vErrors.push(err41)
                  }
                  errors++
                }
                if (data11.type === undefined) {
                  const err42 = {
                    instancePath: instancePath + "/fees/integratorFees/" + i0,
                    schemaPath:
                      "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/required",
                    keyword: "required",
                    params: { missingProperty: "type" },
                    message: "must have required property '" + "type" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err42]
                  } else {
                    vErrors.push(err42)
                  }
                  errors++
                }
                for (const key3 in data11) {
                  if (
                    !(key3 === "amount" || key3 === "token" || key3 === "type")
                  ) {
                    const err43 = {
                      instancePath: instancePath + "/fees/integratorFees/" + i0,
                      schemaPath:
                        "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/additionalProperties",
                      keyword: "additionalProperties",
                      params: { additionalProperty: key3 },
                      message: "must NOT have additional properties",
                    }
                    if (vErrors === null) {
                      vErrors = [err43]
                    } else {
                      vErrors.push(err43)
                    }
                    errors++
                  }
                }
                if (data11.amount !== undefined) {
                  if (typeof data11.amount !== "string") {
                    const err44 = {
                      instancePath:
                        instancePath + "/fees/integratorFees/" + i0 + "/amount",
                      schemaPath:
                        "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/properties/amount/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err44]
                    } else {
                      vErrors.push(err44)
                    }
                    errors++
                  }
                }
                if (data11.token !== undefined) {
                  if (typeof data11.token !== "string") {
                    const err45 = {
                      instancePath:
                        instancePath + "/fees/integratorFees/" + i0 + "/token",
                      schemaPath:
                        "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/properties/token/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err45]
                    } else {
                      vErrors.push(err45)
                    }
                    errors++
                  }
                }
                if (data11.type !== undefined) {
                  let data14 = data11.type
                  if (typeof data14 !== "string") {
                    const err46 = {
                      instancePath:
                        instancePath + "/fees/integratorFees/" + i0 + "/type",
                      schemaPath:
                        "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/properties/type/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err46]
                    } else {
                      vErrors.push(err46)
                    }
                    errors++
                  }
                  if (!(data14 === "volume")) {
                    const err47 = {
                      instancePath:
                        instancePath + "/fees/integratorFees/" + i0 + "/type",
                      schemaPath:
                        "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/properties/type/enum",
                      keyword: "enum",
                      params: {
                        allowedValues:
                          schema29.oneOf[0].properties.fees.properties
                            .integratorFees.oneOf[0].items.properties.type.enum,
                      },
                      message: "must be equal to one of the allowed values",
                    }
                    if (vErrors === null) {
                      vErrors = [err47]
                    } else {
                      vErrors.push(err47)
                    }
                    errors++
                  }
                }
              } else {
                const err48 = {
                  instancePath: instancePath + "/fees/integratorFees/" + i0,
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/items/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                }
                if (vErrors === null) {
                  vErrors = [err48]
                } else {
                  vErrors.push(err48)
                }
                errors++
              }
            }
          } else {
            const err49 = {
              instancePath: instancePath + "/fees/integratorFees",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/0/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array",
            }
            if (vErrors === null) {
              vErrors = [err49]
            } else {
              vErrors.push(err49)
            }
            errors++
          }
          var _valid3 = _errs36 === errors
          if (_valid3) {
            valid6 = true
            passing3 = 0
          }
          const _errs47 = errors
          if (data10 !== null) {
            const err50 = {
              instancePath: instancePath + "/fees/integratorFees",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFees/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err50]
            } else {
              vErrors.push(err50)
            }
            errors++
          }
          var _valid3 = _errs47 === errors
          if (_valid3 && valid6) {
            valid6 = false
            passing3 = [passing3, 1]
          } else {
            if (_valid3) {
              valid6 = true
              passing3 = 1
            }
          }
          if (!valid6) {
            const err51 = {
              instancePath: instancePath + "/fees/integratorFees",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/integratorFees/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing3 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err51]
            } else {
              vErrors.push(err51)
            }
            errors++
          } else {
            errors = _errs35
            if (vErrors !== null) {
              if (_errs35) {
                vErrors.length = _errs35
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data5.zeroExFee !== undefined) {
          let data15 = data5.zeroExFee
          const _errs50 = errors
          let valid10 = false
          let passing4 = null
          const _errs51 = errors
          if (data15 && typeof data15 == "object" && !Array.isArray(data15)) {
            if (data15.amount === undefined) {
              const err52 = {
                instancePath: instancePath + "/fees/zeroExFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "amount" },
                message: "must have required property '" + "amount" + "'",
              }
              if (vErrors === null) {
                vErrors = [err52]
              } else {
                vErrors.push(err52)
              }
              errors++
            }
            if (data15.token === undefined) {
              const err53 = {
                instancePath: instancePath + "/fees/zeroExFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "token" },
                message: "must have required property '" + "token" + "'",
              }
              if (vErrors === null) {
                vErrors = [err53]
              } else {
                vErrors.push(err53)
              }
              errors++
            }
            if (data15.type === undefined) {
              const err54 = {
                instancePath: instancePath + "/fees/zeroExFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "type" },
                message: "must have required property '" + "type" + "'",
              }
              if (vErrors === null) {
                vErrors = [err54]
              } else {
                vErrors.push(err54)
              }
              errors++
            }
            for (const key4 in data15) {
              if (!(key4 === "amount" || key4 === "token" || key4 === "type")) {
                const err55 = {
                  instancePath: instancePath + "/fees/zeroExFee",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key4 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err55]
                } else {
                  vErrors.push(err55)
                }
                errors++
              }
            }
            if (data15.amount !== undefined) {
              if (typeof data15.amount !== "string") {
                const err56 = {
                  instancePath: instancePath + "/fees/zeroExFee/amount",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/properties/amount/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err56]
                } else {
                  vErrors.push(err56)
                }
                errors++
              }
            }
            if (data15.token !== undefined) {
              if (typeof data15.token !== "string") {
                const err57 = {
                  instancePath: instancePath + "/fees/zeroExFee/token",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/properties/token/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err57]
                } else {
                  vErrors.push(err57)
                }
                errors++
              }
            }
            if (data15.type !== undefined) {
              let data18 = data15.type
              if (typeof data18 !== "string") {
                const err58 = {
                  instancePath: instancePath + "/fees/zeroExFee/type",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/properties/type/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err58]
                } else {
                  vErrors.push(err58)
                }
                errors++
              }
              if (!(data18 === "volume")) {
                const err59 = {
                  instancePath: instancePath + "/fees/zeroExFee/type",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/properties/type/enum",
                  keyword: "enum",
                  params: {
                    allowedValues:
                      schema29.oneOf[0].properties.fees.properties.zeroExFee
                        .oneOf[0].properties.type.enum,
                  },
                  message: "must be equal to one of the allowed values",
                }
                if (vErrors === null) {
                  vErrors = [err59]
                } else {
                  vErrors.push(err59)
                }
                errors++
              }
            }
          } else {
            const err60 = {
              instancePath: instancePath + "/fees/zeroExFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err60]
            } else {
              vErrors.push(err60)
            }
            errors++
          }
          var _valid4 = _errs51 === errors
          if (_valid4) {
            valid10 = true
            passing4 = 0
          }
          const _errs60 = errors
          if (data15 !== null) {
            const err61 = {
              instancePath: instancePath + "/fees/zeroExFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err61]
            } else {
              vErrors.push(err61)
            }
            errors++
          }
          var _valid4 = _errs60 === errors
          if (_valid4 && valid10) {
            valid10 = false
            passing4 = [passing4, 1]
          } else {
            if (_valid4) {
              valid10 = true
              passing4 = 1
            }
          }
          if (!valid10) {
            const err62 = {
              instancePath: instancePath + "/fees/zeroExFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/zeroExFee/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing4 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err62]
            } else {
              vErrors.push(err62)
            }
            errors++
          } else {
            errors = _errs50
            if (vErrors !== null) {
              if (_errs50) {
                vErrors.length = _errs50
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data5.gasFee !== undefined) {
          let data19 = data5.gasFee
          const _errs63 = errors
          let valid12 = false
          let passing5 = null
          const _errs64 = errors
          if (data19 && typeof data19 == "object" && !Array.isArray(data19)) {
            if (data19.amount === undefined) {
              const err63 = {
                instancePath: instancePath + "/fees/gasFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "amount" },
                message: "must have required property '" + "amount" + "'",
              }
              if (vErrors === null) {
                vErrors = [err63]
              } else {
                vErrors.push(err63)
              }
              errors++
            }
            if (data19.token === undefined) {
              const err64 = {
                instancePath: instancePath + "/fees/gasFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "token" },
                message: "must have required property '" + "token" + "'",
              }
              if (vErrors === null) {
                vErrors = [err64]
              } else {
                vErrors.push(err64)
              }
              errors++
            }
            if (data19.type === undefined) {
              const err65 = {
                instancePath: instancePath + "/fees/gasFee",
                schemaPath:
                  "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "type" },
                message: "must have required property '" + "type" + "'",
              }
              if (vErrors === null) {
                vErrors = [err65]
              } else {
                vErrors.push(err65)
              }
              errors++
            }
            for (const key5 in data19) {
              if (!(key5 === "amount" || key5 === "token" || key5 === "type")) {
                const err66 = {
                  instancePath: instancePath + "/fees/gasFee",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key5 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err66]
                } else {
                  vErrors.push(err66)
                }
                errors++
              }
            }
            if (data19.amount !== undefined) {
              if (typeof data19.amount !== "string") {
                const err67 = {
                  instancePath: instancePath + "/fees/gasFee/amount",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/properties/amount/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err67]
                } else {
                  vErrors.push(err67)
                }
                errors++
              }
            }
            if (data19.token !== undefined) {
              if (typeof data19.token !== "string") {
                const err68 = {
                  instancePath: instancePath + "/fees/gasFee/token",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/properties/token/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err68]
                } else {
                  vErrors.push(err68)
                }
                errors++
              }
            }
            if (data19.type !== undefined) {
              let data22 = data19.type
              if (typeof data22 !== "string") {
                const err69 = {
                  instancePath: instancePath + "/fees/gasFee/type",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/properties/type/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err69]
                } else {
                  vErrors.push(err69)
                }
                errors++
              }
              if (!(data22 === "gas")) {
                const err70 = {
                  instancePath: instancePath + "/fees/gasFee/type",
                  schemaPath:
                    "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/properties/type/enum",
                  keyword: "enum",
                  params: {
                    allowedValues:
                      schema29.oneOf[0].properties.fees.properties.gasFee
                        .oneOf[0].properties.type.enum,
                  },
                  message: "must be equal to one of the allowed values",
                }
                if (vErrors === null) {
                  vErrors = [err70]
                } else {
                  vErrors.push(err70)
                }
                errors++
              }
            }
          } else {
            const err71 = {
              instancePath: instancePath + "/fees/gasFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/gasFee/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err71]
            } else {
              vErrors.push(err71)
            }
            errors++
          }
          var _valid5 = _errs64 === errors
          if (_valid5) {
            valid12 = true
            passing5 = 0
          }
          const _errs73 = errors
          if (data19 !== null) {
            const err72 = {
              instancePath: instancePath + "/fees/gasFee",
              schemaPath:
                "#/oneOf/0/properties/fees/properties/gasFee/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err72]
            } else {
              vErrors.push(err72)
            }
            errors++
          }
          var _valid5 = _errs73 === errors
          if (_valid5 && valid12) {
            valid12 = false
            passing5 = [passing5, 1]
          } else {
            if (_valid5) {
              valid12 = true
              passing5 = 1
            }
          }
          if (!valid12) {
            const err73 = {
              instancePath: instancePath + "/fees/gasFee",
              schemaPath: "#/oneOf/0/properties/fees/properties/gasFee/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing5 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err73]
            } else {
              vErrors.push(err73)
            }
            errors++
          } else {
            errors = _errs63
            if (vErrors !== null) {
              if (_errs63) {
                vErrors.length = _errs63
              } else {
                vErrors = null
              }
            }
          }
        }
      } else {
        const err74 = {
          instancePath: instancePath + "/fees",
          schemaPath: "#/oneOf/0/properties/fees/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err74]
        } else {
          vErrors.push(err74)
        }
        errors++
      }
    }
    if (data.issues !== undefined) {
      let data23 = data.issues
      if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
        if (data23.allowance === undefined) {
          const err75 = {
            instancePath: instancePath + "/issues",
            schemaPath: "#/oneOf/0/properties/issues/required",
            keyword: "required",
            params: { missingProperty: "allowance" },
            message: "must have required property '" + "allowance" + "'",
          }
          if (vErrors === null) {
            vErrors = [err75]
          } else {
            vErrors.push(err75)
          }
          errors++
        }
        if (data23.balance === undefined) {
          const err76 = {
            instancePath: instancePath + "/issues",
            schemaPath: "#/oneOf/0/properties/issues/required",
            keyword: "required",
            params: { missingProperty: "balance" },
            message: "must have required property '" + "balance" + "'",
          }
          if (vErrors === null) {
            vErrors = [err76]
          } else {
            vErrors.push(err76)
          }
          errors++
        }
        if (data23.simulationIncomplete === undefined) {
          const err77 = {
            instancePath: instancePath + "/issues",
            schemaPath: "#/oneOf/0/properties/issues/required",
            keyword: "required",
            params: { missingProperty: "simulationIncomplete" },
            message:
              "must have required property '" + "simulationIncomplete" + "'",
          }
          if (vErrors === null) {
            vErrors = [err77]
          } else {
            vErrors.push(err77)
          }
          errors++
        }
        if (data23.invalidSourcesPassed === undefined) {
          const err78 = {
            instancePath: instancePath + "/issues",
            schemaPath: "#/oneOf/0/properties/issues/required",
            keyword: "required",
            params: { missingProperty: "invalidSourcesPassed" },
            message:
              "must have required property '" + "invalidSourcesPassed" + "'",
          }
          if (vErrors === null) {
            vErrors = [err78]
          } else {
            vErrors.push(err78)
          }
          errors++
        }
        for (const key6 in data23) {
          if (
            !(
              key6 === "allowance" ||
              key6 === "balance" ||
              key6 === "simulationIncomplete" ||
              key6 === "invalidSourcesPassed"
            )
          ) {
            const err79 = {
              instancePath: instancePath + "/issues",
              schemaPath: "#/oneOf/0/properties/issues/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key6 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err79]
            } else {
              vErrors.push(err79)
            }
            errors++
          }
        }
        if (data23.allowance !== undefined) {
          let data24 = data23.allowance
          const _errs79 = errors
          let valid15 = false
          let passing6 = null
          const _errs80 = errors
          if (data24 && typeof data24 == "object" && !Array.isArray(data24)) {
            if (data24.actual === undefined) {
              const err80 = {
                instancePath: instancePath + "/issues/allowance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "actual" },
                message: "must have required property '" + "actual" + "'",
              }
              if (vErrors === null) {
                vErrors = [err80]
              } else {
                vErrors.push(err80)
              }
              errors++
            }
            if (data24.spender === undefined) {
              const err81 = {
                instancePath: instancePath + "/issues/allowance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "spender" },
                message: "must have required property '" + "spender" + "'",
              }
              if (vErrors === null) {
                vErrors = [err81]
              } else {
                vErrors.push(err81)
              }
              errors++
            }
            for (const key7 in data24) {
              if (!(key7 === "actual" || key7 === "spender")) {
                const err82 = {
                  instancePath: instancePath + "/issues/allowance",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key7 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err82]
                } else {
                  vErrors.push(err82)
                }
                errors++
              }
            }
            if (data24.actual !== undefined) {
              if (typeof data24.actual !== "string") {
                const err83 = {
                  instancePath: instancePath + "/issues/allowance/actual",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/properties/actual/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err83]
                } else {
                  vErrors.push(err83)
                }
                errors++
              }
            }
            if (data24.spender !== undefined) {
              if (typeof data24.spender !== "string") {
                const err84 = {
                  instancePath: instancePath + "/issues/allowance/spender",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/properties/spender/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err84]
                } else {
                  vErrors.push(err84)
                }
                errors++
              }
            }
          } else {
            const err85 = {
              instancePath: instancePath + "/issues/allowance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/allowance/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err85]
            } else {
              vErrors.push(err85)
            }
            errors++
          }
          var _valid6 = _errs80 === errors
          if (_valid6) {
            valid15 = true
            passing6 = 0
          }
          const _errs87 = errors
          if (data24 !== null) {
            const err86 = {
              instancePath: instancePath + "/issues/allowance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/allowance/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err86]
            } else {
              vErrors.push(err86)
            }
            errors++
          }
          var _valid6 = _errs87 === errors
          if (_valid6 && valid15) {
            valid15 = false
            passing6 = [passing6, 1]
          } else {
            if (_valid6) {
              valid15 = true
              passing6 = 1
            }
          }
          if (!valid15) {
            const err87 = {
              instancePath: instancePath + "/issues/allowance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/allowance/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing6 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err87]
            } else {
              vErrors.push(err87)
            }
            errors++
          } else {
            errors = _errs79
            if (vErrors !== null) {
              if (_errs79) {
                vErrors.length = _errs79
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data23.balance !== undefined) {
          let data27 = data23.balance
          const _errs90 = errors
          let valid17 = false
          let passing7 = null
          const _errs91 = errors
          if (data27 && typeof data27 == "object" && !Array.isArray(data27)) {
            if (data27.token === undefined) {
              const err88 = {
                instancePath: instancePath + "/issues/balance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/balance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "token" },
                message: "must have required property '" + "token" + "'",
              }
              if (vErrors === null) {
                vErrors = [err88]
              } else {
                vErrors.push(err88)
              }
              errors++
            }
            if (data27.actual === undefined) {
              const err89 = {
                instancePath: instancePath + "/issues/balance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/balance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "actual" },
                message: "must have required property '" + "actual" + "'",
              }
              if (vErrors === null) {
                vErrors = [err89]
              } else {
                vErrors.push(err89)
              }
              errors++
            }
            if (data27.expected === undefined) {
              const err90 = {
                instancePath: instancePath + "/issues/balance",
                schemaPath:
                  "#/oneOf/0/properties/issues/properties/balance/oneOf/0/required",
                keyword: "required",
                params: { missingProperty: "expected" },
                message: "must have required property '" + "expected" + "'",
              }
              if (vErrors === null) {
                vErrors = [err90]
              } else {
                vErrors.push(err90)
              }
              errors++
            }
            for (const key8 in data27) {
              if (
                !(key8 === "token" || key8 === "actual" || key8 === "expected")
              ) {
                const err91 = {
                  instancePath: instancePath + "/issues/balance",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/balance/oneOf/0/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key8 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err91]
                } else {
                  vErrors.push(err91)
                }
                errors++
              }
            }
            if (data27.token !== undefined) {
              if (typeof data27.token !== "string") {
                const err92 = {
                  instancePath: instancePath + "/issues/balance/token",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/balance/oneOf/0/properties/token/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err92]
                } else {
                  vErrors.push(err92)
                }
                errors++
              }
            }
            if (data27.actual !== undefined) {
              if (typeof data27.actual !== "string") {
                const err93 = {
                  instancePath: instancePath + "/issues/balance/actual",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/balance/oneOf/0/properties/actual/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err93]
                } else {
                  vErrors.push(err93)
                }
                errors++
              }
            }
            if (data27.expected !== undefined) {
              if (typeof data27.expected !== "string") {
                const err94 = {
                  instancePath: instancePath + "/issues/balance/expected",
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/balance/oneOf/0/properties/expected/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err94]
                } else {
                  vErrors.push(err94)
                }
                errors++
              }
            }
          } else {
            const err95 = {
              instancePath: instancePath + "/issues/balance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/balance/oneOf/0/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err95]
            } else {
              vErrors.push(err95)
            }
            errors++
          }
          var _valid7 = _errs91 === errors
          if (_valid7) {
            valid17 = true
            passing7 = 0
          }
          const _errs100 = errors
          if (data27 !== null) {
            const err96 = {
              instancePath: instancePath + "/issues/balance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/balance/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err96]
            } else {
              vErrors.push(err96)
            }
            errors++
          }
          var _valid7 = _errs100 === errors
          if (_valid7 && valid17) {
            valid17 = false
            passing7 = [passing7, 1]
          } else {
            if (_valid7) {
              valid17 = true
              passing7 = 1
            }
          }
          if (!valid17) {
            const err97 = {
              instancePath: instancePath + "/issues/balance",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/balance/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing7 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err97]
            } else {
              vErrors.push(err97)
            }
            errors++
          } else {
            errors = _errs90
            if (vErrors !== null) {
              if (_errs90) {
                vErrors.length = _errs90
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data23.simulationIncomplete !== undefined) {
          if (typeof data23.simulationIncomplete !== "boolean") {
            const err98 = {
              instancePath: instancePath + "/issues/simulationIncomplete",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/simulationIncomplete/type",
              keyword: "type",
              params: { type: "boolean" },
              message: "must be boolean",
            }
            if (vErrors === null) {
              vErrors = [err98]
            } else {
              vErrors.push(err98)
            }
            errors++
          }
        }
        if (data23.invalidSourcesPassed !== undefined) {
          let data32 = data23.invalidSourcesPassed
          if (Array.isArray(data32)) {
            const len1 = data32.length
            for (let i1 = 0; i1 < len1; i1++) {
              if (typeof data32[i1] !== "string") {
                const err99 = {
                  instancePath:
                    instancePath + "/issues/invalidSourcesPassed/" + i1,
                  schemaPath:
                    "#/oneOf/0/properties/issues/properties/invalidSourcesPassed/items/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err99]
                } else {
                  vErrors.push(err99)
                }
                errors++
              }
            }
          } else {
            const err100 = {
              instancePath: instancePath + "/issues/invalidSourcesPassed",
              schemaPath:
                "#/oneOf/0/properties/issues/properties/invalidSourcesPassed/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array",
            }
            if (vErrors === null) {
              vErrors = [err100]
            } else {
              vErrors.push(err100)
            }
            errors++
          }
        }
      } else {
        const err101 = {
          instancePath: instancePath + "/issues",
          schemaPath: "#/oneOf/0/properties/issues/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err101]
        } else {
          vErrors.push(err101)
        }
        errors++
      }
    }
    if (data.minBuyAmount !== undefined) {
      if (typeof data.minBuyAmount !== "string") {
        const err102 = {
          instancePath: instancePath + "/minBuyAmount",
          schemaPath: "#/oneOf/0/properties/minBuyAmount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err102]
        } else {
          vErrors.push(err102)
        }
        errors++
      }
    }
    if (data.route !== undefined) {
      let data35 = data.route
      if (data35 && typeof data35 == "object" && !Array.isArray(data35)) {
        if (data35.fills === undefined) {
          const err103 = {
            instancePath: instancePath + "/route",
            schemaPath: "#/oneOf/0/properties/route/required",
            keyword: "required",
            params: { missingProperty: "fills" },
            message: "must have required property '" + "fills" + "'",
          }
          if (vErrors === null) {
            vErrors = [err103]
          } else {
            vErrors.push(err103)
          }
          errors++
        }
        if (data35.tokens === undefined) {
          const err104 = {
            instancePath: instancePath + "/route",
            schemaPath: "#/oneOf/0/properties/route/required",
            keyword: "required",
            params: { missingProperty: "tokens" },
            message: "must have required property '" + "tokens" + "'",
          }
          if (vErrors === null) {
            vErrors = [err104]
          } else {
            vErrors.push(err104)
          }
          errors++
        }
        for (const key9 in data35) {
          if (!(key9 === "fills" || key9 === "tokens")) {
            const err105 = {
              instancePath: instancePath + "/route",
              schemaPath: "#/oneOf/0/properties/route/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key9 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err105]
            } else {
              vErrors.push(err105)
            }
            errors++
          }
        }
        if (data35.fills !== undefined) {
          let data36 = data35.fills
          if (Array.isArray(data36)) {
            const len2 = data36.length
            for (let i2 = 0; i2 < len2; i2++) {
              let data37 = data36[i2]
              if (
                data37 &&
                typeof data37 == "object" &&
                !Array.isArray(data37)
              ) {
                if (data37.from === undefined) {
                  const err106 = {
                    instancePath: instancePath + "/route/fills/" + i2,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/fills/items/required",
                    keyword: "required",
                    params: { missingProperty: "from" },
                    message: "must have required property '" + "from" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err106]
                  } else {
                    vErrors.push(err106)
                  }
                  errors++
                }
                if (data37.to === undefined) {
                  const err107 = {
                    instancePath: instancePath + "/route/fills/" + i2,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/fills/items/required",
                    keyword: "required",
                    params: { missingProperty: "to" },
                    message: "must have required property '" + "to" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err107]
                  } else {
                    vErrors.push(err107)
                  }
                  errors++
                }
                if (data37.source === undefined) {
                  const err108 = {
                    instancePath: instancePath + "/route/fills/" + i2,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/fills/items/required",
                    keyword: "required",
                    params: { missingProperty: "source" },
                    message: "must have required property '" + "source" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err108]
                  } else {
                    vErrors.push(err108)
                  }
                  errors++
                }
                if (data37.proportionBps === undefined) {
                  const err109 = {
                    instancePath: instancePath + "/route/fills/" + i2,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/fills/items/required",
                    keyword: "required",
                    params: { missingProperty: "proportionBps" },
                    message:
                      "must have required property '" + "proportionBps" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err109]
                  } else {
                    vErrors.push(err109)
                  }
                  errors++
                }
                for (const key10 in data37) {
                  if (
                    !(
                      key10 === "from" ||
                      key10 === "to" ||
                      key10 === "source" ||
                      key10 === "proportionBps"
                    )
                  ) {
                    const err110 = {
                      instancePath: instancePath + "/route/fills/" + i2,
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/additionalProperties",
                      keyword: "additionalProperties",
                      params: { additionalProperty: key10 },
                      message: "must NOT have additional properties",
                    }
                    if (vErrors === null) {
                      vErrors = [err110]
                    } else {
                      vErrors.push(err110)
                    }
                    errors++
                  }
                }
                if (data37.from !== undefined) {
                  if (typeof data37.from !== "string") {
                    const err111 = {
                      instancePath:
                        instancePath + "/route/fills/" + i2 + "/from",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/properties/from/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err111]
                    } else {
                      vErrors.push(err111)
                    }
                    errors++
                  }
                }
                if (data37.to !== undefined) {
                  if (typeof data37.to !== "string") {
                    const err112 = {
                      instancePath: instancePath + "/route/fills/" + i2 + "/to",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/properties/to/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err112]
                    } else {
                      vErrors.push(err112)
                    }
                    errors++
                  }
                }
                if (data37.source !== undefined) {
                  if (typeof data37.source !== "string") {
                    const err113 = {
                      instancePath:
                        instancePath + "/route/fills/" + i2 + "/source",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/properties/source/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err113]
                    } else {
                      vErrors.push(err113)
                    }
                    errors++
                  }
                }
                if (data37.proportionBps !== undefined) {
                  if (typeof data37.proportionBps !== "string") {
                    const err114 = {
                      instancePath:
                        instancePath + "/route/fills/" + i2 + "/proportionBps",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/fills/items/properties/proportionBps/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err114]
                    } else {
                      vErrors.push(err114)
                    }
                    errors++
                  }
                }
              } else {
                const err115 = {
                  instancePath: instancePath + "/route/fills/" + i2,
                  schemaPath:
                    "#/oneOf/0/properties/route/properties/fills/items/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                }
                if (vErrors === null) {
                  vErrors = [err115]
                } else {
                  vErrors.push(err115)
                }
                errors++
              }
            }
          } else {
            const err116 = {
              instancePath: instancePath + "/route/fills",
              schemaPath: "#/oneOf/0/properties/route/properties/fills/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array",
            }
            if (vErrors === null) {
              vErrors = [err116]
            } else {
              vErrors.push(err116)
            }
            errors++
          }
        }
        if (data35.tokens !== undefined) {
          let data42 = data35.tokens
          if (Array.isArray(data42)) {
            const len3 = data42.length
            for (let i3 = 0; i3 < len3; i3++) {
              let data43 = data42[i3]
              if (
                data43 &&
                typeof data43 == "object" &&
                !Array.isArray(data43)
              ) {
                if (data43.address === undefined) {
                  const err117 = {
                    instancePath: instancePath + "/route/tokens/" + i3,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/tokens/items/required",
                    keyword: "required",
                    params: { missingProperty: "address" },
                    message: "must have required property '" + "address" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err117]
                  } else {
                    vErrors.push(err117)
                  }
                  errors++
                }
                if (data43.symbol === undefined) {
                  const err118 = {
                    instancePath: instancePath + "/route/tokens/" + i3,
                    schemaPath:
                      "#/oneOf/0/properties/route/properties/tokens/items/required",
                    keyword: "required",
                    params: { missingProperty: "symbol" },
                    message: "must have required property '" + "symbol" + "'",
                  }
                  if (vErrors === null) {
                    vErrors = [err118]
                  } else {
                    vErrors.push(err118)
                  }
                  errors++
                }
                for (const key11 in data43) {
                  if (!(key11 === "address" || key11 === "symbol")) {
                    const err119 = {
                      instancePath: instancePath + "/route/tokens/" + i3,
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/tokens/items/additionalProperties",
                      keyword: "additionalProperties",
                      params: { additionalProperty: key11 },
                      message: "must NOT have additional properties",
                    }
                    if (vErrors === null) {
                      vErrors = [err119]
                    } else {
                      vErrors.push(err119)
                    }
                    errors++
                  }
                }
                if (data43.address !== undefined) {
                  if (typeof data43.address !== "string") {
                    const err120 = {
                      instancePath:
                        instancePath + "/route/tokens/" + i3 + "/address",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/tokens/items/properties/address/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err120]
                    } else {
                      vErrors.push(err120)
                    }
                    errors++
                  }
                }
                if (data43.symbol !== undefined) {
                  if (typeof data43.symbol !== "string") {
                    const err121 = {
                      instancePath:
                        instancePath + "/route/tokens/" + i3 + "/symbol",
                      schemaPath:
                        "#/oneOf/0/properties/route/properties/tokens/items/properties/symbol/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    }
                    if (vErrors === null) {
                      vErrors = [err121]
                    } else {
                      vErrors.push(err121)
                    }
                    errors++
                  }
                }
              } else {
                const err122 = {
                  instancePath: instancePath + "/route/tokens/" + i3,
                  schemaPath:
                    "#/oneOf/0/properties/route/properties/tokens/items/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                }
                if (vErrors === null) {
                  vErrors = [err122]
                } else {
                  vErrors.push(err122)
                }
                errors++
              }
            }
          } else {
            const err123 = {
              instancePath: instancePath + "/route/tokens",
              schemaPath: "#/oneOf/0/properties/route/properties/tokens/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array",
            }
            if (vErrors === null) {
              vErrors = [err123]
            } else {
              vErrors.push(err123)
            }
            errors++
          }
        }
      } else {
        const err124 = {
          instancePath: instancePath + "/route",
          schemaPath: "#/oneOf/0/properties/route/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err124]
        } else {
          vErrors.push(err124)
        }
        errors++
      }
    }
    if (data.sellAmount !== undefined) {
      if (typeof data.sellAmount !== "string") {
        const err125 = {
          instancePath: instancePath + "/sellAmount",
          schemaPath: "#/oneOf/0/properties/sellAmount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err125]
        } else {
          vErrors.push(err125)
        }
        errors++
      }
    }
    if (data.sellToken !== undefined) {
      if (typeof data.sellToken !== "string") {
        const err126 = {
          instancePath: instancePath + "/sellToken",
          schemaPath: "#/oneOf/0/properties/sellToken/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err126]
        } else {
          vErrors.push(err126)
        }
        errors++
      }
    }
    if (data.tokenMetadata !== undefined) {
      let data48 = data.tokenMetadata
      if (data48 && typeof data48 == "object" && !Array.isArray(data48)) {
        if (data48.buyToken === undefined) {
          const err127 = {
            instancePath: instancePath + "/tokenMetadata",
            schemaPath: "#/oneOf/0/properties/tokenMetadata/required",
            keyword: "required",
            params: { missingProperty: "buyToken" },
            message: "must have required property '" + "buyToken" + "'",
          }
          if (vErrors === null) {
            vErrors = [err127]
          } else {
            vErrors.push(err127)
          }
          errors++
        }
        if (data48.sellToken === undefined) {
          const err128 = {
            instancePath: instancePath + "/tokenMetadata",
            schemaPath: "#/oneOf/0/properties/tokenMetadata/required",
            keyword: "required",
            params: { missingProperty: "sellToken" },
            message: "must have required property '" + "sellToken" + "'",
          }
          if (vErrors === null) {
            vErrors = [err128]
          } else {
            vErrors.push(err128)
          }
          errors++
        }
        for (const key12 in data48) {
          if (!(key12 === "buyToken" || key12 === "sellToken")) {
            const err129 = {
              instancePath: instancePath + "/tokenMetadata",
              schemaPath:
                "#/oneOf/0/properties/tokenMetadata/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key12 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err129]
            } else {
              vErrors.push(err129)
            }
            errors++
          }
        }
        if (data48.buyToken !== undefined) {
          let data49 = data48.buyToken
          if (data49 && typeof data49 == "object" && !Array.isArray(data49)) {
            if (data49.buyTaxBps === undefined) {
              const err130 = {
                instancePath: instancePath + "/tokenMetadata/buyToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/buyToken/required",
                keyword: "required",
                params: { missingProperty: "buyTaxBps" },
                message: "must have required property '" + "buyTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err130]
              } else {
                vErrors.push(err130)
              }
              errors++
            }
            if (data49.sellTaxBps === undefined) {
              const err131 = {
                instancePath: instancePath + "/tokenMetadata/buyToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/buyToken/required",
                keyword: "required",
                params: { missingProperty: "sellTaxBps" },
                message: "must have required property '" + "sellTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err131]
              } else {
                vErrors.push(err131)
              }
              errors++
            }
            if (data49.transferTaxBps === undefined) {
              const err132 = {
                instancePath: instancePath + "/tokenMetadata/buyToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/buyToken/required",
                keyword: "required",
                params: { missingProperty: "transferTaxBps" },
                message:
                  "must have required property '" + "transferTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err132]
              } else {
                vErrors.push(err132)
              }
              errors++
            }
            for (const key13 in data49) {
              if (
                !(
                  key13 === "buyTaxBps" ||
                  key13 === "sellTaxBps" ||
                  key13 === "transferTaxBps"
                )
              ) {
                const err133 = {
                  instancePath: instancePath + "/tokenMetadata/buyToken",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key13 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err133]
                } else {
                  vErrors.push(err133)
                }
                errors++
              }
            }
            if (data49.buyTaxBps !== undefined) {
              let data50 = data49.buyTaxBps
              const _errs146 = errors
              let valid30 = false
              let passing8 = null
              const _errs147 = errors
              if (typeof data50 !== "string") {
                const err134 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/buyTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err134]
                } else {
                  vErrors.push(err134)
                }
                errors++
              }
              var _valid8 = _errs147 === errors
              if (_valid8) {
                valid30 = true
                passing8 = 0
              }
              const _errs149 = errors
              if (data50 !== null) {
                const err135 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/buyTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err135]
                } else {
                  vErrors.push(err135)
                }
                errors++
              }
              var _valid8 = _errs149 === errors
              if (_valid8 && valid30) {
                valid30 = false
                passing8 = [passing8, 1]
              } else {
                if (_valid8) {
                  valid30 = true
                  passing8 = 1
                }
              }
              if (!valid30) {
                const err136 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/buyTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing8 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err136]
                } else {
                  vErrors.push(err136)
                }
                errors++
              } else {
                errors = _errs146
                if (vErrors !== null) {
                  if (_errs146) {
                    vErrors.length = _errs146
                  } else {
                    vErrors = null
                  }
                }
              }
            }
            if (data49.sellTaxBps !== undefined) {
              let data51 = data49.sellTaxBps
              const _errs152 = errors
              let valid31 = false
              let passing9 = null
              const _errs153 = errors
              if (typeof data51 !== "string") {
                const err137 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/sellTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err137]
                } else {
                  vErrors.push(err137)
                }
                errors++
              }
              var _valid9 = _errs153 === errors
              if (_valid9) {
                valid31 = true
                passing9 = 0
              }
              const _errs155 = errors
              if (data51 !== null) {
                const err138 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/sellTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err138]
                } else {
                  vErrors.push(err138)
                }
                errors++
              }
              var _valid9 = _errs155 === errors
              if (_valid9 && valid31) {
                valid31 = false
                passing9 = [passing9, 1]
              } else {
                if (_valid9) {
                  valid31 = true
                  passing9 = 1
                }
              }
              if (!valid31) {
                const err139 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/sellTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing9 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err139]
                } else {
                  vErrors.push(err139)
                }
                errors++
              } else {
                errors = _errs152
                if (vErrors !== null) {
                  if (_errs152) {
                    vErrors.length = _errs152
                  } else {
                    vErrors = null
                  }
                }
              }
            }
            if (data49.transferTaxBps !== undefined) {
              let data52 = data49.transferTaxBps
              const _errs158 = errors
              let valid32 = false
              let passing10 = null
              const _errs159 = errors
              if (typeof data52 !== "string") {
                const err140 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/transferTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err140]
                } else {
                  vErrors.push(err140)
                }
                errors++
              }
              var _valid10 = _errs159 === errors
              if (_valid10) {
                valid32 = true
                passing10 = 0
              }
              const _errs161 = errors
              if (data52 !== null) {
                const err141 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/transferTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err141]
                } else {
                  vErrors.push(err141)
                }
                errors++
              }
              var _valid10 = _errs161 === errors
              if (_valid10 && valid32) {
                valid32 = false
                passing10 = [passing10, 1]
              } else {
                if (_valid10) {
                  valid32 = true
                  passing10 = 1
                }
              }
              if (!valid32) {
                const err142 = {
                  instancePath:
                    instancePath + "/tokenMetadata/buyToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/buyToken/properties/transferTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing10 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err142]
                } else {
                  vErrors.push(err142)
                }
                errors++
              } else {
                errors = _errs158
                if (vErrors !== null) {
                  if (_errs158) {
                    vErrors.length = _errs158
                  } else {
                    vErrors = null
                  }
                }
              }
            }
          } else {
            const err143 = {
              instancePath: instancePath + "/tokenMetadata/buyToken",
              schemaPath:
                "#/oneOf/0/properties/tokenMetadata/properties/buyToken/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err143]
            } else {
              vErrors.push(err143)
            }
            errors++
          }
        }
        if (data48.sellToken !== undefined) {
          let data53 = data48.sellToken
          if (data53 && typeof data53 == "object" && !Array.isArray(data53)) {
            if (data53.buyTaxBps === undefined) {
              const err144 = {
                instancePath: instancePath + "/tokenMetadata/sellToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/sellToken/required",
                keyword: "required",
                params: { missingProperty: "buyTaxBps" },
                message: "must have required property '" + "buyTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err144]
              } else {
                vErrors.push(err144)
              }
              errors++
            }
            if (data53.sellTaxBps === undefined) {
              const err145 = {
                instancePath: instancePath + "/tokenMetadata/sellToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/sellToken/required",
                keyword: "required",
                params: { missingProperty: "sellTaxBps" },
                message: "must have required property '" + "sellTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err145]
              } else {
                vErrors.push(err145)
              }
              errors++
            }
            if (data53.transferTaxBps === undefined) {
              const err146 = {
                instancePath: instancePath + "/tokenMetadata/sellToken",
                schemaPath:
                  "#/oneOf/0/properties/tokenMetadata/properties/sellToken/required",
                keyword: "required",
                params: { missingProperty: "transferTaxBps" },
                message:
                  "must have required property '" + "transferTaxBps" + "'",
              }
              if (vErrors === null) {
                vErrors = [err146]
              } else {
                vErrors.push(err146)
              }
              errors++
            }
            for (const key14 in data53) {
              if (
                !(
                  key14 === "buyTaxBps" ||
                  key14 === "sellTaxBps" ||
                  key14 === "transferTaxBps"
                )
              ) {
                const err147 = {
                  instancePath: instancePath + "/tokenMetadata/sellToken",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/additionalProperties",
                  keyword: "additionalProperties",
                  params: { additionalProperty: key14 },
                  message: "must NOT have additional properties",
                }
                if (vErrors === null) {
                  vErrors = [err147]
                } else {
                  vErrors.push(err147)
                }
                errors++
              }
            }
            if (data53.buyTaxBps !== undefined) {
              let data54 = data53.buyTaxBps
              const _errs167 = errors
              let valid34 = false
              let passing11 = null
              const _errs168 = errors
              if (typeof data54 !== "string") {
                const err148 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/buyTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err148]
                } else {
                  vErrors.push(err148)
                }
                errors++
              }
              var _valid11 = _errs168 === errors
              if (_valid11) {
                valid34 = true
                passing11 = 0
              }
              const _errs170 = errors
              if (data54 !== null) {
                const err149 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/buyTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err149]
                } else {
                  vErrors.push(err149)
                }
                errors++
              }
              var _valid11 = _errs170 === errors
              if (_valid11 && valid34) {
                valid34 = false
                passing11 = [passing11, 1]
              } else {
                if (_valid11) {
                  valid34 = true
                  passing11 = 1
                }
              }
              if (!valid34) {
                const err150 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/buyTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/buyTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing11 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err150]
                } else {
                  vErrors.push(err150)
                }
                errors++
              } else {
                errors = _errs167
                if (vErrors !== null) {
                  if (_errs167) {
                    vErrors.length = _errs167
                  } else {
                    vErrors = null
                  }
                }
              }
            }
            if (data53.sellTaxBps !== undefined) {
              let data55 = data53.sellTaxBps
              const _errs173 = errors
              let valid35 = false
              let passing12 = null
              const _errs174 = errors
              if (typeof data55 !== "string") {
                const err151 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/sellTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err151]
                } else {
                  vErrors.push(err151)
                }
                errors++
              }
              var _valid12 = _errs174 === errors
              if (_valid12) {
                valid35 = true
                passing12 = 0
              }
              const _errs176 = errors
              if (data55 !== null) {
                const err152 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/sellTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err152]
                } else {
                  vErrors.push(err152)
                }
                errors++
              }
              var _valid12 = _errs176 === errors
              if (_valid12 && valid35) {
                valid35 = false
                passing12 = [passing12, 1]
              } else {
                if (_valid12) {
                  valid35 = true
                  passing12 = 1
                }
              }
              if (!valid35) {
                const err153 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/sellTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/sellTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing12 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err153]
                } else {
                  vErrors.push(err153)
                }
                errors++
              } else {
                errors = _errs173
                if (vErrors !== null) {
                  if (_errs173) {
                    vErrors.length = _errs173
                  } else {
                    vErrors = null
                  }
                }
              }
            }
            if (data53.transferTaxBps !== undefined) {
              let data56 = data53.transferTaxBps
              const _errs179 = errors
              let valid36 = false
              let passing13 = null
              const _errs180 = errors
              if (typeof data56 !== "string") {
                const err154 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/transferTaxBps/oneOf/0/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                }
                if (vErrors === null) {
                  vErrors = [err154]
                } else {
                  vErrors.push(err154)
                }
                errors++
              }
              var _valid13 = _errs180 === errors
              if (_valid13) {
                valid36 = true
                passing13 = 0
              }
              const _errs182 = errors
              if (data56 !== null) {
                const err155 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/transferTaxBps/oneOf/1/type",
                  keyword: "type",
                  params: { type: "null" },
                  message: "must be null",
                }
                if (vErrors === null) {
                  vErrors = [err155]
                } else {
                  vErrors.push(err155)
                }
                errors++
              }
              var _valid13 = _errs182 === errors
              if (_valid13 && valid36) {
                valid36 = false
                passing13 = [passing13, 1]
              } else {
                if (_valid13) {
                  valid36 = true
                  passing13 = 1
                }
              }
              if (!valid36) {
                const err156 = {
                  instancePath:
                    instancePath + "/tokenMetadata/sellToken/transferTaxBps",
                  schemaPath:
                    "#/oneOf/0/properties/tokenMetadata/properties/sellToken/properties/transferTaxBps/oneOf",
                  keyword: "oneOf",
                  params: { passingSchemas: passing13 },
                  message: "must match exactly one schema in oneOf",
                }
                if (vErrors === null) {
                  vErrors = [err156]
                } else {
                  vErrors.push(err156)
                }
                errors++
              } else {
                errors = _errs179
                if (vErrors !== null) {
                  if (_errs179) {
                    vErrors.length = _errs179
                  } else {
                    vErrors = null
                  }
                }
              }
            }
          } else {
            const err157 = {
              instancePath: instancePath + "/tokenMetadata/sellToken",
              schemaPath:
                "#/oneOf/0/properties/tokenMetadata/properties/sellToken/type",
              keyword: "type",
              params: { type: "object" },
              message: "must be object",
            }
            if (vErrors === null) {
              vErrors = [err157]
            } else {
              vErrors.push(err157)
            }
            errors++
          }
        }
      } else {
        const err158 = {
          instancePath: instancePath + "/tokenMetadata",
          schemaPath: "#/oneOf/0/properties/tokenMetadata/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err158]
        } else {
          vErrors.push(err158)
        }
        errors++
      }
    }
    if (data.totalNetworkFee !== undefined) {
      let data57 = data.totalNetworkFee
      const _errs185 = errors
      let valid37 = false
      let passing14 = null
      const _errs186 = errors
      if (typeof data57 !== "string") {
        const err159 = {
          instancePath: instancePath + "/totalNetworkFee",
          schemaPath: "#/oneOf/0/properties/totalNetworkFee/oneOf/0/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err159]
        } else {
          vErrors.push(err159)
        }
        errors++
      }
      var _valid14 = _errs186 === errors
      if (_valid14) {
        valid37 = true
        passing14 = 0
      }
      const _errs188 = errors
      if (data57 !== null) {
        const err160 = {
          instancePath: instancePath + "/totalNetworkFee",
          schemaPath: "#/oneOf/0/properties/totalNetworkFee/oneOf/1/type",
          keyword: "type",
          params: { type: "null" },
          message: "must be null",
        }
        if (vErrors === null) {
          vErrors = [err160]
        } else {
          vErrors.push(err160)
        }
        errors++
      }
      var _valid14 = _errs188 === errors
      if (_valid14 && valid37) {
        valid37 = false
        passing14 = [passing14, 1]
      } else {
        if (_valid14) {
          valid37 = true
          passing14 = 1
        }
      }
      if (!valid37) {
        const err161 = {
          instancePath: instancePath + "/totalNetworkFee",
          schemaPath: "#/oneOf/0/properties/totalNetworkFee/oneOf",
          keyword: "oneOf",
          params: { passingSchemas: passing14 },
          message: "must match exactly one schema in oneOf",
        }
        if (vErrors === null) {
          vErrors = [err161]
        } else {
          vErrors.push(err161)
        }
        errors++
      } else {
        errors = _errs185
        if (vErrors !== null) {
          if (_errs185) {
            vErrors.length = _errs185
          } else {
            vErrors = null
          }
        }
      }
    }
    if (data.transaction !== undefined) {
      let data58 = data.transaction
      if (data58 && typeof data58 == "object" && !Array.isArray(data58)) {
        if (data58.to === undefined) {
          const err162 = {
            instancePath: instancePath + "/transaction",
            schemaPath: "#/oneOf/0/properties/transaction/required",
            keyword: "required",
            params: { missingProperty: "to" },
            message: "must have required property '" + "to" + "'",
          }
          if (vErrors === null) {
            vErrors = [err162]
          } else {
            vErrors.push(err162)
          }
          errors++
        }
        if (data58.data === undefined) {
          const err163 = {
            instancePath: instancePath + "/transaction",
            schemaPath: "#/oneOf/0/properties/transaction/required",
            keyword: "required",
            params: { missingProperty: "data" },
            message: "must have required property '" + "data" + "'",
          }
          if (vErrors === null) {
            vErrors = [err163]
          } else {
            vErrors.push(err163)
          }
          errors++
        }
        if (data58.gas === undefined) {
          const err164 = {
            instancePath: instancePath + "/transaction",
            schemaPath: "#/oneOf/0/properties/transaction/required",
            keyword: "required",
            params: { missingProperty: "gas" },
            message: "must have required property '" + "gas" + "'",
          }
          if (vErrors === null) {
            vErrors = [err164]
          } else {
            vErrors.push(err164)
          }
          errors++
        }
        if (data58.gasPrice === undefined) {
          const err165 = {
            instancePath: instancePath + "/transaction",
            schemaPath: "#/oneOf/0/properties/transaction/required",
            keyword: "required",
            params: { missingProperty: "gasPrice" },
            message: "must have required property '" + "gasPrice" + "'",
          }
          if (vErrors === null) {
            vErrors = [err165]
          } else {
            vErrors.push(err165)
          }
          errors++
        }
        if (data58.value === undefined) {
          const err166 = {
            instancePath: instancePath + "/transaction",
            schemaPath: "#/oneOf/0/properties/transaction/required",
            keyword: "required",
            params: { missingProperty: "value" },
            message: "must have required property '" + "value" + "'",
          }
          if (vErrors === null) {
            vErrors = [err166]
          } else {
            vErrors.push(err166)
          }
          errors++
        }
        for (const key15 in data58) {
          if (
            !(
              key15 === "to" ||
              key15 === "data" ||
              key15 === "gas" ||
              key15 === "gasPrice" ||
              key15 === "value"
            )
          ) {
            const err167 = {
              instancePath: instancePath + "/transaction",
              schemaPath:
                "#/oneOf/0/properties/transaction/additionalProperties",
              keyword: "additionalProperties",
              params: { additionalProperty: key15 },
              message: "must NOT have additional properties",
            }
            if (vErrors === null) {
              vErrors = [err167]
            } else {
              vErrors.push(err167)
            }
            errors++
          }
        }
        if (data58.to !== undefined) {
          if (typeof data58.to !== "string") {
            const err168 = {
              instancePath: instancePath + "/transaction/to",
              schemaPath: "#/oneOf/0/properties/transaction/properties/to/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            }
            if (vErrors === null) {
              vErrors = [err168]
            } else {
              vErrors.push(err168)
            }
            errors++
          }
        }
        if (data58.data !== undefined) {
          if (typeof data58.data !== "string") {
            const err169 = {
              instancePath: instancePath + "/transaction/data",
              schemaPath:
                "#/oneOf/0/properties/transaction/properties/data/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            }
            if (vErrors === null) {
              vErrors = [err169]
            } else {
              vErrors.push(err169)
            }
            errors++
          }
        }
        if (data58.gas !== undefined) {
          let data61 = data58.gas
          const _errs198 = errors
          let valid39 = false
          let passing15 = null
          const _errs199 = errors
          if (typeof data61 !== "string") {
            const err170 = {
              instancePath: instancePath + "/transaction/gas",
              schemaPath:
                "#/oneOf/0/properties/transaction/properties/gas/oneOf/0/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            }
            if (vErrors === null) {
              vErrors = [err170]
            } else {
              vErrors.push(err170)
            }
            errors++
          }
          var _valid15 = _errs199 === errors
          if (_valid15) {
            valid39 = true
            passing15 = 0
          }
          const _errs201 = errors
          if (data61 !== null) {
            const err171 = {
              instancePath: instancePath + "/transaction/gas",
              schemaPath:
                "#/oneOf/0/properties/transaction/properties/gas/oneOf/1/type",
              keyword: "type",
              params: { type: "null" },
              message: "must be null",
            }
            if (vErrors === null) {
              vErrors = [err171]
            } else {
              vErrors.push(err171)
            }
            errors++
          }
          var _valid15 = _errs201 === errors
          if (_valid15 && valid39) {
            valid39 = false
            passing15 = [passing15, 1]
          } else {
            if (_valid15) {
              valid39 = true
              passing15 = 1
            }
          }
          if (!valid39) {
            const err172 = {
              instancePath: instancePath + "/transaction/gas",
              schemaPath:
                "#/oneOf/0/properties/transaction/properties/gas/oneOf",
              keyword: "oneOf",
              params: { passingSchemas: passing15 },
              message: "must match exactly one schema in oneOf",
            }
            if (vErrors === null) {
              vErrors = [err172]
            } else {
              vErrors.push(err172)
            }
            errors++
          } else {
            errors = _errs198
            if (vErrors !== null) {
              if (_errs198) {
                vErrors.length = _errs198
              } else {
                vErrors = null
              }
            }
          }
        }
        if (data58.gasPrice !== undefined) {
          if (typeof data58.gasPrice !== "string") {
            const err173 = {
              instancePath: instancePath + "/transaction/gasPrice",
              schemaPath:
                "#/oneOf/0/properties/transaction/properties/gasPrice/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            }
            if (vErrors === null) {
              vErrors = [err173]
            } else {
              vErrors.push(err173)
            }
            errors++
          }
        }
        if (data58.value !== undefined) {
          if (typeof data58.value !== "string") {
            const err174 = {
              instancePath: instancePath + "/transaction/value",
              schemaPath:
                "#/oneOf/0/properties/transaction/properties/value/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            }
            if (vErrors === null) {
              vErrors = [err174]
            } else {
              vErrors.push(err174)
            }
            errors++
          }
        }
      } else {
        const err175 = {
          instancePath: instancePath + "/transaction",
          schemaPath: "#/oneOf/0/properties/transaction/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err175]
        } else {
          vErrors.push(err175)
        }
        errors++
      }
    }
    if (data.zid !== undefined) {
      if (typeof data.zid !== "string") {
        const err176 = {
          instancePath: instancePath + "/zid",
          schemaPath: "#/oneOf/0/properties/zid/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err176]
        } else {
          vErrors.push(err176)
        }
        errors++
      }
    }
  } else {
    const err177 = {
      instancePath,
      schemaPath: "#/oneOf/0/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err177]
    } else {
      vErrors.push(err177)
    }
    errors++
  }
  var _valid0 = _errs1 === errors
  if (_valid0) {
    valid0 = true
    passing0 = 0
  }
  const _errs209 = errors
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.liquidityAvailable === undefined) {
      const err178 = {
        instancePath,
        schemaPath: "#/oneOf/1/required",
        keyword: "required",
        params: { missingProperty: "liquidityAvailable" },
        message: "must have required property '" + "liquidityAvailable" + "'",
      }
      if (vErrors === null) {
        vErrors = [err178]
      } else {
        vErrors.push(err178)
      }
      errors++
    }
    if (data.zid === undefined) {
      const err179 = {
        instancePath,
        schemaPath: "#/oneOf/1/required",
        keyword: "required",
        params: { missingProperty: "zid" },
        message: "must have required property '" + "zid" + "'",
      }
      if (vErrors === null) {
        vErrors = [err179]
      } else {
        vErrors.push(err179)
      }
      errors++
    }
    for (const key16 in data) {
      if (!(key16 === "liquidityAvailable" || key16 === "zid")) {
        const err180 = {
          instancePath,
          schemaPath: "#/oneOf/1/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: key16 },
          message: "must NOT have additional properties",
        }
        if (vErrors === null) {
          vErrors = [err180]
        } else {
          vErrors.push(err180)
        }
        errors++
      }
    }
    if (data.liquidityAvailable !== undefined) {
      let data65 = data.liquidityAvailable
      if (typeof data65 !== "boolean") {
        const err181 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/oneOf/1/properties/liquidityAvailable/type",
          keyword: "type",
          params: { type: "boolean" },
          message: "must be boolean",
        }
        if (vErrors === null) {
          vErrors = [err181]
        } else {
          vErrors.push(err181)
        }
        errors++
      }
      if (false !== data65) {
        const err182 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/oneOf/1/properties/liquidityAvailable/const",
          keyword: "const",
          params: { allowedValue: false },
          message: "must be equal to constant",
        }
        if (vErrors === null) {
          vErrors = [err182]
        } else {
          vErrors.push(err182)
        }
        errors++
      }
    }
    if (data.zid !== undefined) {
      if (typeof data.zid !== "string") {
        const err183 = {
          instancePath: instancePath + "/zid",
          schemaPath: "#/oneOf/1/properties/zid/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err183]
        } else {
          vErrors.push(err183)
        }
        errors++
      }
    }
  } else {
    const err184 = {
      instancePath,
      schemaPath: "#/oneOf/1/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err184]
    } else {
      vErrors.push(err184)
    }
    errors++
  }
  var _valid0 = _errs209 === errors
  if (_valid0 && valid0) {
    valid0 = false
    passing0 = [passing0, 1]
  } else {
    if (_valid0) {
      valid0 = true
      passing0 = 1
    }
  }
  if (!valid0) {
    const err185 = {
      instancePath,
      schemaPath: "#/oneOf",
      keyword: "oneOf",
      params: { passingSchemas: passing0 },
      message: "must match exactly one schema in oneOf",
    }
    if (vErrors === null) {
      vErrors = [err185]
    } else {
      vErrors.push(err185)
    }
    errors++
  } else {
    errors = _errs0
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0
      } else {
        vErrors = null
      }
    }
  }
  validate23.errors = vErrors
  return errors === 0
}
