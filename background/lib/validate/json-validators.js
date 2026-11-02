"use strict"
exports.isValidCoinGeckoPriceResponse = validate21
const schema6 = {
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
function validate21(
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
  validate21.errors = vErrors
  return errors === 0
}
exports.isValidUniswapTokenListResponse = validate22
const schema7 = {
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
          minLength: 0,
          maxLength: 60,
          anyOf: [{ const: "" }, { pattern: "^[ \\S+]+$" }],
          examples: ["USD Coin"],
        },
        symbol: {
          type: "string",
          description: "The symbol for the token",
          minLength: 0,
          maxLength: 20,
          anyOf: [{ const: "" }, { pattern: "^\\S+$" }],
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
    tokenMap: {
      type: "object",
      description:
        "A mapping of key 'chainId_tokenAddress' to its corresponding token object",
      minProperties: 1,
      maxProperties: 10000,
      propertyNames: { type: "string" },
      additionalProperties: { $ref: "#/definitions/TokenInfo" },
      examples: [
        {
          "4_0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984": {
            name: "Uniswap",
            address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
            symbol: "UNI",
            decimals: 18,
            chainId: 4,
            logoURI: "ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg",
          },
        },
      ],
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
const func2 = require("ajv/dist/runtime/ucs2length").default
const pattern0 = new RegExp("^[\\w ]+$", "u")
const schema8 = {
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
function validate23(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.major === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "major" },
        message: "must have required property '" + "major" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.minor === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "minor" },
        message: "must have required property '" + "minor" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.patch === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "patch" },
        message: "must have required property '" + "patch" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    for (const key0 in data) {
      if (!(key0 === "major" || key0 === "minor" || key0 === "patch")) {
        const err3 = {
          instancePath,
          schemaPath: "#/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: key0 },
          message: "must NOT have additional properties",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
      }
    }
    if (data.major !== undefined) {
      let data0 = data.major
      if (
        !(
          typeof data0 == "number" &&
          !(data0 % 1) &&
          !isNaN(data0) &&
          isFinite(data0)
        )
      ) {
        const err4 = {
          instancePath: instancePath + "/major",
          schemaPath: "#/properties/major/type",
          keyword: "type",
          params: { type: "integer" },
          message: "must be integer",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
      if (typeof data0 == "number" && isFinite(data0)) {
        if (data0 < 0 || isNaN(data0)) {
          const err5 = {
            instancePath: instancePath + "/major",
            schemaPath: "#/properties/major/minimum",
            keyword: "minimum",
            params: { comparison: ">=", limit: 0 },
            message: "must be >= 0",
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
      }
    }
    if (data.minor !== undefined) {
      let data1 = data.minor
      if (
        !(
          typeof data1 == "number" &&
          !(data1 % 1) &&
          !isNaN(data1) &&
          isFinite(data1)
        )
      ) {
        const err6 = {
          instancePath: instancePath + "/minor",
          schemaPath: "#/properties/minor/type",
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
      if (typeof data1 == "number" && isFinite(data1)) {
        if (data1 < 0 || isNaN(data1)) {
          const err7 = {
            instancePath: instancePath + "/minor",
            schemaPath: "#/properties/minor/minimum",
            keyword: "minimum",
            params: { comparison: ">=", limit: 0 },
            message: "must be >= 0",
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
    if (data.patch !== undefined) {
      let data2 = data.patch
      if (
        !(
          typeof data2 == "number" &&
          !(data2 % 1) &&
          !isNaN(data2) &&
          isFinite(data2)
        )
      ) {
        const err8 = {
          instancePath: instancePath + "/patch",
          schemaPath: "#/properties/patch/type",
          keyword: "type",
          params: { type: "integer" },
          message: "must be integer",
        }
        if (vErrors === null) {
          vErrors = [err8]
        } else {
          vErrors.push(err8)
        }
        errors++
      }
      if (typeof data2 == "number" && isFinite(data2)) {
        if (data2 < 0 || isNaN(data2)) {
          const err9 = {
            instancePath: instancePath + "/patch",
            schemaPath: "#/properties/patch/minimum",
            keyword: "minimum",
            params: { comparison: ">=", limit: 0 },
            message: "must be >= 0",
          }
          if (vErrors === null) {
            vErrors = [err9]
          } else {
            vErrors.push(err9)
          }
          errors++
        }
      }
    }
  } else {
    const err10 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err10]
    } else {
      vErrors.push(err10)
    }
    errors++
  }
  validate23.errors = vErrors
  return errors === 0
}
const schema9 = {
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
      minLength: 0,
      maxLength: 60,
      anyOf: [{ const: "" }, { pattern: "^[ \\S+]+$" }],
      examples: ["USD Coin"],
    },
    symbol: {
      type: "string",
      description: "The symbol for the token",
      minLength: 0,
      maxLength: 20,
      anyOf: [{ const: "" }, { pattern: "^\\S+$" }],
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
const pattern2 = new RegExp("^[ \\S+]+$", "u")
const pattern3 = new RegExp("^\\S+$", "u")
const schema10 = {
  type: "string",
  description: "The unique identifier of a tag",
  minLength: 1,
  maxLength: 10,
  pattern: "^[\\w]+$",
  examples: ["compound", "stablecoin"],
}
const pattern4 = new RegExp("^[\\w]+$", "u")
function validate26(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (typeof data === "string") {
    if (func2(data) > 10) {
      const err0 = {
        instancePath,
        schemaPath: "#/maxLength",
        keyword: "maxLength",
        params: { limit: 10 },
        message: "must NOT have more than 10 characters",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (func2(data) < 1) {
      const err1 = {
        instancePath,
        schemaPath: "#/minLength",
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
    if (!pattern4.test(data)) {
      const err2 = {
        instancePath,
        schemaPath: "#/pattern",
        keyword: "pattern",
        params: { pattern: "^[\\w]+$" },
        message: 'must match pattern "' + "^[\\w]+$" + '"',
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  } else {
    const err3 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string",
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
    }
    errors++
  }
  validate26.errors = vErrors
  return errors === 0
}
const schema11 = {
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
const schema12 = {
  type: "string",
  description: "The name of a token extension property",
  minLength: 1,
  maxLength: 40,
  pattern: "^[\\w]+$",
  examples: ["color", "is_fee_on_transfer", "aliases"],
}
function validate29(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (typeof data === "string") {
    if (func2(data) > 40) {
      const err0 = {
        instancePath,
        schemaPath: "#/maxLength",
        keyword: "maxLength",
        params: { limit: 40 },
        message: "must NOT have more than 40 characters",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (func2(data) < 1) {
      const err1 = {
        instancePath,
        schemaPath: "#/minLength",
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
    if (!pattern4.test(data)) {
      const err2 = {
        instancePath,
        schemaPath: "#/pattern",
        keyword: "pattern",
        params: { pattern: "^[\\w]+$" },
        message: 'must match pattern "' + "^[\\w]+$" + '"',
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
  } else {
    const err3 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string",
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
    }
    errors++
  }
  validate29.errors = vErrors
  return errors === 0
}
const schema13 = {
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
const schema14 = {
  anyOf: [
    { type: "string", minLength: 1, maxLength: 42, examples: ["#00000"] },
    { type: "boolean", examples: [true] },
    { type: "number", examples: [15] },
    { type: "null" },
  ],
}
function validate32(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  const _errs1 = errors
  if (typeof data === "string") {
    if (func2(data) > 42) {
      const err0 = {
        instancePath,
        schemaPath: "#/anyOf/0/maxLength",
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
    if (func2(data) < 1) {
      const err1 = {
        instancePath,
        schemaPath: "#/anyOf/0/minLength",
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
      schemaPath: "#/anyOf/0/type",
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
  var _valid0 = _errs1 === errors
  valid0 = valid0 || _valid0
  if (!valid0) {
    const _errs3 = errors
    if (typeof data !== "boolean") {
      const err3 = {
        instancePath,
        schemaPath: "#/anyOf/1/type",
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
    var _valid0 = _errs3 === errors
    valid0 = valid0 || _valid0
    if (!valid0) {
      const _errs5 = errors
      if (!(typeof data == "number" && isFinite(data))) {
        const err4 = {
          instancePath,
          schemaPath: "#/anyOf/2/type",
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
      var _valid0 = _errs5 === errors
      valid0 = valid0 || _valid0
      if (!valid0) {
        const _errs7 = errors
        if (data !== null) {
          const err5 = {
            instancePath,
            schemaPath: "#/anyOf/3/type",
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
        var _valid0 = _errs7 === errors
        valid0 = valid0 || _valid0
      }
    }
  }
  if (!valid0) {
    const err6 = {
      instancePath,
      schemaPath: "#/anyOf",
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
    errors = _errs0
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0
      } else {
        vErrors = null
      }
    }
  }
  validate32.errors = vErrors
  return errors === 0
}
const schema15 = {
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
const schema16 = { anyOf: [{ $ref: "#/definitions/ExtensionPrimitiveValue" }] }
function validate38(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  const _errs1 = errors
  if (
    !validate32(data, {
      instancePath,
      parentData,
      parentDataProperty,
      rootData,
    })
  ) {
    vErrors =
      vErrors === null ? validate32.errors : vErrors.concat(validate32.errors)
    errors = vErrors.length
  }
  var _valid0 = _errs1 === errors
  valid0 = valid0 || _valid0
  if (!valid0) {
    const err0 = {
      instancePath,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err0]
    } else {
      vErrors.push(err0)
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
  validate38.errors = vErrors
  return errors === 0
}
function validate35(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  const _errs1 = errors
  if (
    !validate32(data, {
      instancePath,
      parentData,
      parentDataProperty,
      rootData,
    })
  ) {
    vErrors =
      vErrors === null ? validate32.errors : vErrors.concat(validate32.errors)
    errors = vErrors.length
  }
  var _valid0 = _errs1 === errors
  valid0 = valid0 || _valid0
  if (!valid0) {
    const _errs2 = errors
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (Object.keys(data).length > 10) {
        const err0 = {
          instancePath,
          schemaPath: "#/anyOf/1/maxProperties",
          keyword: "maxProperties",
          params: { limit: 10 },
          message: "must NOT have more than 10 properties",
        }
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      }
      for (const key0 in data) {
        const _errs4 = errors
        if (
          !validate29(key0, {
            instancePath,
            parentData: data,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate29.errors
              : vErrors.concat(validate29.errors)
          errors = vErrors.length
        }
        var valid1 = _errs4 === errors
        if (!valid1) {
          const err1 = {
            instancePath,
            schemaPath: "#/anyOf/1/propertyNames",
            keyword: "propertyNames",
            params: { propertyName: key0 },
            message: "property name must be valid",
          }
          if (vErrors === null) {
            vErrors = [err1]
          } else {
            vErrors.push(err1)
          }
          errors++
        }
      }
      for (const key1 in data) {
        if (
          !validate38(data[key1], {
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
              ? validate38.errors
              : vErrors.concat(validate38.errors)
          errors = vErrors.length
        }
      }
    } else {
      const err2 = {
        instancePath,
        schemaPath: "#/anyOf/1/type",
        keyword: "type",
        params: { type: "object" },
        message: "must be object",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    var _valid0 = _errs2 === errors
    valid0 = valid0 || _valid0
  }
  if (!valid0) {
    const err3 = {
      instancePath,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
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
  validate35.errors = vErrors
  return errors === 0
}
function validate31(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  const _errs1 = errors
  if (
    !validate32(data, {
      instancePath,
      parentData,
      parentDataProperty,
      rootData,
    })
  ) {
    vErrors =
      vErrors === null ? validate32.errors : vErrors.concat(validate32.errors)
    errors = vErrors.length
  }
  var _valid0 = _errs1 === errors
  valid0 = valid0 || _valid0
  if (!valid0) {
    const _errs2 = errors
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (Object.keys(data).length > 10) {
        const err0 = {
          instancePath,
          schemaPath: "#/anyOf/1/maxProperties",
          keyword: "maxProperties",
          params: { limit: 10 },
          message: "must NOT have more than 10 properties",
        }
        if (vErrors === null) {
          vErrors = [err0]
        } else {
          vErrors.push(err0)
        }
        errors++
      }
      for (const key0 in data) {
        const _errs4 = errors
        if (
          !validate29(key0, {
            instancePath,
            parentData: data,
            parentDataProperty,
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate29.errors
              : vErrors.concat(validate29.errors)
          errors = vErrors.length
        }
        var valid1 = _errs4 === errors
        if (!valid1) {
          const err1 = {
            instancePath,
            schemaPath: "#/anyOf/1/propertyNames",
            keyword: "propertyNames",
            params: { propertyName: key0 },
            message: "property name must be valid",
          }
          if (vErrors === null) {
            vErrors = [err1]
          } else {
            vErrors.push(err1)
          }
          errors++
        }
      }
      for (const key1 in data) {
        if (
          !validate35(data[key1], {
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
              ? validate35.errors
              : vErrors.concat(validate35.errors)
          errors = vErrors.length
        }
      }
    } else {
      const err2 = {
        instancePath,
        schemaPath: "#/anyOf/1/type",
        keyword: "type",
        params: { type: "object" },
        message: "must be object",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    var _valid0 = _errs2 === errors
    valid0 = valid0 || _valid0
  }
  if (!valid0) {
    const err3 = {
      instancePath,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err3]
    } else {
      vErrors.push(err3)
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
  validate31.errors = vErrors
  return errors === 0
}
function validate28(
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
        message: "must NOT have more than 10 properties",
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
      if (
        !validate29(key0, {
          instancePath,
          parentData: data,
          parentDataProperty,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate29.errors
            : vErrors.concat(validate29.errors)
        errors = vErrors.length
      }
      var valid0 = _errs1 === errors
      if (!valid0) {
        const err1 = {
          instancePath,
          schemaPath: "#/propertyNames",
          keyword: "propertyNames",
          params: { propertyName: key0 },
          message: "property name must be valid",
        }
        if (vErrors === null) {
          vErrors = [err1]
        } else {
          vErrors.push(err1)
        }
        errors++
      }
    }
    for (const key1 in data) {
      if (
        !validate31(data[key1], {
          instancePath:
            instancePath + "/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),
          parentData: data,
          parentDataProperty: key1,
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate31.errors
            : vErrors.concat(validate31.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err2 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err2]
    } else {
      vErrors.push(err2)
    }
    errors++
  }
  validate28.errors = vErrors
  return errors === 0
}
function validate25(
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
      const _errs10 = errors
      let valid1 = false
      const _errs11 = errors
      if ("" !== data3) {
        const err13 = {
          instancePath: instancePath + "/name",
          schemaPath: "#/properties/name/anyOf/0/const",
          keyword: "const",
          params: { allowedValue: "" },
          message: "must be equal to constant",
        }
        if (vErrors === null) {
          vErrors = [err13]
        } else {
          vErrors.push(err13)
        }
        errors++
      }
      var _valid0 = _errs11 === errors
      valid1 = valid1 || _valid0
      if (!valid1) {
        const _errs12 = errors
        if (typeof data3 === "string") {
          if (!pattern2.test(data3)) {
            const err14 = {
              instancePath: instancePath + "/name",
              schemaPath: "#/properties/name/anyOf/1/pattern",
              keyword: "pattern",
              params: { pattern: "^[ \\S+]+$" },
              message: 'must match pattern "' + "^[ \\S+]+$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err14]
            } else {
              vErrors.push(err14)
            }
            errors++
          }
        }
        var _valid0 = _errs12 === errors
        valid1 = valid1 || _valid0
      }
      if (!valid1) {
        const err15 = {
          instancePath: instancePath + "/name",
          schemaPath: "#/properties/name/anyOf",
          keyword: "anyOf",
          params: {},
          message: "must match a schema in anyOf",
        }
        if (vErrors === null) {
          vErrors = [err15]
        } else {
          vErrors.push(err15)
        }
        errors++
      } else {
        errors = _errs10
        if (vErrors !== null) {
          if (_errs10) {
            vErrors.length = _errs10
          } else {
            vErrors = null
          }
        }
      }
      if (typeof data3 === "string") {
        if (func2(data3) > 60) {
          const err16 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/maxLength",
            keyword: "maxLength",
            params: { limit: 60 },
            message: "must NOT have more than 60 characters",
          }
          if (vErrors === null) {
            vErrors = [err16]
          } else {
            vErrors.push(err16)
          }
          errors++
        }
        if (func2(data3) < 0) {
          const err17 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/minLength",
            keyword: "minLength",
            params: { limit: 0 },
            message: "must NOT have fewer than 0 characters",
          }
          if (vErrors === null) {
            vErrors = [err17]
          } else {
            vErrors.push(err17)
          }
          errors++
        }
      } else {
        const err18 = {
          instancePath: instancePath + "/name",
          schemaPath: "#/properties/name/type",
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
    }
    if (data.symbol !== undefined) {
      let data4 = data.symbol
      const _errs15 = errors
      let valid2 = false
      const _errs16 = errors
      if ("" !== data4) {
        const err19 = {
          instancePath: instancePath + "/symbol",
          schemaPath: "#/properties/symbol/anyOf/0/const",
          keyword: "const",
          params: { allowedValue: "" },
          message: "must be equal to constant",
        }
        if (vErrors === null) {
          vErrors = [err19]
        } else {
          vErrors.push(err19)
        }
        errors++
      }
      var _valid1 = _errs16 === errors
      valid2 = valid2 || _valid1
      if (!valid2) {
        const _errs17 = errors
        if (typeof data4 === "string") {
          if (!pattern3.test(data4)) {
            const err20 = {
              instancePath: instancePath + "/symbol",
              schemaPath: "#/properties/symbol/anyOf/1/pattern",
              keyword: "pattern",
              params: { pattern: "^\\S+$" },
              message: 'must match pattern "' + "^\\S+$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err20]
            } else {
              vErrors.push(err20)
            }
            errors++
          }
        }
        var _valid1 = _errs17 === errors
        valid2 = valid2 || _valid1
      }
      if (!valid2) {
        const err21 = {
          instancePath: instancePath + "/symbol",
          schemaPath: "#/properties/symbol/anyOf",
          keyword: "anyOf",
          params: {},
          message: "must match a schema in anyOf",
        }
        if (vErrors === null) {
          vErrors = [err21]
        } else {
          vErrors.push(err21)
        }
        errors++
      } else {
        errors = _errs15
        if (vErrors !== null) {
          if (_errs15) {
            vErrors.length = _errs15
          } else {
            vErrors = null
          }
        }
      }
      if (typeof data4 === "string") {
        if (func2(data4) > 20) {
          const err22 = {
            instancePath: instancePath + "/symbol",
            schemaPath: "#/properties/symbol/maxLength",
            keyword: "maxLength",
            params: { limit: 20 },
            message: "must NOT have more than 20 characters",
          }
          if (vErrors === null) {
            vErrors = [err22]
          } else {
            vErrors.push(err22)
          }
          errors++
        }
        if (func2(data4) < 0) {
          const err23 = {
            instancePath: instancePath + "/symbol",
            schemaPath: "#/properties/symbol/minLength",
            keyword: "minLength",
            params: { limit: 0 },
            message: "must NOT have fewer than 0 characters",
          }
          if (vErrors === null) {
            vErrors = [err23]
          } else {
            vErrors.push(err23)
          }
          errors++
        }
      } else {
        const err24 = {
          instancePath: instancePath + "/symbol",
          schemaPath: "#/properties/symbol/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err24]
        } else {
          vErrors.push(err24)
        }
        errors++
      }
    }
    if (data.logoURI !== undefined) {
      if (!(typeof data.logoURI === "string")) {
        const err25 = {
          instancePath: instancePath + "/logoURI",
          schemaPath: "#/properties/logoURI/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err25]
        } else {
          vErrors.push(err25)
        }
        errors++
      }
    }
    if (data.tags !== undefined) {
      let data6 = data.tags
      if (Array.isArray(data6)) {
        if (data6.length > 10) {
          const err26 = {
            instancePath: instancePath + "/tags",
            schemaPath: "#/properties/tags/maxItems",
            keyword: "maxItems",
            params: { limit: 10 },
            message: "must NOT have more than 10 items",
          }
          if (vErrors === null) {
            vErrors = [err26]
          } else {
            vErrors.push(err26)
          }
          errors++
        }
        const len0 = data6.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate26(data6[i0], {
              instancePath: instancePath + "/tags/" + i0,
              parentData: data6,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate26.errors
                : vErrors.concat(validate26.errors)
            errors = vErrors.length
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
        !validate28(data.extensions, {
          instancePath: instancePath + "/extensions",
          parentData: data,
          parentDataProperty: "extensions",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate28.errors
            : vErrors.concat(validate28.errors)
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
  validate25.errors = vErrors
  return errors === 0
}
const schema17 = {
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
const pattern7 = new RegExp("^[ \\w]+$", "u")
const pattern8 = new RegExp("^[ \\w\\.,:]+$", "u")
function validate47(
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
    if (data.description === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "description" },
        message: "must have required property '" + "description" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    for (const key0 in data) {
      if (!(key0 === "name" || key0 === "description")) {
        const err2 = {
          instancePath,
          schemaPath: "#/additionalProperties",
          keyword: "additionalProperties",
          params: { additionalProperty: key0 },
          message: "must NOT have additional properties",
        }
        if (vErrors === null) {
          vErrors = [err2]
        } else {
          vErrors.push(err2)
        }
        errors++
      }
    }
    if (data.name !== undefined) {
      let data0 = data.name
      if (typeof data0 === "string") {
        if (func2(data0) > 20) {
          const err3 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/maxLength",
            keyword: "maxLength",
            params: { limit: 20 },
            message: "must NOT have more than 20 characters",
          }
          if (vErrors === null) {
            vErrors = [err3]
          } else {
            vErrors.push(err3)
          }
          errors++
        }
        if (func2(data0) < 1) {
          const err4 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/minLength",
            keyword: "minLength",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 characters",
          }
          if (vErrors === null) {
            vErrors = [err4]
          } else {
            vErrors.push(err4)
          }
          errors++
        }
        if (!pattern7.test(data0)) {
          const err5 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/pattern",
            keyword: "pattern",
            params: { pattern: "^[ \\w]+$" },
            message: 'must match pattern "' + "^[ \\w]+$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
      } else {
        const err6 = {
          instancePath: instancePath + "/name",
          schemaPath: "#/properties/name/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err6]
        } else {
          vErrors.push(err6)
        }
        errors++
      }
    }
    if (data.description !== undefined) {
      let data1 = data.description
      if (typeof data1 === "string") {
        if (func2(data1) > 200) {
          const err7 = {
            instancePath: instancePath + "/description",
            schemaPath: "#/properties/description/maxLength",
            keyword: "maxLength",
            params: { limit: 200 },
            message: "must NOT have more than 200 characters",
          }
          if (vErrors === null) {
            vErrors = [err7]
          } else {
            vErrors.push(err7)
          }
          errors++
        }
        if (func2(data1) < 1) {
          const err8 = {
            instancePath: instancePath + "/description",
            schemaPath: "#/properties/description/minLength",
            keyword: "minLength",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 characters",
          }
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
        if (!pattern8.test(data1)) {
          const err9 = {
            instancePath: instancePath + "/description",
            schemaPath: "#/properties/description/pattern",
            keyword: "pattern",
            params: { pattern: "^[ \\w\\.,:]+$" },
            message: 'must match pattern "' + "^[ \\w\\.,:]+$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err9]
          } else {
            vErrors.push(err9)
          }
          errors++
        }
      } else {
        const err10 = {
          instancePath: instancePath + "/description",
          schemaPath: "#/properties/description/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err10]
        } else {
          vErrors.push(err10)
        }
        errors++
      }
    }
  } else {
    const err11 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err11]
    } else {
      vErrors.push(err11)
    }
    errors++
  }
  validate47.errors = vErrors
  return errors === 0
}
function validate22(
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
    if (data.name !== undefined) {
      let data0 = data.name
      if (typeof data0 === "string") {
        if (func2(data0) > 30) {
          const err4 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/maxLength",
            keyword: "maxLength",
            params: { limit: 30 },
            message: "must NOT have more than 30 characters",
          }
          if (vErrors === null) {
            vErrors = [err4]
          } else {
            vErrors.push(err4)
          }
          errors++
        }
        if (func2(data0) < 1) {
          const err5 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/minLength",
            keyword: "minLength",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 characters",
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
        if (!pattern0.test(data0)) {
          const err6 = {
            instancePath: instancePath + "/name",
            schemaPath: "#/properties/name/pattern",
            keyword: "pattern",
            params: { pattern: "^[\\w ]+$" },
            message: 'must match pattern "' + "^[\\w ]+$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err6]
          } else {
            vErrors.push(err6)
          }
          errors++
        }
      } else {
        const err7 = {
          instancePath: instancePath + "/name",
          schemaPath: "#/properties/name/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
    }
    if (data.timestamp !== undefined) {
      if (!(typeof data.timestamp === "string")) {
        const err8 = {
          instancePath: instancePath + "/timestamp",
          schemaPath: "#/properties/timestamp/type",
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
    if (data.version !== undefined) {
      if (
        !validate23(data.version, {
          instancePath: instancePath + "/version",
          parentData: data,
          parentDataProperty: "version",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate23.errors
            : vErrors.concat(validate23.errors)
        errors = vErrors.length
      }
    }
    if (data.tokens !== undefined) {
      let data3 = data.tokens
      if (Array.isArray(data3)) {
        if (data3.length > 10000) {
          const err9 = {
            instancePath: instancePath + "/tokens",
            schemaPath: "#/properties/tokens/maxItems",
            keyword: "maxItems",
            params: { limit: 10000 },
            message: "must NOT have more than 10000 items",
          }
          if (vErrors === null) {
            vErrors = [err9]
          } else {
            vErrors.push(err9)
          }
          errors++
        }
        if (data3.length < 1) {
          const err10 = {
            instancePath: instancePath + "/tokens",
            schemaPath: "#/properties/tokens/minItems",
            keyword: "minItems",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 items",
          }
          if (vErrors === null) {
            vErrors = [err10]
          } else {
            vErrors.push(err10)
          }
          errors++
        }
        const len0 = data3.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate25(data3[i0], {
              instancePath: instancePath + "/tokens/" + i0,
              parentData: data3,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate25.errors
                : vErrors.concat(validate25.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err11 = {
          instancePath: instancePath + "/tokens",
          schemaPath: "#/properties/tokens/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err11]
        } else {
          vErrors.push(err11)
        }
        errors++
      }
    }
    if (data.tokenMap !== undefined) {
      let data5 = data.tokenMap
      if (data5 && typeof data5 == "object" && !Array.isArray(data5)) {
        if (Object.keys(data5).length > 10000) {
          const err12 = {
            instancePath: instancePath + "/tokenMap",
            schemaPath: "#/properties/tokenMap/maxProperties",
            keyword: "maxProperties",
            params: { limit: 10000 },
            message: "must NOT have more than 10000 properties",
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
        }
        if (Object.keys(data5).length < 1) {
          const err13 = {
            instancePath: instancePath + "/tokenMap",
            schemaPath: "#/properties/tokenMap/minProperties",
            keyword: "minProperties",
            params: { limit: 1 },
            message: "must NOT have fewer than 1 properties",
          }
          if (vErrors === null) {
            vErrors = [err13]
          } else {
            vErrors.push(err13)
          }
          errors++
        }
        for (const key0 in data5) {
          const _errs11 = errors
          if (typeof key0 !== "string") {
            const err14 = {
              instancePath: instancePath + "/tokenMap",
              schemaPath: "#/properties/tokenMap/propertyNames/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
              propertyName: key0,
            }
            if (vErrors === null) {
              vErrors = [err14]
            } else {
              vErrors.push(err14)
            }
            errors++
          }
          var valid3 = _errs11 === errors
          if (!valid3) {
            const err15 = {
              instancePath: instancePath + "/tokenMap",
              schemaPath: "#/properties/tokenMap/propertyNames",
              keyword: "propertyNames",
              params: { propertyName: key0 },
              message: "property name must be valid",
            }
            if (vErrors === null) {
              vErrors = [err15]
            } else {
              vErrors.push(err15)
            }
            errors++
          }
        }
        for (const key1 in data5) {
          if (
            !validate25(data5[key1], {
              instancePath:
                instancePath +
                "/tokenMap/" +
                key1.replace(/~/g, "~0").replace(/\//g, "~1"),
              parentData: data5,
              parentDataProperty: key1,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate25.errors
                : vErrors.concat(validate25.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err16 = {
          instancePath: instancePath + "/tokenMap",
          schemaPath: "#/properties/tokenMap/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err16]
        } else {
          vErrors.push(err16)
        }
        errors++
      }
    }
    if (data.keywords !== undefined) {
      let data7 = data.keywords
      if (Array.isArray(data7)) {
        if (data7.length > 20) {
          const err17 = {
            instancePath: instancePath + "/keywords",
            schemaPath: "#/properties/keywords/maxItems",
            keyword: "maxItems",
            params: { limit: 20 },
            message: "must NOT have more than 20 items",
          }
          if (vErrors === null) {
            vErrors = [err17]
          } else {
            vErrors.push(err17)
          }
          errors++
        }
        const len1 = data7.length
        for (let i1 = 0; i1 < len1; i1++) {
          let data8 = data7[i1]
          if (typeof data8 === "string") {
            if (func2(data8) > 20) {
              const err18 = {
                instancePath: instancePath + "/keywords/" + i1,
                schemaPath: "#/properties/keywords/items/maxLength",
                keyword: "maxLength",
                params: { limit: 20 },
                message: "must NOT have more than 20 characters",
              }
              if (vErrors === null) {
                vErrors = [err18]
              } else {
                vErrors.push(err18)
              }
              errors++
            }
            if (func2(data8) < 1) {
              const err19 = {
                instancePath: instancePath + "/keywords/" + i1,
                schemaPath: "#/properties/keywords/items/minLength",
                keyword: "minLength",
                params: { limit: 1 },
                message: "must NOT have fewer than 1 characters",
              }
              if (vErrors === null) {
                vErrors = [err19]
              } else {
                vErrors.push(err19)
              }
              errors++
            }
            if (!pattern0.test(data8)) {
              const err20 = {
                instancePath: instancePath + "/keywords/" + i1,
                schemaPath: "#/properties/keywords/items/pattern",
                keyword: "pattern",
                params: { pattern: "^[\\w ]+$" },
                message: 'must match pattern "' + "^[\\w ]+$" + '"',
              }
              if (vErrors === null) {
                vErrors = [err20]
              } else {
                vErrors.push(err20)
              }
              errors++
            }
          } else {
            const err21 = {
              instancePath: instancePath + "/keywords/" + i1,
              schemaPath: "#/properties/keywords/items/type",
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
        let i2 = data7.length
        let j0
        if (i2 > 1) {
          const indices0 = {}
          for (; i2--;) {
            let item0 = data7[i2]
            if (typeof item0 !== "string") {
              continue
            }
            if (typeof indices0[item0] == "number") {
              j0 = indices0[item0]
              const err22 = {
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
                vErrors = [err22]
              } else {
                vErrors.push(err22)
              }
              errors++
              break
            }
            indices0[item0] = i2
          }
        }
      } else {
        const err23 = {
          instancePath: instancePath + "/keywords",
          schemaPath: "#/properties/keywords/type",
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
    if (data.tags !== undefined) {
      let data9 = data.tags
      if (data9 && typeof data9 == "object" && !Array.isArray(data9)) {
        if (Object.keys(data9).length > 20) {
          const err24 = {
            instancePath: instancePath + "/tags",
            schemaPath: "#/properties/tags/maxProperties",
            keyword: "maxProperties",
            params: { limit: 20 },
            message: "must NOT have more than 20 properties",
          }
          if (vErrors === null) {
            vErrors = [err24]
          } else {
            vErrors.push(err24)
          }
          errors++
        }
        for (const key2 in data9) {
          const _errs21 = errors
          if (
            !validate26(key2, {
              instancePath: instancePath + "/tags",
              parentData: data9,
              parentDataProperty: "tags",
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate26.errors
                : vErrors.concat(validate26.errors)
            errors = vErrors.length
          }
          var valid8 = _errs21 === errors
          if (!valid8) {
            const err25 = {
              instancePath: instancePath + "/tags",
              schemaPath: "#/properties/tags/propertyNames",
              keyword: "propertyNames",
              params: { propertyName: key2 },
              message: "property name must be valid",
            }
            if (vErrors === null) {
              vErrors = [err25]
            } else {
              vErrors.push(err25)
            }
            errors++
          }
        }
        for (const key3 in data9) {
          if (
            !validate47(data9[key3], {
              instancePath:
                instancePath +
                "/tags/" +
                key3.replace(/~/g, "~0").replace(/\//g, "~1"),
              parentData: data9,
              parentDataProperty: key3,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate47.errors
                : vErrors.concat(validate47.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err26 = {
          instancePath: instancePath + "/tags",
          schemaPath: "#/properties/tags/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object",
        }
        if (vErrors === null) {
          vErrors = [err26]
        } else {
          vErrors.push(err26)
        }
        errors++
      }
    }
    if (data.logoURI !== undefined) {
      if (!(typeof data.logoURI === "string")) {
        const err27 = {
          instancePath: instancePath + "/logoURI",
          schemaPath: "#/properties/logoURI/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err27]
        } else {
          vErrors.push(err27)
        }
        errors++
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
  validate22.errors = vErrors
  return errors === 0
}
exports.isValid0xSwapPriceResponse = validate49
const schema18 = {
  anyOf: [
    {
      anyOf: [
        {
          type: "object",
          properties: {
            allowanceTarget: {
              type: ["string", "null"],
              pattern: "^0x[a-fA-F0-9]{40}$",
            },
            blockNumber: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            buyAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            buyToken: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            fees: { $ref: "0x-swap#/definitions/shared0" },
            issues: { $ref: "0x-swap#/definitions/shared4" },
            liquidityAvailable: { type: "boolean", enum: [true] },
            minBuyAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            mode: { type: "string", enum: ["exact-in"] },
            route: { $ref: "0x-swap#/definitions/shared7" },
            sellAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            sellToken: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            tokenMetadata: { $ref: "0x-swap#/definitions/shared10" },
            totalNetworkFee: {
              type: ["string", "null"],
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            zid: { type: "string" },
            gas: {
              type: ["string", "null"],
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            gasPrice: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
          },
          required: [
            "allowanceTarget",
            "blockNumber",
            "buyAmount",
            "buyToken",
            "fees",
            "issues",
            "liquidityAvailable",
            "minBuyAmount",
            "mode",
            "route",
            "sellAmount",
            "sellToken",
            "tokenMetadata",
            "totalNetworkFee",
            "zid",
            "gas",
            "gasPrice",
          ],
        },
        {
          type: "object",
          properties: {
            allowanceTarget: {
              type: ["string", "null"],
              pattern: "^0x[a-fA-F0-9]{40}$",
            },
            blockNumber: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            buyAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            buyToken: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            estimatedNetSellAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            fees: { $ref: "0x-swap#/definitions/shared12" },
            issues: { $ref: "0x-swap#/definitions/shared4" },
            liquidityAvailable: { type: "boolean", enum: [true] },
            mode: { type: "string", enum: ["exact-out"] },
            routes: { $ref: "0x-swap#/definitions/shared13" },
            maxSellAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            sellToken: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            tokenMetadata: { $ref: "0x-swap#/definitions/shared10" },
            totalNetworkFee: {
              type: ["string", "null"],
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            zid: { type: "string" },
            gas: {
              type: ["string", "null"],
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            gasPrice: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
          },
          required: [
            "allowanceTarget",
            "blockNumber",
            "buyAmount",
            "buyToken",
            "estimatedNetSellAmount",
            "fees",
            "issues",
            "liquidityAvailable",
            "mode",
            "routes",
            "maxSellAmount",
            "sellToken",
            "tokenMetadata",
            "totalNetworkFee",
            "zid",
            "gas",
            "gasPrice",
          ],
        },
      ],
    },
    { $ref: "0x-swap#/definitions/shared14" },
  ],
}
const pattern10 = new RegExp("^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$", "u")
const schema20 = {
  type: "object",
  properties: {
    integratorFee: { $ref: "0x-swap#/definitions/shared1" },
    integratorFees: {
      type: ["array", "null"],
      items: { $ref: "0x-swap#/definitions/shared2" },
    },
    zeroExFee: { $ref: "0x-swap#/definitions/shared1" },
    gasFee: { $ref: "0x-swap#/definitions/shared3" },
  },
  required: ["integratorFee", "integratorFees", "zeroExFee", "gasFee"],
}
const schema21 = {
  type: ["object", "null"],
  properties: {
    amount: { type: "string", pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
    token: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    type: { type: "string", enum: ["volume"] },
  },
  required: ["amount", "token", "type"],
}
function validate52(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (
    !(data && typeof data == "object" && !Array.isArray(data)) &&
    data !== null
  ) {
    const err0 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: schema21.type },
      message: "must be object,null",
    }
    if (vErrors === null) {
      vErrors = [err0]
    } else {
      vErrors.push(err0)
    }
    errors++
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.amount === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "amount" },
        message: "must have required property '" + "amount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.token === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "token" },
        message: "must have required property '" + "token" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.type === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "type" },
        message: "must have required property '" + "type" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.amount !== undefined) {
      let data0 = data.amount
      if (typeof data0 === "string") {
        if (!pattern10.test(data0)) {
          const err4 = {
            instancePath: instancePath + "/amount",
            schemaPath: "#/properties/amount/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err4]
          } else {
            vErrors.push(err4)
          }
          errors++
        }
      } else {
        const err5 = {
          instancePath: instancePath + "/amount",
          schemaPath: "#/properties/amount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    if (data.token !== undefined) {
      let data1 = data.token
      if (typeof data1 === "string") {
        if (!pattern1.test(data1)) {
          const err6 = {
            instancePath: instancePath + "/token",
            schemaPath: "#/properties/token/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err6]
          } else {
            vErrors.push(err6)
          }
          errors++
        }
      } else {
        const err7 = {
          instancePath: instancePath + "/token",
          schemaPath: "#/properties/token/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
    }
    if (data.type !== undefined) {
      let data2 = data.type
      if (typeof data2 !== "string") {
        const err8 = {
          instancePath: instancePath + "/type",
          schemaPath: "#/properties/type/type",
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
      if (!(data2 === "volume")) {
        const err9 = {
          instancePath: instancePath + "/type",
          schemaPath: "#/properties/type/enum",
          keyword: "enum",
          params: { allowedValues: schema21.properties.type.enum },
          message: "must be equal to one of the allowed values",
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
      }
    }
  }
  validate52.errors = vErrors
  return errors === 0
}
const schema22 = {
  type: "object",
  properties: {
    amount: { type: "string", pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
    token: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    type: { type: "string", enum: ["volume"] },
  },
  required: ["amount", "token", "type"],
}
function validate54(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.amount === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "amount" },
        message: "must have required property '" + "amount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.token === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "token" },
        message: "must have required property '" + "token" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.type === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "type" },
        message: "must have required property '" + "type" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.amount !== undefined) {
      let data0 = data.amount
      if (typeof data0 === "string") {
        if (!pattern10.test(data0)) {
          const err3 = {
            instancePath: instancePath + "/amount",
            schemaPath: "#/properties/amount/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
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
          instancePath: instancePath + "/amount",
          schemaPath: "#/properties/amount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
    }
    if (data.token !== undefined) {
      let data1 = data.token
      if (typeof data1 === "string") {
        if (!pattern1.test(data1)) {
          const err5 = {
            instancePath: instancePath + "/token",
            schemaPath: "#/properties/token/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
      } else {
        const err6 = {
          instancePath: instancePath + "/token",
          schemaPath: "#/properties/token/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err6]
        } else {
          vErrors.push(err6)
        }
        errors++
      }
    }
    if (data.type !== undefined) {
      let data2 = data.type
      if (typeof data2 !== "string") {
        const err7 = {
          instancePath: instancePath + "/type",
          schemaPath: "#/properties/type/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
      if (!(data2 === "volume")) {
        const err8 = {
          instancePath: instancePath + "/type",
          schemaPath: "#/properties/type/enum",
          keyword: "enum",
          params: { allowedValues: schema22.properties.type.enum },
          message: "must be equal to one of the allowed values",
        }
        if (vErrors === null) {
          vErrors = [err8]
        } else {
          vErrors.push(err8)
        }
        errors++
      }
    }
  } else {
    const err9 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err9]
    } else {
      vErrors.push(err9)
    }
    errors++
  }
  validate54.errors = vErrors
  return errors === 0
}
const schema23 = {
  type: ["object", "null"],
  properties: {
    amount: { type: "string", pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
    token: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    type: { type: "string", enum: ["gas"] },
  },
  required: ["amount", "token", "type"],
}
function validate57(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (
    !(data && typeof data == "object" && !Array.isArray(data)) &&
    data !== null
  ) {
    const err0 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: schema23.type },
      message: "must be object,null",
    }
    if (vErrors === null) {
      vErrors = [err0]
    } else {
      vErrors.push(err0)
    }
    errors++
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.amount === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "amount" },
        message: "must have required property '" + "amount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.token === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "token" },
        message: "must have required property '" + "token" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.type === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "type" },
        message: "must have required property '" + "type" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.amount !== undefined) {
      let data0 = data.amount
      if (typeof data0 === "string") {
        if (!pattern10.test(data0)) {
          const err4 = {
            instancePath: instancePath + "/amount",
            schemaPath: "#/properties/amount/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err4]
          } else {
            vErrors.push(err4)
          }
          errors++
        }
      } else {
        const err5 = {
          instancePath: instancePath + "/amount",
          schemaPath: "#/properties/amount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    if (data.token !== undefined) {
      let data1 = data.token
      if (typeof data1 === "string") {
        if (!pattern1.test(data1)) {
          const err6 = {
            instancePath: instancePath + "/token",
            schemaPath: "#/properties/token/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err6]
          } else {
            vErrors.push(err6)
          }
          errors++
        }
      } else {
        const err7 = {
          instancePath: instancePath + "/token",
          schemaPath: "#/properties/token/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
    }
    if (data.type !== undefined) {
      let data2 = data.type
      if (typeof data2 !== "string") {
        const err8 = {
          instancePath: instancePath + "/type",
          schemaPath: "#/properties/type/type",
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
      if (!(data2 === "gas")) {
        const err9 = {
          instancePath: instancePath + "/type",
          schemaPath: "#/properties/type/enum",
          keyword: "enum",
          params: { allowedValues: schema23.properties.type.enum },
          message: "must be equal to one of the allowed values",
        }
        if (vErrors === null) {
          vErrors = [err9]
        } else {
          vErrors.push(err9)
        }
        errors++
      }
    }
  }
  validate57.errors = vErrors
  return errors === 0
}
function validate51(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.integratorFee === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "integratorFee" },
        message: "must have required property '" + "integratorFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.integratorFees === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "integratorFees" },
        message: "must have required property '" + "integratorFees" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.zeroExFee === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "zeroExFee" },
        message: "must have required property '" + "zeroExFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.gasFee === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "gasFee" },
        message: "must have required property '" + "gasFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.integratorFee !== undefined) {
      if (
        !validate52(data.integratorFee, {
          instancePath: instancePath + "/integratorFee",
          parentData: data,
          parentDataProperty: "integratorFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
      }
    }
    if (data.integratorFees !== undefined) {
      let data1 = data.integratorFees
      if (!Array.isArray(data1) && data1 !== null) {
        const err4 = {
          instancePath: instancePath + "/integratorFees",
          schemaPath: "#/properties/integratorFees/type",
          keyword: "type",
          params: { type: schema20.properties.integratorFees.type },
          message: "must be array,null",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
      if (Array.isArray(data1)) {
        const len0 = data1.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate54(data1[i0], {
              instancePath: instancePath + "/integratorFees/" + i0,
              parentData: data1,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate54.errors
                : vErrors.concat(validate54.errors)
            errors = vErrors.length
          }
        }
      }
    }
    if (data.zeroExFee !== undefined) {
      if (
        !validate52(data.zeroExFee, {
          instancePath: instancePath + "/zeroExFee",
          parentData: data,
          parentDataProperty: "zeroExFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
      }
    }
    if (data.gasFee !== undefined) {
      if (
        !validate57(data.gasFee, {
          instancePath: instancePath + "/gasFee",
          parentData: data,
          parentDataProperty: "gasFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate57.errors
            : vErrors.concat(validate57.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err5 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err5]
    } else {
      vErrors.push(err5)
    }
    errors++
  }
  validate51.errors = vErrors
  return errors === 0
}
const schema24 = {
  type: "object",
  properties: {
    allowance: { $ref: "0x-swap#/definitions/shared5" },
    balance: { $ref: "0x-swap#/definitions/shared6" },
    simulationIncomplete: { type: "boolean" },
    invalidSourcesPassed: { type: "array", items: { type: "string" } },
  },
  required: [
    "allowance",
    "balance",
    "simulationIncomplete",
    "invalidSourcesPassed",
  ],
}
const schema25 = {
  type: ["object", "null"],
  properties: {
    actual: { type: "string", pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
    spender: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
  },
  required: ["actual", "spender"],
}
function validate61(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (
    !(data && typeof data == "object" && !Array.isArray(data)) &&
    data !== null
  ) {
    const err0 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: schema25.type },
      message: "must be object,null",
    }
    if (vErrors === null) {
      vErrors = [err0]
    } else {
      vErrors.push(err0)
    }
    errors++
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.actual === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "actual" },
        message: "must have required property '" + "actual" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.spender === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "spender" },
        message: "must have required property '" + "spender" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.actual !== undefined) {
      let data0 = data.actual
      if (typeof data0 === "string") {
        if (!pattern10.test(data0)) {
          const err3 = {
            instancePath: instancePath + "/actual",
            schemaPath: "#/properties/actual/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
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
          instancePath: instancePath + "/actual",
          schemaPath: "#/properties/actual/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
    }
    if (data.spender !== undefined) {
      let data1 = data.spender
      if (typeof data1 === "string") {
        if (!pattern1.test(data1)) {
          const err5 = {
            instancePath: instancePath + "/spender",
            schemaPath: "#/properties/spender/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
      } else {
        const err6 = {
          instancePath: instancePath + "/spender",
          schemaPath: "#/properties/spender/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err6]
        } else {
          vErrors.push(err6)
        }
        errors++
      }
    }
  }
  validate61.errors = vErrors
  return errors === 0
}
const schema26 = {
  type: ["object", "null"],
  properties: {
    token: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    actual: { type: "string", pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
    expected: { type: "string", pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
  },
  required: ["token", "actual", "expected"],
}
function validate63(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (
    !(data && typeof data == "object" && !Array.isArray(data)) &&
    data !== null
  ) {
    const err0 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: schema26.type },
      message: "must be object,null",
    }
    if (vErrors === null) {
      vErrors = [err0]
    } else {
      vErrors.push(err0)
    }
    errors++
  }
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.token === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "token" },
        message: "must have required property '" + "token" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.actual === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "actual" },
        message: "must have required property '" + "actual" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.expected === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "expected" },
        message: "must have required property '" + "expected" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.token !== undefined) {
      let data0 = data.token
      if (typeof data0 === "string") {
        if (!pattern1.test(data0)) {
          const err4 = {
            instancePath: instancePath + "/token",
            schemaPath: "#/properties/token/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err4]
          } else {
            vErrors.push(err4)
          }
          errors++
        }
      } else {
        const err5 = {
          instancePath: instancePath + "/token",
          schemaPath: "#/properties/token/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    if (data.actual !== undefined) {
      let data1 = data.actual
      if (typeof data1 === "string") {
        if (!pattern10.test(data1)) {
          const err6 = {
            instancePath: instancePath + "/actual",
            schemaPath: "#/properties/actual/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err6]
          } else {
            vErrors.push(err6)
          }
          errors++
        }
      } else {
        const err7 = {
          instancePath: instancePath + "/actual",
          schemaPath: "#/properties/actual/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
    }
    if (data.expected !== undefined) {
      let data2 = data.expected
      if (typeof data2 === "string") {
        if (!pattern10.test(data2)) {
          const err8 = {
            instancePath: instancePath + "/expected",
            schemaPath: "#/properties/expected/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
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
          instancePath: instancePath + "/expected",
          schemaPath: "#/properties/expected/type",
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
  }
  validate63.errors = vErrors
  return errors === 0
}
function validate60(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.allowance === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "allowance" },
        message: "must have required property '" + "allowance" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.balance === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "balance" },
        message: "must have required property '" + "balance" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.simulationIncomplete === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "simulationIncomplete" },
        message: "must have required property '" + "simulationIncomplete" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.invalidSourcesPassed === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "invalidSourcesPassed" },
        message: "must have required property '" + "invalidSourcesPassed" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.allowance !== undefined) {
      if (
        !validate61(data.allowance, {
          instancePath: instancePath + "/allowance",
          parentData: data,
          parentDataProperty: "allowance",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate61.errors
            : vErrors.concat(validate61.errors)
        errors = vErrors.length
      }
    }
    if (data.balance !== undefined) {
      if (
        !validate63(data.balance, {
          instancePath: instancePath + "/balance",
          parentData: data,
          parentDataProperty: "balance",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate63.errors
            : vErrors.concat(validate63.errors)
        errors = vErrors.length
      }
    }
    if (data.simulationIncomplete !== undefined) {
      if (typeof data.simulationIncomplete !== "boolean") {
        const err4 = {
          instancePath: instancePath + "/simulationIncomplete",
          schemaPath: "#/properties/simulationIncomplete/type",
          keyword: "type",
          params: { type: "boolean" },
          message: "must be boolean",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
    }
    if (data.invalidSourcesPassed !== undefined) {
      let data3 = data.invalidSourcesPassed
      if (Array.isArray(data3)) {
        const len0 = data3.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data3[i0] !== "string") {
            const err5 = {
              instancePath: instancePath + "/invalidSourcesPassed/" + i0,
              schemaPath: "#/properties/invalidSourcesPassed/items/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            }
            if (vErrors === null) {
              vErrors = [err5]
            } else {
              vErrors.push(err5)
            }
            errors++
          }
        }
      } else {
        const err6 = {
          instancePath: instancePath + "/invalidSourcesPassed",
          schemaPath: "#/properties/invalidSourcesPassed/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err6]
        } else {
          vErrors.push(err6)
        }
        errors++
      }
    }
  } else {
    const err7 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err7]
    } else {
      vErrors.push(err7)
    }
    errors++
  }
  validate60.errors = vErrors
  return errors === 0
}
const schema27 = {
  type: "object",
  properties: {
    fills: { type: "array", items: { $ref: "0x-swap#/definitions/shared8" } },
    tokens: { type: "array", items: { $ref: "0x-swap#/definitions/shared9" } },
  },
  required: ["fills", "tokens"],
}
const schema28 = {
  type: "object",
  properties: {
    from: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    to: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    source: { type: "string" },
    proportionBps: {
      type: "string",
      pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
    },
  },
  required: ["from", "to", "source", "proportionBps"],
}
function validate67(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.from === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "from" },
        message: "must have required property '" + "from" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.to === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "to" },
        message: "must have required property '" + "to" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.source === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "source" },
        message: "must have required property '" + "source" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.proportionBps === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "proportionBps" },
        message: "must have required property '" + "proportionBps" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.from !== undefined) {
      let data0 = data.from
      if (typeof data0 === "string") {
        if (!pattern1.test(data0)) {
          const err4 = {
            instancePath: instancePath + "/from",
            schemaPath: "#/properties/from/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err4]
          } else {
            vErrors.push(err4)
          }
          errors++
        }
      } else {
        const err5 = {
          instancePath: instancePath + "/from",
          schemaPath: "#/properties/from/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
    }
    if (data.to !== undefined) {
      let data1 = data.to
      if (typeof data1 === "string") {
        if (!pattern1.test(data1)) {
          const err6 = {
            instancePath: instancePath + "/to",
            schemaPath: "#/properties/to/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err6]
          } else {
            vErrors.push(err6)
          }
          errors++
        }
      } else {
        const err7 = {
          instancePath: instancePath + "/to",
          schemaPath: "#/properties/to/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
    }
    if (data.source !== undefined) {
      if (typeof data.source !== "string") {
        const err8 = {
          instancePath: instancePath + "/source",
          schemaPath: "#/properties/source/type",
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
    if (data.proportionBps !== undefined) {
      let data3 = data.proportionBps
      if (typeof data3 === "string") {
        if (!pattern10.test(data3)) {
          const err9 = {
            instancePath: instancePath + "/proportionBps",
            schemaPath: "#/properties/proportionBps/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err9]
          } else {
            vErrors.push(err9)
          }
          errors++
        }
      } else {
        const err10 = {
          instancePath: instancePath + "/proportionBps",
          schemaPath: "#/properties/proportionBps/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err10]
        } else {
          vErrors.push(err10)
        }
        errors++
      }
    }
  } else {
    const err11 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err11]
    } else {
      vErrors.push(err11)
    }
    errors++
  }
  validate67.errors = vErrors
  return errors === 0
}
const schema29 = {
  type: "object",
  properties: {
    address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    symbol: { type: "string" },
  },
  required: ["address", "symbol"],
}
function validate69(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.address === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "address" },
        message: "must have required property '" + "address" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.symbol === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "symbol" },
        message: "must have required property '" + "symbol" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.address !== undefined) {
      let data0 = data.address
      if (typeof data0 === "string") {
        if (!pattern1.test(data0)) {
          const err2 = {
            instancePath: instancePath + "/address",
            schemaPath: "#/properties/address/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err2]
          } else {
            vErrors.push(err2)
          }
          errors++
        }
      } else {
        const err3 = {
          instancePath: instancePath + "/address",
          schemaPath: "#/properties/address/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
      }
    }
    if (data.symbol !== undefined) {
      if (typeof data.symbol !== "string") {
        const err4 = {
          instancePath: instancePath + "/symbol",
          schemaPath: "#/properties/symbol/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
    }
  } else {
    const err5 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err5]
    } else {
      vErrors.push(err5)
    }
    errors++
  }
  validate69.errors = vErrors
  return errors === 0
}
function validate66(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.fills === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "fills" },
        message: "must have required property '" + "fills" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.tokens === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "tokens" },
        message: "must have required property '" + "tokens" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.fills !== undefined) {
      let data0 = data.fills
      if (Array.isArray(data0)) {
        const len0 = data0.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate67(data0[i0], {
              instancePath: instancePath + "/fills/" + i0,
              parentData: data0,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate67.errors
                : vErrors.concat(validate67.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err2 = {
          instancePath: instancePath + "/fills",
          schemaPath: "#/properties/fills/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err2]
        } else {
          vErrors.push(err2)
        }
        errors++
      }
    }
    if (data.tokens !== undefined) {
      let data2 = data.tokens
      if (Array.isArray(data2)) {
        const len1 = data2.length
        for (let i1 = 0; i1 < len1; i1++) {
          if (
            !validate69(data2[i1], {
              instancePath: instancePath + "/tokens/" + i1,
              parentData: data2,
              parentDataProperty: i1,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate69.errors
                : vErrors.concat(validate69.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err3 = {
          instancePath: instancePath + "/tokens",
          schemaPath: "#/properties/tokens/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
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
  validate66.errors = vErrors
  return errors === 0
}
const schema30 = {
  type: "object",
  properties: {
    buyToken: { $ref: "0x-swap#/definitions/shared11" },
    sellToken: { $ref: "0x-swap#/definitions/shared11" },
  },
  required: ["buyToken", "sellToken"],
}
const schema31 = {
  type: "object",
  properties: {
    buyTaxBps: {
      type: ["string", "null"],
      pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
    },
    sellTaxBps: {
      type: ["string", "null"],
      pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
    },
    transferTaxBps: {
      type: ["string", "null"],
      pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
    },
  },
  required: ["buyTaxBps", "sellTaxBps", "transferTaxBps"],
}
function validate73(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.buyTaxBps === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "buyTaxBps" },
        message: "must have required property '" + "buyTaxBps" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.sellTaxBps === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "sellTaxBps" },
        message: "must have required property '" + "sellTaxBps" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.transferTaxBps === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "transferTaxBps" },
        message: "must have required property '" + "transferTaxBps" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.buyTaxBps !== undefined) {
      let data0 = data.buyTaxBps
      if (typeof data0 !== "string" && data0 !== null) {
        const err3 = {
          instancePath: instancePath + "/buyTaxBps",
          schemaPath: "#/properties/buyTaxBps/type",
          keyword: "type",
          params: { type: schema31.properties.buyTaxBps.type },
          message: "must be string,null",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
      }
      if (typeof data0 === "string") {
        if (!pattern10.test(data0)) {
          const err4 = {
            instancePath: instancePath + "/buyTaxBps",
            schemaPath: "#/properties/buyTaxBps/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err4]
          } else {
            vErrors.push(err4)
          }
          errors++
        }
      }
    }
    if (data.sellTaxBps !== undefined) {
      let data1 = data.sellTaxBps
      if (typeof data1 !== "string" && data1 !== null) {
        const err5 = {
          instancePath: instancePath + "/sellTaxBps",
          schemaPath: "#/properties/sellTaxBps/type",
          keyword: "type",
          params: { type: schema31.properties.sellTaxBps.type },
          message: "must be string,null",
        }
        if (vErrors === null) {
          vErrors = [err5]
        } else {
          vErrors.push(err5)
        }
        errors++
      }
      if (typeof data1 === "string") {
        if (!pattern10.test(data1)) {
          const err6 = {
            instancePath: instancePath + "/sellTaxBps",
            schemaPath: "#/properties/sellTaxBps/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err6]
          } else {
            vErrors.push(err6)
          }
          errors++
        }
      }
    }
    if (data.transferTaxBps !== undefined) {
      let data2 = data.transferTaxBps
      if (typeof data2 !== "string" && data2 !== null) {
        const err7 = {
          instancePath: instancePath + "/transferTaxBps",
          schemaPath: "#/properties/transferTaxBps/type",
          keyword: "type",
          params: { type: schema31.properties.transferTaxBps.type },
          message: "must be string,null",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
      if (typeof data2 === "string") {
        if (!pattern10.test(data2)) {
          const err8 = {
            instancePath: instancePath + "/transferTaxBps",
            schemaPath: "#/properties/transferTaxBps/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err8]
          } else {
            vErrors.push(err8)
          }
          errors++
        }
      }
    }
  } else {
    const err9 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err9]
    } else {
      vErrors.push(err9)
    }
    errors++
  }
  validate73.errors = vErrors
  return errors === 0
}
function validate72(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.buyToken === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "buyToken" },
        message: "must have required property '" + "buyToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.sellToken === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "sellToken" },
        message: "must have required property '" + "sellToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.buyToken !== undefined) {
      if (
        !validate73(data.buyToken, {
          instancePath: instancePath + "/buyToken",
          parentData: data,
          parentDataProperty: "buyToken",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate73.errors
            : vErrors.concat(validate73.errors)
        errors = vErrors.length
      }
    }
    if (data.sellToken !== undefined) {
      if (
        !validate73(data.sellToken, {
          instancePath: instancePath + "/sellToken",
          parentData: data,
          parentDataProperty: "sellToken",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate73.errors
            : vErrors.concat(validate73.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err2 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err2]
    } else {
      vErrors.push(err2)
    }
    errors++
  }
  validate72.errors = vErrors
  return errors === 0
}
const schema32 = {
  type: "object",
  properties: {
    integratorFee: { $ref: "0x-swap#/definitions/shared1" },
    integratorFees: {
      type: ["array", "null"],
      items: { $ref: "0x-swap#/definitions/shared2" },
    },
    zeroExFee: { $ref: "0x-swap#/definitions/shared1" },
  },
  required: ["integratorFee", "integratorFees", "zeroExFee"],
}
function validate77(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.integratorFee === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "integratorFee" },
        message: "must have required property '" + "integratorFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.integratorFees === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "integratorFees" },
        message: "must have required property '" + "integratorFees" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.zeroExFee === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "zeroExFee" },
        message: "must have required property '" + "zeroExFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.integratorFee !== undefined) {
      if (
        !validate52(data.integratorFee, {
          instancePath: instancePath + "/integratorFee",
          parentData: data,
          parentDataProperty: "integratorFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
      }
    }
    if (data.integratorFees !== undefined) {
      let data1 = data.integratorFees
      if (!Array.isArray(data1) && data1 !== null) {
        const err3 = {
          instancePath: instancePath + "/integratorFees",
          schemaPath: "#/properties/integratorFees/type",
          keyword: "type",
          params: { type: schema32.properties.integratorFees.type },
          message: "must be array,null",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
      }
      if (Array.isArray(data1)) {
        const len0 = data1.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate54(data1[i0], {
              instancePath: instancePath + "/integratorFees/" + i0,
              parentData: data1,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate54.errors
                : vErrors.concat(validate54.errors)
            errors = vErrors.length
          }
        }
      }
    }
    if (data.zeroExFee !== undefined) {
      if (
        !validate52(data.zeroExFee, {
          instancePath: instancePath + "/zeroExFee",
          parentData: data,
          parentDataProperty: "zeroExFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
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
  validate77.errors = vErrors
  return errors === 0
}
const schema33 = {
  type: "object",
  properties: {
    forward: { $ref: "0x-swap#/definitions/shared7" },
    refund: { $ref: "0x-swap#/definitions/shared7" },
  },
  required: ["forward", "refund"],
}
function validate84(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.fills === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "fills" },
        message: "must have required property '" + "fills" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.tokens === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "tokens" },
        message: "must have required property '" + "tokens" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.fills !== undefined) {
      let data0 = data.fills
      if (Array.isArray(data0)) {
        const len0 = data0.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate67(data0[i0], {
              instancePath: instancePath + "/fills/" + i0,
              parentData: data0,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate67.errors
                : vErrors.concat(validate67.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err2 = {
          instancePath: instancePath + "/fills",
          schemaPath: "#/properties/fills/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err2]
        } else {
          vErrors.push(err2)
        }
        errors++
      }
    }
    if (data.tokens !== undefined) {
      let data2 = data.tokens
      if (Array.isArray(data2)) {
        const len1 = data2.length
        for (let i1 = 0; i1 < len1; i1++) {
          if (
            !validate69(data2[i1], {
              instancePath: instancePath + "/tokens/" + i1,
              parentData: data2,
              parentDataProperty: i1,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate69.errors
                : vErrors.concat(validate69.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err3 = {
          instancePath: instancePath + "/tokens",
          schemaPath: "#/properties/tokens/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
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
  validate84.errors = vErrors
  return errors === 0
}
function validate83(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.forward === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "forward" },
        message: "must have required property '" + "forward" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.refund === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "refund" },
        message: "must have required property '" + "refund" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.forward !== undefined) {
      if (
        !validate84(data.forward, {
          instancePath: instancePath + "/forward",
          parentData: data,
          parentDataProperty: "forward",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate84.errors
            : vErrors.concat(validate84.errors)
        errors = vErrors.length
      }
    }
    if (data.refund !== undefined) {
      if (
        !validate84(data.refund, {
          instancePath: instancePath + "/refund",
          parentData: data,
          parentDataProperty: "refund",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate84.errors
            : vErrors.concat(validate84.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err2 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err2]
    } else {
      vErrors.push(err2)
    }
    errors++
  }
  validate83.errors = vErrors
  return errors === 0
}
const schema35 = {
  type: "object",
  properties: {
    liquidityAvailable: { type: "boolean", enum: [false] },
    zid: { type: "string" },
  },
  required: ["liquidityAvailable", "zid"],
}
function validate91(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.liquidityAvailable === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
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
    if (data.zid === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "zid" },
        message: "must have required property '" + "zid" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.liquidityAvailable !== undefined) {
      let data0 = data.liquidityAvailable
      if (typeof data0 !== "boolean") {
        const err2 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/properties/liquidityAvailable/type",
          keyword: "type",
          params: { type: "boolean" },
          message: "must be boolean",
        }
        if (vErrors === null) {
          vErrors = [err2]
        } else {
          vErrors.push(err2)
        }
        errors++
      }
      if (!(data0 === false)) {
        const err3 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/properties/liquidityAvailable/enum",
          keyword: "enum",
          params: {
            allowedValues: schema35.properties.liquidityAvailable.enum,
          },
          message: "must be equal to one of the allowed values",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
      }
    }
    if (data.zid !== undefined) {
      if (typeof data.zid !== "string") {
        const err4 = {
          instancePath: instancePath + "/zid",
          schemaPath: "#/properties/zid/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
    }
  } else {
    const err5 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err5]
    } else {
      vErrors.push(err5)
    }
    errors++
  }
  validate91.errors = vErrors
  return errors === 0
}
function validate49(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  const _errs1 = errors
  const _errs2 = errors
  let valid1 = false
  const _errs3 = errors
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.allowanceTarget === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "allowanceTarget" },
        message: "must have required property '" + "allowanceTarget" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.blockNumber === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "blockNumber" },
        message: "must have required property '" + "blockNumber" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.buyAmount === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "buyAmount" },
        message: "must have required property '" + "buyAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.buyToken === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "buyToken" },
        message: "must have required property '" + "buyToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.fees === undefined) {
      const err4 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "fees" },
        message: "must have required property '" + "fees" + "'",
      }
      if (vErrors === null) {
        vErrors = [err4]
      } else {
        vErrors.push(err4)
      }
      errors++
    }
    if (data.issues === undefined) {
      const err5 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "issues" },
        message: "must have required property '" + "issues" + "'",
      }
      if (vErrors === null) {
        vErrors = [err5]
      } else {
        vErrors.push(err5)
      }
      errors++
    }
    if (data.liquidityAvailable === undefined) {
      const err6 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "liquidityAvailable" },
        message: "must have required property '" + "liquidityAvailable" + "'",
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
        schemaPath: "#/anyOf/0/anyOf/0/required",
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
    if (data.mode === undefined) {
      const err8 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "mode" },
        message: "must have required property '" + "mode" + "'",
      }
      if (vErrors === null) {
        vErrors = [err8]
      } else {
        vErrors.push(err8)
      }
      errors++
    }
    if (data.route === undefined) {
      const err9 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "route" },
        message: "must have required property '" + "route" + "'",
      }
      if (vErrors === null) {
        vErrors = [err9]
      } else {
        vErrors.push(err9)
      }
      errors++
    }
    if (data.sellAmount === undefined) {
      const err10 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "sellAmount" },
        message: "must have required property '" + "sellAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
    }
    if (data.sellToken === undefined) {
      const err11 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "sellToken" },
        message: "must have required property '" + "sellToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err11]
      } else {
        vErrors.push(err11)
      }
      errors++
    }
    if (data.tokenMetadata === undefined) {
      const err12 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "tokenMetadata" },
        message: "must have required property '" + "tokenMetadata" + "'",
      }
      if (vErrors === null) {
        vErrors = [err12]
      } else {
        vErrors.push(err12)
      }
      errors++
    }
    if (data.totalNetworkFee === undefined) {
      const err13 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "totalNetworkFee" },
        message: "must have required property '" + "totalNetworkFee" + "'",
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
        schemaPath: "#/anyOf/0/anyOf/0/required",
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
    if (data.gas === undefined) {
      const err15 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "gas" },
        message: "must have required property '" + "gas" + "'",
      }
      if (vErrors === null) {
        vErrors = [err15]
      } else {
        vErrors.push(err15)
      }
      errors++
    }
    if (data.gasPrice === undefined) {
      const err16 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "gasPrice" },
        message: "must have required property '" + "gasPrice" + "'",
      }
      if (vErrors === null) {
        vErrors = [err16]
      } else {
        vErrors.push(err16)
      }
      errors++
    }
    if (data.allowanceTarget !== undefined) {
      let data0 = data.allowanceTarget
      if (typeof data0 !== "string" && data0 !== null) {
        const err17 = {
          instancePath: instancePath + "/allowanceTarget",
          schemaPath: "#/anyOf/0/anyOf/0/properties/allowanceTarget/type",
          keyword: "type",
          params: {
            type: schema18.anyOf[0].anyOf[0].properties.allowanceTarget.type,
          },
          message: "must be string,null",
        }
        if (vErrors === null) {
          vErrors = [err17]
        } else {
          vErrors.push(err17)
        }
        errors++
      }
      if (typeof data0 === "string") {
        if (!pattern1.test(data0)) {
          const err18 = {
            instancePath: instancePath + "/allowanceTarget",
            schemaPath: "#/anyOf/0/anyOf/0/properties/allowanceTarget/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err18]
          } else {
            vErrors.push(err18)
          }
          errors++
        }
      }
    }
    if (data.blockNumber !== undefined) {
      let data1 = data.blockNumber
      if (typeof data1 === "string") {
        if (!pattern10.test(data1)) {
          const err19 = {
            instancePath: instancePath + "/blockNumber",
            schemaPath: "#/anyOf/0/anyOf/0/properties/blockNumber/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
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
          instancePath: instancePath + "/blockNumber",
          schemaPath: "#/anyOf/0/anyOf/0/properties/blockNumber/type",
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
    if (data.buyAmount !== undefined) {
      let data2 = data.buyAmount
      if (typeof data2 === "string") {
        if (!pattern10.test(data2)) {
          const err21 = {
            instancePath: instancePath + "/buyAmount",
            schemaPath: "#/anyOf/0/anyOf/0/properties/buyAmount/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err21]
          } else {
            vErrors.push(err21)
          }
          errors++
        }
      } else {
        const err22 = {
          instancePath: instancePath + "/buyAmount",
          schemaPath: "#/anyOf/0/anyOf/0/properties/buyAmount/type",
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
      let data3 = data.buyToken
      if (typeof data3 === "string") {
        if (!pattern1.test(data3)) {
          const err23 = {
            instancePath: instancePath + "/buyToken",
            schemaPath: "#/anyOf/0/anyOf/0/properties/buyToken/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err23]
          } else {
            vErrors.push(err23)
          }
          errors++
        }
      } else {
        const err24 = {
          instancePath: instancePath + "/buyToken",
          schemaPath: "#/anyOf/0/anyOf/0/properties/buyToken/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err24]
        } else {
          vErrors.push(err24)
        }
        errors++
      }
    }
    if (data.fees !== undefined) {
      if (
        !validate51(data.fees, {
          instancePath: instancePath + "/fees",
          parentData: data,
          parentDataProperty: "fees",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate51.errors
            : vErrors.concat(validate51.errors)
        errors = vErrors.length
      }
    }
    if (data.issues !== undefined) {
      if (
        !validate60(data.issues, {
          instancePath: instancePath + "/issues",
          parentData: data,
          parentDataProperty: "issues",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate60.errors
            : vErrors.concat(validate60.errors)
        errors = vErrors.length
      }
    }
    if (data.liquidityAvailable !== undefined) {
      let data6 = data.liquidityAvailable
      if (typeof data6 !== "boolean") {
        const err25 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/anyOf/0/anyOf/0/properties/liquidityAvailable/type",
          keyword: "type",
          params: { type: "boolean" },
          message: "must be boolean",
        }
        if (vErrors === null) {
          vErrors = [err25]
        } else {
          vErrors.push(err25)
        }
        errors++
      }
      if (!(data6 === true)) {
        const err26 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/anyOf/0/anyOf/0/properties/liquidityAvailable/enum",
          keyword: "enum",
          params: {
            allowedValues:
              schema18.anyOf[0].anyOf[0].properties.liquidityAvailable.enum,
          },
          message: "must be equal to one of the allowed values",
        }
        if (vErrors === null) {
          vErrors = [err26]
        } else {
          vErrors.push(err26)
        }
        errors++
      }
    }
    if (data.minBuyAmount !== undefined) {
      let data7 = data.minBuyAmount
      if (typeof data7 === "string") {
        if (!pattern10.test(data7)) {
          const err27 = {
            instancePath: instancePath + "/minBuyAmount",
            schemaPath: "#/anyOf/0/anyOf/0/properties/minBuyAmount/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
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
          instancePath: instancePath + "/minBuyAmount",
          schemaPath: "#/anyOf/0/anyOf/0/properties/minBuyAmount/type",
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
    if (data.mode !== undefined) {
      let data8 = data.mode
      if (typeof data8 !== "string") {
        const err29 = {
          instancePath: instancePath + "/mode",
          schemaPath: "#/anyOf/0/anyOf/0/properties/mode/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err29]
        } else {
          vErrors.push(err29)
        }
        errors++
      }
      if (!(data8 === "exact-in")) {
        const err30 = {
          instancePath: instancePath + "/mode",
          schemaPath: "#/anyOf/0/anyOf/0/properties/mode/enum",
          keyword: "enum",
          params: {
            allowedValues: schema18.anyOf[0].anyOf[0].properties.mode.enum,
          },
          message: "must be equal to one of the allowed values",
        }
        if (vErrors === null) {
          vErrors = [err30]
        } else {
          vErrors.push(err30)
        }
        errors++
      }
    }
    if (data.route !== undefined) {
      if (
        !validate66(data.route, {
          instancePath: instancePath + "/route",
          parentData: data,
          parentDataProperty: "route",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate66.errors
            : vErrors.concat(validate66.errors)
        errors = vErrors.length
      }
    }
    if (data.sellAmount !== undefined) {
      let data10 = data.sellAmount
      if (typeof data10 === "string") {
        if (!pattern10.test(data10)) {
          const err31 = {
            instancePath: instancePath + "/sellAmount",
            schemaPath: "#/anyOf/0/anyOf/0/properties/sellAmount/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err31]
          } else {
            vErrors.push(err31)
          }
          errors++
        }
      } else {
        const err32 = {
          instancePath: instancePath + "/sellAmount",
          schemaPath: "#/anyOf/0/anyOf/0/properties/sellAmount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err32]
        } else {
          vErrors.push(err32)
        }
        errors++
      }
    }
    if (data.sellToken !== undefined) {
      let data11 = data.sellToken
      if (typeof data11 === "string") {
        if (!pattern1.test(data11)) {
          const err33 = {
            instancePath: instancePath + "/sellToken",
            schemaPath: "#/anyOf/0/anyOf/0/properties/sellToken/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err33]
          } else {
            vErrors.push(err33)
          }
          errors++
        }
      } else {
        const err34 = {
          instancePath: instancePath + "/sellToken",
          schemaPath: "#/anyOf/0/anyOf/0/properties/sellToken/type",
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
    if (data.tokenMetadata !== undefined) {
      if (
        !validate72(data.tokenMetadata, {
          instancePath: instancePath + "/tokenMetadata",
          parentData: data,
          parentDataProperty: "tokenMetadata",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate72.errors
            : vErrors.concat(validate72.errors)
        errors = vErrors.length
      }
    }
    if (data.totalNetworkFee !== undefined) {
      let data13 = data.totalNetworkFee
      if (typeof data13 !== "string" && data13 !== null) {
        const err35 = {
          instancePath: instancePath + "/totalNetworkFee",
          schemaPath: "#/anyOf/0/anyOf/0/properties/totalNetworkFee/type",
          keyword: "type",
          params: {
            type: schema18.anyOf[0].anyOf[0].properties.totalNetworkFee.type,
          },
          message: "must be string,null",
        }
        if (vErrors === null) {
          vErrors = [err35]
        } else {
          vErrors.push(err35)
        }
        errors++
      }
      if (typeof data13 === "string") {
        if (!pattern10.test(data13)) {
          const err36 = {
            instancePath: instancePath + "/totalNetworkFee",
            schemaPath: "#/anyOf/0/anyOf/0/properties/totalNetworkFee/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err36]
          } else {
            vErrors.push(err36)
          }
          errors++
        }
      }
    }
    if (data.zid !== undefined) {
      if (typeof data.zid !== "string") {
        const err37 = {
          instancePath: instancePath + "/zid",
          schemaPath: "#/anyOf/0/anyOf/0/properties/zid/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err37]
        } else {
          vErrors.push(err37)
        }
        errors++
      }
    }
    if (data.gas !== undefined) {
      let data15 = data.gas
      if (typeof data15 !== "string" && data15 !== null) {
        const err38 = {
          instancePath: instancePath + "/gas",
          schemaPath: "#/anyOf/0/anyOf/0/properties/gas/type",
          keyword: "type",
          params: { type: schema18.anyOf[0].anyOf[0].properties.gas.type },
          message: "must be string,null",
        }
        if (vErrors === null) {
          vErrors = [err38]
        } else {
          vErrors.push(err38)
        }
        errors++
      }
      if (typeof data15 === "string") {
        if (!pattern10.test(data15)) {
          const err39 = {
            instancePath: instancePath + "/gas",
            schemaPath: "#/anyOf/0/anyOf/0/properties/gas/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err39]
          } else {
            vErrors.push(err39)
          }
          errors++
        }
      }
    }
    if (data.gasPrice !== undefined) {
      let data16 = data.gasPrice
      if (typeof data16 === "string") {
        if (!pattern10.test(data16)) {
          const err40 = {
            instancePath: instancePath + "/gasPrice",
            schemaPath: "#/anyOf/0/anyOf/0/properties/gasPrice/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err40]
          } else {
            vErrors.push(err40)
          }
          errors++
        }
      } else {
        const err41 = {
          instancePath: instancePath + "/gasPrice",
          schemaPath: "#/anyOf/0/anyOf/0/properties/gasPrice/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err41]
        } else {
          vErrors.push(err41)
        }
        errors++
      }
    }
  } else {
    const err42 = {
      instancePath,
      schemaPath: "#/anyOf/0/anyOf/0/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err42]
    } else {
      vErrors.push(err42)
    }
    errors++
  }
  var _valid1 = _errs3 === errors
  valid1 = valid1 || _valid1
  if (!valid1) {
    const _errs35 = errors
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.allowanceTarget === undefined) {
        const err43 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "allowanceTarget" },
          message: "must have required property '" + "allowanceTarget" + "'",
        }
        if (vErrors === null) {
          vErrors = [err43]
        } else {
          vErrors.push(err43)
        }
        errors++
      }
      if (data.blockNumber === undefined) {
        const err44 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "blockNumber" },
          message: "must have required property '" + "blockNumber" + "'",
        }
        if (vErrors === null) {
          vErrors = [err44]
        } else {
          vErrors.push(err44)
        }
        errors++
      }
      if (data.buyAmount === undefined) {
        const err45 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "buyAmount" },
          message: "must have required property '" + "buyAmount" + "'",
        }
        if (vErrors === null) {
          vErrors = [err45]
        } else {
          vErrors.push(err45)
        }
        errors++
      }
      if (data.buyToken === undefined) {
        const err46 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "buyToken" },
          message: "must have required property '" + "buyToken" + "'",
        }
        if (vErrors === null) {
          vErrors = [err46]
        } else {
          vErrors.push(err46)
        }
        errors++
      }
      if (data.estimatedNetSellAmount === undefined) {
        const err47 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "estimatedNetSellAmount" },
          message:
            "must have required property '" + "estimatedNetSellAmount" + "'",
        }
        if (vErrors === null) {
          vErrors = [err47]
        } else {
          vErrors.push(err47)
        }
        errors++
      }
      if (data.fees === undefined) {
        const err48 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "fees" },
          message: "must have required property '" + "fees" + "'",
        }
        if (vErrors === null) {
          vErrors = [err48]
        } else {
          vErrors.push(err48)
        }
        errors++
      }
      if (data.issues === undefined) {
        const err49 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "issues" },
          message: "must have required property '" + "issues" + "'",
        }
        if (vErrors === null) {
          vErrors = [err49]
        } else {
          vErrors.push(err49)
        }
        errors++
      }
      if (data.liquidityAvailable === undefined) {
        const err50 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "liquidityAvailable" },
          message: "must have required property '" + "liquidityAvailable" + "'",
        }
        if (vErrors === null) {
          vErrors = [err50]
        } else {
          vErrors.push(err50)
        }
        errors++
      }
      if (data.mode === undefined) {
        const err51 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "mode" },
          message: "must have required property '" + "mode" + "'",
        }
        if (vErrors === null) {
          vErrors = [err51]
        } else {
          vErrors.push(err51)
        }
        errors++
      }
      if (data.routes === undefined) {
        const err52 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "routes" },
          message: "must have required property '" + "routes" + "'",
        }
        if (vErrors === null) {
          vErrors = [err52]
        } else {
          vErrors.push(err52)
        }
        errors++
      }
      if (data.maxSellAmount === undefined) {
        const err53 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "maxSellAmount" },
          message: "must have required property '" + "maxSellAmount" + "'",
        }
        if (vErrors === null) {
          vErrors = [err53]
        } else {
          vErrors.push(err53)
        }
        errors++
      }
      if (data.sellToken === undefined) {
        const err54 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "sellToken" },
          message: "must have required property '" + "sellToken" + "'",
        }
        if (vErrors === null) {
          vErrors = [err54]
        } else {
          vErrors.push(err54)
        }
        errors++
      }
      if (data.tokenMetadata === undefined) {
        const err55 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "tokenMetadata" },
          message: "must have required property '" + "tokenMetadata" + "'",
        }
        if (vErrors === null) {
          vErrors = [err55]
        } else {
          vErrors.push(err55)
        }
        errors++
      }
      if (data.totalNetworkFee === undefined) {
        const err56 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "totalNetworkFee" },
          message: "must have required property '" + "totalNetworkFee" + "'",
        }
        if (vErrors === null) {
          vErrors = [err56]
        } else {
          vErrors.push(err56)
        }
        errors++
      }
      if (data.zid === undefined) {
        const err57 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "zid" },
          message: "must have required property '" + "zid" + "'",
        }
        if (vErrors === null) {
          vErrors = [err57]
        } else {
          vErrors.push(err57)
        }
        errors++
      }
      if (data.gas === undefined) {
        const err58 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "gas" },
          message: "must have required property '" + "gas" + "'",
        }
        if (vErrors === null) {
          vErrors = [err58]
        } else {
          vErrors.push(err58)
        }
        errors++
      }
      if (data.gasPrice === undefined) {
        const err59 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "gasPrice" },
          message: "must have required property '" + "gasPrice" + "'",
        }
        if (vErrors === null) {
          vErrors = [err59]
        } else {
          vErrors.push(err59)
        }
        errors++
      }
      if (data.allowanceTarget !== undefined) {
        let data17 = data.allowanceTarget
        if (typeof data17 !== "string" && data17 !== null) {
          const err60 = {
            instancePath: instancePath + "/allowanceTarget",
            schemaPath: "#/anyOf/0/anyOf/1/properties/allowanceTarget/type",
            keyword: "type",
            params: {
              type: schema18.anyOf[0].anyOf[1].properties.allowanceTarget.type,
            },
            message: "must be string,null",
          }
          if (vErrors === null) {
            vErrors = [err60]
          } else {
            vErrors.push(err60)
          }
          errors++
        }
        if (typeof data17 === "string") {
          if (!pattern1.test(data17)) {
            const err61 = {
              instancePath: instancePath + "/allowanceTarget",
              schemaPath:
                "#/anyOf/0/anyOf/1/properties/allowanceTarget/pattern",
              keyword: "pattern",
              params: { pattern: "^0x[a-fA-F0-9]{40}$" },
              message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err61]
            } else {
              vErrors.push(err61)
            }
            errors++
          }
        }
      }
      if (data.blockNumber !== undefined) {
        let data18 = data.blockNumber
        if (typeof data18 === "string") {
          if (!pattern10.test(data18)) {
            const err62 = {
              instancePath: instancePath + "/blockNumber",
              schemaPath: "#/anyOf/0/anyOf/1/properties/blockNumber/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err62]
            } else {
              vErrors.push(err62)
            }
            errors++
          }
        } else {
          const err63 = {
            instancePath: instancePath + "/blockNumber",
            schemaPath: "#/anyOf/0/anyOf/1/properties/blockNumber/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
          }
          if (vErrors === null) {
            vErrors = [err63]
          } else {
            vErrors.push(err63)
          }
          errors++
        }
      }
      if (data.buyAmount !== undefined) {
        let data19 = data.buyAmount
        if (typeof data19 === "string") {
          if (!pattern10.test(data19)) {
            const err64 = {
              instancePath: instancePath + "/buyAmount",
              schemaPath: "#/anyOf/0/anyOf/1/properties/buyAmount/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err64]
            } else {
              vErrors.push(err64)
            }
            errors++
          }
        } else {
          const err65 = {
            instancePath: instancePath + "/buyAmount",
            schemaPath: "#/anyOf/0/anyOf/1/properties/buyAmount/type",
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
      if (data.buyToken !== undefined) {
        let data20 = data.buyToken
        if (typeof data20 === "string") {
          if (!pattern1.test(data20)) {
            const err66 = {
              instancePath: instancePath + "/buyToken",
              schemaPath: "#/anyOf/0/anyOf/1/properties/buyToken/pattern",
              keyword: "pattern",
              params: { pattern: "^0x[a-fA-F0-9]{40}$" },
              message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err66]
            } else {
              vErrors.push(err66)
            }
            errors++
          }
        } else {
          const err67 = {
            instancePath: instancePath + "/buyToken",
            schemaPath: "#/anyOf/0/anyOf/1/properties/buyToken/type",
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
      if (data.estimatedNetSellAmount !== undefined) {
        let data21 = data.estimatedNetSellAmount
        if (typeof data21 === "string") {
          if (!pattern10.test(data21)) {
            const err68 = {
              instancePath: instancePath + "/estimatedNetSellAmount",
              schemaPath:
                "#/anyOf/0/anyOf/1/properties/estimatedNetSellAmount/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err68]
            } else {
              vErrors.push(err68)
            }
            errors++
          }
        } else {
          const err69 = {
            instancePath: instancePath + "/estimatedNetSellAmount",
            schemaPath:
              "#/anyOf/0/anyOf/1/properties/estimatedNetSellAmount/type",
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
      }
      if (data.fees !== undefined) {
        if (
          !validate77(data.fees, {
            instancePath: instancePath + "/fees",
            parentData: data,
            parentDataProperty: "fees",
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate77.errors
              : vErrors.concat(validate77.errors)
          errors = vErrors.length
        }
      }
      if (data.issues !== undefined) {
        if (
          !validate60(data.issues, {
            instancePath: instancePath + "/issues",
            parentData: data,
            parentDataProperty: "issues",
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate60.errors
              : vErrors.concat(validate60.errors)
          errors = vErrors.length
        }
      }
      if (data.liquidityAvailable !== undefined) {
        let data24 = data.liquidityAvailable
        if (typeof data24 !== "boolean") {
          const err70 = {
            instancePath: instancePath + "/liquidityAvailable",
            schemaPath: "#/anyOf/0/anyOf/1/properties/liquidityAvailable/type",
            keyword: "type",
            params: { type: "boolean" },
            message: "must be boolean",
          }
          if (vErrors === null) {
            vErrors = [err70]
          } else {
            vErrors.push(err70)
          }
          errors++
        }
        if (!(data24 === true)) {
          const err71 = {
            instancePath: instancePath + "/liquidityAvailable",
            schemaPath: "#/anyOf/0/anyOf/1/properties/liquidityAvailable/enum",
            keyword: "enum",
            params: {
              allowedValues:
                schema18.anyOf[0].anyOf[1].properties.liquidityAvailable.enum,
            },
            message: "must be equal to one of the allowed values",
          }
          if (vErrors === null) {
            vErrors = [err71]
          } else {
            vErrors.push(err71)
          }
          errors++
        }
      }
      if (data.mode !== undefined) {
        let data25 = data.mode
        if (typeof data25 !== "string") {
          const err72 = {
            instancePath: instancePath + "/mode",
            schemaPath: "#/anyOf/0/anyOf/1/properties/mode/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
          }
          if (vErrors === null) {
            vErrors = [err72]
          } else {
            vErrors.push(err72)
          }
          errors++
        }
        if (!(data25 === "exact-out")) {
          const err73 = {
            instancePath: instancePath + "/mode",
            schemaPath: "#/anyOf/0/anyOf/1/properties/mode/enum",
            keyword: "enum",
            params: {
              allowedValues: schema18.anyOf[0].anyOf[1].properties.mode.enum,
            },
            message: "must be equal to one of the allowed values",
          }
          if (vErrors === null) {
            vErrors = [err73]
          } else {
            vErrors.push(err73)
          }
          errors++
        }
      }
      if (data.routes !== undefined) {
        if (
          !validate83(data.routes, {
            instancePath: instancePath + "/routes",
            parentData: data,
            parentDataProperty: "routes",
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate83.errors
              : vErrors.concat(validate83.errors)
          errors = vErrors.length
        }
      }
      if (data.maxSellAmount !== undefined) {
        let data27 = data.maxSellAmount
        if (typeof data27 === "string") {
          if (!pattern10.test(data27)) {
            const err74 = {
              instancePath: instancePath + "/maxSellAmount",
              schemaPath: "#/anyOf/0/anyOf/1/properties/maxSellAmount/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err74]
            } else {
              vErrors.push(err74)
            }
            errors++
          }
        } else {
          const err75 = {
            instancePath: instancePath + "/maxSellAmount",
            schemaPath: "#/anyOf/0/anyOf/1/properties/maxSellAmount/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
          }
          if (vErrors === null) {
            vErrors = [err75]
          } else {
            vErrors.push(err75)
          }
          errors++
        }
      }
      if (data.sellToken !== undefined) {
        let data28 = data.sellToken
        if (typeof data28 === "string") {
          if (!pattern1.test(data28)) {
            const err76 = {
              instancePath: instancePath + "/sellToken",
              schemaPath: "#/anyOf/0/anyOf/1/properties/sellToken/pattern",
              keyword: "pattern",
              params: { pattern: "^0x[a-fA-F0-9]{40}$" },
              message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err76]
            } else {
              vErrors.push(err76)
            }
            errors++
          }
        } else {
          const err77 = {
            instancePath: instancePath + "/sellToken",
            schemaPath: "#/anyOf/0/anyOf/1/properties/sellToken/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
          }
          if (vErrors === null) {
            vErrors = [err77]
          } else {
            vErrors.push(err77)
          }
          errors++
        }
      }
      if (data.tokenMetadata !== undefined) {
        if (
          !validate72(data.tokenMetadata, {
            instancePath: instancePath + "/tokenMetadata",
            parentData: data,
            parentDataProperty: "tokenMetadata",
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate72.errors
              : vErrors.concat(validate72.errors)
          errors = vErrors.length
        }
      }
      if (data.totalNetworkFee !== undefined) {
        let data30 = data.totalNetworkFee
        if (typeof data30 !== "string" && data30 !== null) {
          const err78 = {
            instancePath: instancePath + "/totalNetworkFee",
            schemaPath: "#/anyOf/0/anyOf/1/properties/totalNetworkFee/type",
            keyword: "type",
            params: {
              type: schema18.anyOf[0].anyOf[1].properties.totalNetworkFee.type,
            },
            message: "must be string,null",
          }
          if (vErrors === null) {
            vErrors = [err78]
          } else {
            vErrors.push(err78)
          }
          errors++
        }
        if (typeof data30 === "string") {
          if (!pattern10.test(data30)) {
            const err79 = {
              instancePath: instancePath + "/totalNetworkFee",
              schemaPath:
                "#/anyOf/0/anyOf/1/properties/totalNetworkFee/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err79]
            } else {
              vErrors.push(err79)
            }
            errors++
          }
        }
      }
      if (data.zid !== undefined) {
        if (typeof data.zid !== "string") {
          const err80 = {
            instancePath: instancePath + "/zid",
            schemaPath: "#/anyOf/0/anyOf/1/properties/zid/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
          }
          if (vErrors === null) {
            vErrors = [err80]
          } else {
            vErrors.push(err80)
          }
          errors++
        }
      }
      if (data.gas !== undefined) {
        let data32 = data.gas
        if (typeof data32 !== "string" && data32 !== null) {
          const err81 = {
            instancePath: instancePath + "/gas",
            schemaPath: "#/anyOf/0/anyOf/1/properties/gas/type",
            keyword: "type",
            params: { type: schema18.anyOf[0].anyOf[1].properties.gas.type },
            message: "must be string,null",
          }
          if (vErrors === null) {
            vErrors = [err81]
          } else {
            vErrors.push(err81)
          }
          errors++
        }
        if (typeof data32 === "string") {
          if (!pattern10.test(data32)) {
            const err82 = {
              instancePath: instancePath + "/gas",
              schemaPath: "#/anyOf/0/anyOf/1/properties/gas/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err82]
            } else {
              vErrors.push(err82)
            }
            errors++
          }
        }
      }
      if (data.gasPrice !== undefined) {
        let data33 = data.gasPrice
        if (typeof data33 === "string") {
          if (!pattern10.test(data33)) {
            const err83 = {
              instancePath: instancePath + "/gasPrice",
              schemaPath: "#/anyOf/0/anyOf/1/properties/gasPrice/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err83]
            } else {
              vErrors.push(err83)
            }
            errors++
          }
        } else {
          const err84 = {
            instancePath: instancePath + "/gasPrice",
            schemaPath: "#/anyOf/0/anyOf/1/properties/gasPrice/type",
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
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/1/type",
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
    var _valid1 = _errs35 === errors
    valid1 = valid1 || _valid1
  }
  if (!valid1) {
    const err86 = {
      instancePath,
      schemaPath: "#/anyOf/0/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err86]
    } else {
      vErrors.push(err86)
    }
    errors++
  } else {
    errors = _errs2
    if (vErrors !== null) {
      if (_errs2) {
        vErrors.length = _errs2
      } else {
        vErrors = null
      }
    }
  }
  var _valid0 = _errs1 === errors
  valid0 = valid0 || _valid0
  if (!valid0) {
    const _errs67 = errors
    if (
      !validate91(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null ? validate91.errors : vErrors.concat(validate91.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs67 === errors
    valid0 = valid0 || _valid0
  }
  if (!valid0) {
    const err87 = {
      instancePath,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err87]
    } else {
      vErrors.push(err87)
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
  validate49.errors = vErrors
  return errors === 0
}
exports.isValid0xSwapQuoteResponse = validate93
const schema36 = {
  anyOf: [
    {
      anyOf: [
        {
          type: "object",
          properties: {
            allowanceTarget: {
              type: ["string", "null"],
              pattern: "^0x[a-fA-F0-9]{40}$",
            },
            blockNumber: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            buyAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            buyToken: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            fees: { $ref: "0x-swap#/definitions/shared0" },
            issues: { $ref: "0x-swap#/definitions/shared4" },
            liquidityAvailable: { type: "boolean", enum: [true] },
            minBuyAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            mode: { type: "string", enum: ["exact-in"] },
            route: { $ref: "0x-swap#/definitions/shared7" },
            sellAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            sellToken: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            tokenMetadata: { $ref: "0x-swap#/definitions/shared10" },
            totalNetworkFee: {
              type: ["string", "null"],
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            zid: { type: "string" },
            transaction: { $ref: "0x-swap#/definitions/shared15" },
          },
          required: [
            "allowanceTarget",
            "blockNumber",
            "buyAmount",
            "buyToken",
            "fees",
            "issues",
            "liquidityAvailable",
            "minBuyAmount",
            "mode",
            "route",
            "sellAmount",
            "sellToken",
            "tokenMetadata",
            "totalNetworkFee",
            "zid",
            "transaction",
          ],
        },
        {
          type: "object",
          properties: {
            allowanceTarget: {
              type: ["string", "null"],
              pattern: "^0x[a-fA-F0-9]{40}$",
            },
            blockNumber: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            buyAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            buyToken: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            estimatedNetSellAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            fees: { $ref: "0x-swap#/definitions/shared12" },
            issues: { $ref: "0x-swap#/definitions/shared4" },
            liquidityAvailable: { type: "boolean", enum: [true] },
            mode: { type: "string", enum: ["exact-out"] },
            routes: { $ref: "0x-swap#/definitions/shared13" },
            maxSellAmount: {
              type: "string",
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            sellToken: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            tokenMetadata: { $ref: "0x-swap#/definitions/shared10" },
            totalNetworkFee: {
              type: ["string", "null"],
              pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
            },
            zid: { type: "string" },
            transaction: { $ref: "0x-swap#/definitions/shared15" },
          },
          required: [
            "allowanceTarget",
            "blockNumber",
            "buyAmount",
            "buyToken",
            "estimatedNetSellAmount",
            "fees",
            "issues",
            "liquidityAvailable",
            "mode",
            "routes",
            "maxSellAmount",
            "sellToken",
            "tokenMetadata",
            "totalNetworkFee",
            "zid",
            "transaction",
          ],
        },
      ],
    },
    { $ref: "0x-swap#/definitions/shared14" },
  ],
}
function validate94(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.integratorFee === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "integratorFee" },
        message: "must have required property '" + "integratorFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.integratorFees === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "integratorFees" },
        message: "must have required property '" + "integratorFees" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.zeroExFee === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "zeroExFee" },
        message: "must have required property '" + "zeroExFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.gasFee === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "gasFee" },
        message: "must have required property '" + "gasFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.integratorFee !== undefined) {
      if (
        !validate52(data.integratorFee, {
          instancePath: instancePath + "/integratorFee",
          parentData: data,
          parentDataProperty: "integratorFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
      }
    }
    if (data.integratorFees !== undefined) {
      let data1 = data.integratorFees
      if (!Array.isArray(data1) && data1 !== null) {
        const err4 = {
          instancePath: instancePath + "/integratorFees",
          schemaPath: "#/properties/integratorFees/type",
          keyword: "type",
          params: { type: schema20.properties.integratorFees.type },
          message: "must be array,null",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
      if (Array.isArray(data1)) {
        const len0 = data1.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate54(data1[i0], {
              instancePath: instancePath + "/integratorFees/" + i0,
              parentData: data1,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate54.errors
                : vErrors.concat(validate54.errors)
            errors = vErrors.length
          }
        }
      }
    }
    if (data.zeroExFee !== undefined) {
      if (
        !validate52(data.zeroExFee, {
          instancePath: instancePath + "/zeroExFee",
          parentData: data,
          parentDataProperty: "zeroExFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
      }
    }
    if (data.gasFee !== undefined) {
      if (
        !validate57(data.gasFee, {
          instancePath: instancePath + "/gasFee",
          parentData: data,
          parentDataProperty: "gasFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate57.errors
            : vErrors.concat(validate57.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err5 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err5]
    } else {
      vErrors.push(err5)
    }
    errors++
  }
  validate94.errors = vErrors
  return errors === 0
}
function validate100(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.allowance === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "allowance" },
        message: "must have required property '" + "allowance" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.balance === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "balance" },
        message: "must have required property '" + "balance" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.simulationIncomplete === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "simulationIncomplete" },
        message: "must have required property '" + "simulationIncomplete" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.invalidSourcesPassed === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "invalidSourcesPassed" },
        message: "must have required property '" + "invalidSourcesPassed" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.allowance !== undefined) {
      if (
        !validate61(data.allowance, {
          instancePath: instancePath + "/allowance",
          parentData: data,
          parentDataProperty: "allowance",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate61.errors
            : vErrors.concat(validate61.errors)
        errors = vErrors.length
      }
    }
    if (data.balance !== undefined) {
      if (
        !validate63(data.balance, {
          instancePath: instancePath + "/balance",
          parentData: data,
          parentDataProperty: "balance",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate63.errors
            : vErrors.concat(validate63.errors)
        errors = vErrors.length
      }
    }
    if (data.simulationIncomplete !== undefined) {
      if (typeof data.simulationIncomplete !== "boolean") {
        const err4 = {
          instancePath: instancePath + "/simulationIncomplete",
          schemaPath: "#/properties/simulationIncomplete/type",
          keyword: "type",
          params: { type: "boolean" },
          message: "must be boolean",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
    }
    if (data.invalidSourcesPassed !== undefined) {
      let data3 = data.invalidSourcesPassed
      if (Array.isArray(data3)) {
        const len0 = data3.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data3[i0] !== "string") {
            const err5 = {
              instancePath: instancePath + "/invalidSourcesPassed/" + i0,
              schemaPath: "#/properties/invalidSourcesPassed/items/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            }
            if (vErrors === null) {
              vErrors = [err5]
            } else {
              vErrors.push(err5)
            }
            errors++
          }
        }
      } else {
        const err6 = {
          instancePath: instancePath + "/invalidSourcesPassed",
          schemaPath: "#/properties/invalidSourcesPassed/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err6]
        } else {
          vErrors.push(err6)
        }
        errors++
      }
    }
  } else {
    const err7 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err7]
    } else {
      vErrors.push(err7)
    }
    errors++
  }
  validate100.errors = vErrors
  return errors === 0
}
function validate104(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.fills === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "fills" },
        message: "must have required property '" + "fills" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.tokens === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "tokens" },
        message: "must have required property '" + "tokens" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.fills !== undefined) {
      let data0 = data.fills
      if (Array.isArray(data0)) {
        const len0 = data0.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate67(data0[i0], {
              instancePath: instancePath + "/fills/" + i0,
              parentData: data0,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate67.errors
                : vErrors.concat(validate67.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err2 = {
          instancePath: instancePath + "/fills",
          schemaPath: "#/properties/fills/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err2]
        } else {
          vErrors.push(err2)
        }
        errors++
      }
    }
    if (data.tokens !== undefined) {
      let data2 = data.tokens
      if (Array.isArray(data2)) {
        const len1 = data2.length
        for (let i1 = 0; i1 < len1; i1++) {
          if (
            !validate69(data2[i1], {
              instancePath: instancePath + "/tokens/" + i1,
              parentData: data2,
              parentDataProperty: i1,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate69.errors
                : vErrors.concat(validate69.errors)
            errors = vErrors.length
          }
        }
      } else {
        const err3 = {
          instancePath: instancePath + "/tokens",
          schemaPath: "#/properties/tokens/type",
          keyword: "type",
          params: { type: "array" },
          message: "must be array",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
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
  validate104.errors = vErrors
  return errors === 0
}
function validate108(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.buyToken === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "buyToken" },
        message: "must have required property '" + "buyToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.sellToken === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "sellToken" },
        message: "must have required property '" + "sellToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.buyToken !== undefined) {
      if (
        !validate73(data.buyToken, {
          instancePath: instancePath + "/buyToken",
          parentData: data,
          parentDataProperty: "buyToken",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate73.errors
            : vErrors.concat(validate73.errors)
        errors = vErrors.length
      }
    }
    if (data.sellToken !== undefined) {
      if (
        !validate73(data.sellToken, {
          instancePath: instancePath + "/sellToken",
          parentData: data,
          parentDataProperty: "sellToken",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate73.errors
            : vErrors.concat(validate73.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err2 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err2]
    } else {
      vErrors.push(err2)
    }
    errors++
  }
  validate108.errors = vErrors
  return errors === 0
}
const schema41 = {
  type: "object",
  properties: {
    to: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
    data: { type: "string" },
    gas: {
      type: ["string", "null"],
      pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$",
    },
    gasPrice: { type: "string", pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
    value: { type: "string", pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
  },
  required: ["to", "data", "gas", "gasPrice", "value"],
}
function validate112(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.to === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "to" },
        message: "must have required property '" + "to" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.data === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "data" },
        message: "must have required property '" + "data" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.gas === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "gas" },
        message: "must have required property '" + "gas" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.gasPrice === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "gasPrice" },
        message: "must have required property '" + "gasPrice" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.value === undefined) {
      const err4 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "value" },
        message: "must have required property '" + "value" + "'",
      }
      if (vErrors === null) {
        vErrors = [err4]
      } else {
        vErrors.push(err4)
      }
      errors++
    }
    if (data.to !== undefined) {
      let data0 = data.to
      if (typeof data0 === "string") {
        if (!pattern1.test(data0)) {
          const err5 = {
            instancePath: instancePath + "/to",
            schemaPath: "#/properties/to/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err5]
          } else {
            vErrors.push(err5)
          }
          errors++
        }
      } else {
        const err6 = {
          instancePath: instancePath + "/to",
          schemaPath: "#/properties/to/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err6]
        } else {
          vErrors.push(err6)
        }
        errors++
      }
    }
    if (data.data !== undefined) {
      if (typeof data.data !== "string") {
        const err7 = {
          instancePath: instancePath + "/data",
          schemaPath: "#/properties/data/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err7]
        } else {
          vErrors.push(err7)
        }
        errors++
      }
    }
    if (data.gas !== undefined) {
      let data2 = data.gas
      if (typeof data2 !== "string" && data2 !== null) {
        const err8 = {
          instancePath: instancePath + "/gas",
          schemaPath: "#/properties/gas/type",
          keyword: "type",
          params: { type: schema41.properties.gas.type },
          message: "must be string,null",
        }
        if (vErrors === null) {
          vErrors = [err8]
        } else {
          vErrors.push(err8)
        }
        errors++
      }
      if (typeof data2 === "string") {
        if (!pattern10.test(data2)) {
          const err9 = {
            instancePath: instancePath + "/gas",
            schemaPath: "#/properties/gas/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err9]
          } else {
            vErrors.push(err9)
          }
          errors++
        }
      }
    }
    if (data.gasPrice !== undefined) {
      let data3 = data.gasPrice
      if (typeof data3 === "string") {
        if (!pattern10.test(data3)) {
          const err10 = {
            instancePath: instancePath + "/gasPrice",
            schemaPath: "#/properties/gasPrice/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
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
          instancePath: instancePath + "/gasPrice",
          schemaPath: "#/properties/gasPrice/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err11]
        } else {
          vErrors.push(err11)
        }
        errors++
      }
    }
    if (data.value !== undefined) {
      let data4 = data.value
      if (typeof data4 === "string") {
        if (!pattern10.test(data4)) {
          const err12 = {
            instancePath: instancePath + "/value",
            schemaPath: "#/properties/value/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err12]
          } else {
            vErrors.push(err12)
          }
          errors++
        }
      } else {
        const err13 = {
          instancePath: instancePath + "/value",
          schemaPath: "#/properties/value/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err13]
        } else {
          vErrors.push(err13)
        }
        errors++
      }
    }
  } else {
    const err14 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err14]
    } else {
      vErrors.push(err14)
    }
    errors++
  }
  validate112.errors = vErrors
  return errors === 0
}
function validate114(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.integratorFee === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "integratorFee" },
        message: "must have required property '" + "integratorFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.integratorFees === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "integratorFees" },
        message: "must have required property '" + "integratorFees" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.zeroExFee === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "zeroExFee" },
        message: "must have required property '" + "zeroExFee" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.integratorFee !== undefined) {
      if (
        !validate52(data.integratorFee, {
          instancePath: instancePath + "/integratorFee",
          parentData: data,
          parentDataProperty: "integratorFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
      }
    }
    if (data.integratorFees !== undefined) {
      let data1 = data.integratorFees
      if (!Array.isArray(data1) && data1 !== null) {
        const err3 = {
          instancePath: instancePath + "/integratorFees",
          schemaPath: "#/properties/integratorFees/type",
          keyword: "type",
          params: { type: schema32.properties.integratorFees.type },
          message: "must be array,null",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
      }
      if (Array.isArray(data1)) {
        const len0 = data1.length
        for (let i0 = 0; i0 < len0; i0++) {
          if (
            !validate54(data1[i0], {
              instancePath: instancePath + "/integratorFees/" + i0,
              parentData: data1,
              parentDataProperty: i0,
              rootData,
            })
          ) {
            vErrors =
              vErrors === null
                ? validate54.errors
                : vErrors.concat(validate54.errors)
            errors = vErrors.length
          }
        }
      }
    }
    if (data.zeroExFee !== undefined) {
      if (
        !validate52(data.zeroExFee, {
          instancePath: instancePath + "/zeroExFee",
          parentData: data,
          parentDataProperty: "zeroExFee",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate52.errors
            : vErrors.concat(validate52.errors)
        errors = vErrors.length
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
  validate114.errors = vErrors
  return errors === 0
}
function validate120(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.forward === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "forward" },
        message: "must have required property '" + "forward" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.refund === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "refund" },
        message: "must have required property '" + "refund" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.forward !== undefined) {
      if (
        !validate84(data.forward, {
          instancePath: instancePath + "/forward",
          parentData: data,
          parentDataProperty: "forward",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate84.errors
            : vErrors.concat(validate84.errors)
        errors = vErrors.length
      }
    }
    if (data.refund !== undefined) {
      if (
        !validate84(data.refund, {
          instancePath: instancePath + "/refund",
          parentData: data,
          parentDataProperty: "refund",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate84.errors
            : vErrors.concat(validate84.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err2 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err2]
    } else {
      vErrors.push(err2)
    }
    errors++
  }
  validate120.errors = vErrors
  return errors === 0
}
function validate126(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.liquidityAvailable === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/required",
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
    if (data.zid === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/required",
        keyword: "required",
        params: { missingProperty: "zid" },
        message: "must have required property '" + "zid" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.liquidityAvailable !== undefined) {
      let data0 = data.liquidityAvailable
      if (typeof data0 !== "boolean") {
        const err2 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/properties/liquidityAvailable/type",
          keyword: "type",
          params: { type: "boolean" },
          message: "must be boolean",
        }
        if (vErrors === null) {
          vErrors = [err2]
        } else {
          vErrors.push(err2)
        }
        errors++
      }
      if (!(data0 === false)) {
        const err3 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/properties/liquidityAvailable/enum",
          keyword: "enum",
          params: {
            allowedValues: schema35.properties.liquidityAvailable.enum,
          },
          message: "must be equal to one of the allowed values",
        }
        if (vErrors === null) {
          vErrors = [err3]
        } else {
          vErrors.push(err3)
        }
        errors++
      }
    }
    if (data.zid !== undefined) {
      if (typeof data.zid !== "string") {
        const err4 = {
          instancePath: instancePath + "/zid",
          schemaPath: "#/properties/zid/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err4]
        } else {
          vErrors.push(err4)
        }
        errors++
      }
    }
  } else {
    const err5 = {
      instancePath,
      schemaPath: "#/type",
      keyword: "type",
      params: { type: "object" },
      message: "must be object",
    }
    if (vErrors === null) {
      vErrors = [err5]
    } else {
      vErrors.push(err5)
    }
    errors++
  }
  validate126.errors = vErrors
  return errors === 0
}
function validate93(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data } = {},
) {
  let vErrors = null
  let errors = 0
  const _errs0 = errors
  let valid0 = false
  const _errs1 = errors
  const _errs2 = errors
  let valid1 = false
  const _errs3 = errors
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.allowanceTarget === undefined) {
      const err0 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "allowanceTarget" },
        message: "must have required property '" + "allowanceTarget" + "'",
      }
      if (vErrors === null) {
        vErrors = [err0]
      } else {
        vErrors.push(err0)
      }
      errors++
    }
    if (data.blockNumber === undefined) {
      const err1 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "blockNumber" },
        message: "must have required property '" + "blockNumber" + "'",
      }
      if (vErrors === null) {
        vErrors = [err1]
      } else {
        vErrors.push(err1)
      }
      errors++
    }
    if (data.buyAmount === undefined) {
      const err2 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "buyAmount" },
        message: "must have required property '" + "buyAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err2]
      } else {
        vErrors.push(err2)
      }
      errors++
    }
    if (data.buyToken === undefined) {
      const err3 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "buyToken" },
        message: "must have required property '" + "buyToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err3]
      } else {
        vErrors.push(err3)
      }
      errors++
    }
    if (data.fees === undefined) {
      const err4 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "fees" },
        message: "must have required property '" + "fees" + "'",
      }
      if (vErrors === null) {
        vErrors = [err4]
      } else {
        vErrors.push(err4)
      }
      errors++
    }
    if (data.issues === undefined) {
      const err5 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "issues" },
        message: "must have required property '" + "issues" + "'",
      }
      if (vErrors === null) {
        vErrors = [err5]
      } else {
        vErrors.push(err5)
      }
      errors++
    }
    if (data.liquidityAvailable === undefined) {
      const err6 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "liquidityAvailable" },
        message: "must have required property '" + "liquidityAvailable" + "'",
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
        schemaPath: "#/anyOf/0/anyOf/0/required",
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
    if (data.mode === undefined) {
      const err8 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "mode" },
        message: "must have required property '" + "mode" + "'",
      }
      if (vErrors === null) {
        vErrors = [err8]
      } else {
        vErrors.push(err8)
      }
      errors++
    }
    if (data.route === undefined) {
      const err9 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "route" },
        message: "must have required property '" + "route" + "'",
      }
      if (vErrors === null) {
        vErrors = [err9]
      } else {
        vErrors.push(err9)
      }
      errors++
    }
    if (data.sellAmount === undefined) {
      const err10 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "sellAmount" },
        message: "must have required property '" + "sellAmount" + "'",
      }
      if (vErrors === null) {
        vErrors = [err10]
      } else {
        vErrors.push(err10)
      }
      errors++
    }
    if (data.sellToken === undefined) {
      const err11 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "sellToken" },
        message: "must have required property '" + "sellToken" + "'",
      }
      if (vErrors === null) {
        vErrors = [err11]
      } else {
        vErrors.push(err11)
      }
      errors++
    }
    if (data.tokenMetadata === undefined) {
      const err12 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "tokenMetadata" },
        message: "must have required property '" + "tokenMetadata" + "'",
      }
      if (vErrors === null) {
        vErrors = [err12]
      } else {
        vErrors.push(err12)
      }
      errors++
    }
    if (data.totalNetworkFee === undefined) {
      const err13 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "totalNetworkFee" },
        message: "must have required property '" + "totalNetworkFee" + "'",
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
        schemaPath: "#/anyOf/0/anyOf/0/required",
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
    if (data.transaction === undefined) {
      const err15 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/0/required",
        keyword: "required",
        params: { missingProperty: "transaction" },
        message: "must have required property '" + "transaction" + "'",
      }
      if (vErrors === null) {
        vErrors = [err15]
      } else {
        vErrors.push(err15)
      }
      errors++
    }
    if (data.allowanceTarget !== undefined) {
      let data0 = data.allowanceTarget
      if (typeof data0 !== "string" && data0 !== null) {
        const err16 = {
          instancePath: instancePath + "/allowanceTarget",
          schemaPath: "#/anyOf/0/anyOf/0/properties/allowanceTarget/type",
          keyword: "type",
          params: {
            type: schema36.anyOf[0].anyOf[0].properties.allowanceTarget.type,
          },
          message: "must be string,null",
        }
        if (vErrors === null) {
          vErrors = [err16]
        } else {
          vErrors.push(err16)
        }
        errors++
      }
      if (typeof data0 === "string") {
        if (!pattern1.test(data0)) {
          const err17 = {
            instancePath: instancePath + "/allowanceTarget",
            schemaPath: "#/anyOf/0/anyOf/0/properties/allowanceTarget/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
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
    if (data.blockNumber !== undefined) {
      let data1 = data.blockNumber
      if (typeof data1 === "string") {
        if (!pattern10.test(data1)) {
          const err18 = {
            instancePath: instancePath + "/blockNumber",
            schemaPath: "#/anyOf/0/anyOf/0/properties/blockNumber/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err18]
          } else {
            vErrors.push(err18)
          }
          errors++
        }
      } else {
        const err19 = {
          instancePath: instancePath + "/blockNumber",
          schemaPath: "#/anyOf/0/anyOf/0/properties/blockNumber/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err19]
        } else {
          vErrors.push(err19)
        }
        errors++
      }
    }
    if (data.buyAmount !== undefined) {
      let data2 = data.buyAmount
      if (typeof data2 === "string") {
        if (!pattern10.test(data2)) {
          const err20 = {
            instancePath: instancePath + "/buyAmount",
            schemaPath: "#/anyOf/0/anyOf/0/properties/buyAmount/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err20]
          } else {
            vErrors.push(err20)
          }
          errors++
        }
      } else {
        const err21 = {
          instancePath: instancePath + "/buyAmount",
          schemaPath: "#/anyOf/0/anyOf/0/properties/buyAmount/type",
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
    if (data.buyToken !== undefined) {
      let data3 = data.buyToken
      if (typeof data3 === "string") {
        if (!pattern1.test(data3)) {
          const err22 = {
            instancePath: instancePath + "/buyToken",
            schemaPath: "#/anyOf/0/anyOf/0/properties/buyToken/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err22]
          } else {
            vErrors.push(err22)
          }
          errors++
        }
      } else {
        const err23 = {
          instancePath: instancePath + "/buyToken",
          schemaPath: "#/anyOf/0/anyOf/0/properties/buyToken/type",
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
      if (
        !validate94(data.fees, {
          instancePath: instancePath + "/fees",
          parentData: data,
          parentDataProperty: "fees",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate94.errors
            : vErrors.concat(validate94.errors)
        errors = vErrors.length
      }
    }
    if (data.issues !== undefined) {
      if (
        !validate100(data.issues, {
          instancePath: instancePath + "/issues",
          parentData: data,
          parentDataProperty: "issues",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate100.errors
            : vErrors.concat(validate100.errors)
        errors = vErrors.length
      }
    }
    if (data.liquidityAvailable !== undefined) {
      let data6 = data.liquidityAvailable
      if (typeof data6 !== "boolean") {
        const err24 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/anyOf/0/anyOf/0/properties/liquidityAvailable/type",
          keyword: "type",
          params: { type: "boolean" },
          message: "must be boolean",
        }
        if (vErrors === null) {
          vErrors = [err24]
        } else {
          vErrors.push(err24)
        }
        errors++
      }
      if (!(data6 === true)) {
        const err25 = {
          instancePath: instancePath + "/liquidityAvailable",
          schemaPath: "#/anyOf/0/anyOf/0/properties/liquidityAvailable/enum",
          keyword: "enum",
          params: {
            allowedValues:
              schema36.anyOf[0].anyOf[0].properties.liquidityAvailable.enum,
          },
          message: "must be equal to one of the allowed values",
        }
        if (vErrors === null) {
          vErrors = [err25]
        } else {
          vErrors.push(err25)
        }
        errors++
      }
    }
    if (data.minBuyAmount !== undefined) {
      let data7 = data.minBuyAmount
      if (typeof data7 === "string") {
        if (!pattern10.test(data7)) {
          const err26 = {
            instancePath: instancePath + "/minBuyAmount",
            schemaPath: "#/anyOf/0/anyOf/0/properties/minBuyAmount/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err26]
          } else {
            vErrors.push(err26)
          }
          errors++
        }
      } else {
        const err27 = {
          instancePath: instancePath + "/minBuyAmount",
          schemaPath: "#/anyOf/0/anyOf/0/properties/minBuyAmount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err27]
        } else {
          vErrors.push(err27)
        }
        errors++
      }
    }
    if (data.mode !== undefined) {
      let data8 = data.mode
      if (typeof data8 !== "string") {
        const err28 = {
          instancePath: instancePath + "/mode",
          schemaPath: "#/anyOf/0/anyOf/0/properties/mode/type",
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
      if (!(data8 === "exact-in")) {
        const err29 = {
          instancePath: instancePath + "/mode",
          schemaPath: "#/anyOf/0/anyOf/0/properties/mode/enum",
          keyword: "enum",
          params: {
            allowedValues: schema36.anyOf[0].anyOf[0].properties.mode.enum,
          },
          message: "must be equal to one of the allowed values",
        }
        if (vErrors === null) {
          vErrors = [err29]
        } else {
          vErrors.push(err29)
        }
        errors++
      }
    }
    if (data.route !== undefined) {
      if (
        !validate104(data.route, {
          instancePath: instancePath + "/route",
          parentData: data,
          parentDataProperty: "route",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate104.errors
            : vErrors.concat(validate104.errors)
        errors = vErrors.length
      }
    }
    if (data.sellAmount !== undefined) {
      let data10 = data.sellAmount
      if (typeof data10 === "string") {
        if (!pattern10.test(data10)) {
          const err30 = {
            instancePath: instancePath + "/sellAmount",
            schemaPath: "#/anyOf/0/anyOf/0/properties/sellAmount/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err30]
          } else {
            vErrors.push(err30)
          }
          errors++
        }
      } else {
        const err31 = {
          instancePath: instancePath + "/sellAmount",
          schemaPath: "#/anyOf/0/anyOf/0/properties/sellAmount/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err31]
        } else {
          vErrors.push(err31)
        }
        errors++
      }
    }
    if (data.sellToken !== undefined) {
      let data11 = data.sellToken
      if (typeof data11 === "string") {
        if (!pattern1.test(data11)) {
          const err32 = {
            instancePath: instancePath + "/sellToken",
            schemaPath: "#/anyOf/0/anyOf/0/properties/sellToken/pattern",
            keyword: "pattern",
            params: { pattern: "^0x[a-fA-F0-9]{40}$" },
            message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err32]
          } else {
            vErrors.push(err32)
          }
          errors++
        }
      } else {
        const err33 = {
          instancePath: instancePath + "/sellToken",
          schemaPath: "#/anyOf/0/anyOf/0/properties/sellToken/type",
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
    if (data.tokenMetadata !== undefined) {
      if (
        !validate108(data.tokenMetadata, {
          instancePath: instancePath + "/tokenMetadata",
          parentData: data,
          parentDataProperty: "tokenMetadata",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate108.errors
            : vErrors.concat(validate108.errors)
        errors = vErrors.length
      }
    }
    if (data.totalNetworkFee !== undefined) {
      let data13 = data.totalNetworkFee
      if (typeof data13 !== "string" && data13 !== null) {
        const err34 = {
          instancePath: instancePath + "/totalNetworkFee",
          schemaPath: "#/anyOf/0/anyOf/0/properties/totalNetworkFee/type",
          keyword: "type",
          params: {
            type: schema36.anyOf[0].anyOf[0].properties.totalNetworkFee.type,
          },
          message: "must be string,null",
        }
        if (vErrors === null) {
          vErrors = [err34]
        } else {
          vErrors.push(err34)
        }
        errors++
      }
      if (typeof data13 === "string") {
        if (!pattern10.test(data13)) {
          const err35 = {
            instancePath: instancePath + "/totalNetworkFee",
            schemaPath: "#/anyOf/0/anyOf/0/properties/totalNetworkFee/pattern",
            keyword: "pattern",
            params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
            message:
              'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
          }
          if (vErrors === null) {
            vErrors = [err35]
          } else {
            vErrors.push(err35)
          }
          errors++
        }
      }
    }
    if (data.zid !== undefined) {
      if (typeof data.zid !== "string") {
        const err36 = {
          instancePath: instancePath + "/zid",
          schemaPath: "#/anyOf/0/anyOf/0/properties/zid/type",
          keyword: "type",
          params: { type: "string" },
          message: "must be string",
        }
        if (vErrors === null) {
          vErrors = [err36]
        } else {
          vErrors.push(err36)
        }
        errors++
      }
    }
    if (data.transaction !== undefined) {
      if (
        !validate112(data.transaction, {
          instancePath: instancePath + "/transaction",
          parentData: data,
          parentDataProperty: "transaction",
          rootData,
        })
      ) {
        vErrors =
          vErrors === null
            ? validate112.errors
            : vErrors.concat(validate112.errors)
        errors = vErrors.length
      }
    }
  } else {
    const err37 = {
      instancePath,
      schemaPath: "#/anyOf/0/anyOf/0/type",
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
  var _valid1 = _errs3 === errors
  valid1 = valid1 || _valid1
  if (!valid1) {
    const _errs32 = errors
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.allowanceTarget === undefined) {
        const err38 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "allowanceTarget" },
          message: "must have required property '" + "allowanceTarget" + "'",
        }
        if (vErrors === null) {
          vErrors = [err38]
        } else {
          vErrors.push(err38)
        }
        errors++
      }
      if (data.blockNumber === undefined) {
        const err39 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "blockNumber" },
          message: "must have required property '" + "blockNumber" + "'",
        }
        if (vErrors === null) {
          vErrors = [err39]
        } else {
          vErrors.push(err39)
        }
        errors++
      }
      if (data.buyAmount === undefined) {
        const err40 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "buyAmount" },
          message: "must have required property '" + "buyAmount" + "'",
        }
        if (vErrors === null) {
          vErrors = [err40]
        } else {
          vErrors.push(err40)
        }
        errors++
      }
      if (data.buyToken === undefined) {
        const err41 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "buyToken" },
          message: "must have required property '" + "buyToken" + "'",
        }
        if (vErrors === null) {
          vErrors = [err41]
        } else {
          vErrors.push(err41)
        }
        errors++
      }
      if (data.estimatedNetSellAmount === undefined) {
        const err42 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "estimatedNetSellAmount" },
          message:
            "must have required property '" + "estimatedNetSellAmount" + "'",
        }
        if (vErrors === null) {
          vErrors = [err42]
        } else {
          vErrors.push(err42)
        }
        errors++
      }
      if (data.fees === undefined) {
        const err43 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "fees" },
          message: "must have required property '" + "fees" + "'",
        }
        if (vErrors === null) {
          vErrors = [err43]
        } else {
          vErrors.push(err43)
        }
        errors++
      }
      if (data.issues === undefined) {
        const err44 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "issues" },
          message: "must have required property '" + "issues" + "'",
        }
        if (vErrors === null) {
          vErrors = [err44]
        } else {
          vErrors.push(err44)
        }
        errors++
      }
      if (data.liquidityAvailable === undefined) {
        const err45 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "liquidityAvailable" },
          message: "must have required property '" + "liquidityAvailable" + "'",
        }
        if (vErrors === null) {
          vErrors = [err45]
        } else {
          vErrors.push(err45)
        }
        errors++
      }
      if (data.mode === undefined) {
        const err46 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "mode" },
          message: "must have required property '" + "mode" + "'",
        }
        if (vErrors === null) {
          vErrors = [err46]
        } else {
          vErrors.push(err46)
        }
        errors++
      }
      if (data.routes === undefined) {
        const err47 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "routes" },
          message: "must have required property '" + "routes" + "'",
        }
        if (vErrors === null) {
          vErrors = [err47]
        } else {
          vErrors.push(err47)
        }
        errors++
      }
      if (data.maxSellAmount === undefined) {
        const err48 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "maxSellAmount" },
          message: "must have required property '" + "maxSellAmount" + "'",
        }
        if (vErrors === null) {
          vErrors = [err48]
        } else {
          vErrors.push(err48)
        }
        errors++
      }
      if (data.sellToken === undefined) {
        const err49 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "sellToken" },
          message: "must have required property '" + "sellToken" + "'",
        }
        if (vErrors === null) {
          vErrors = [err49]
        } else {
          vErrors.push(err49)
        }
        errors++
      }
      if (data.tokenMetadata === undefined) {
        const err50 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "tokenMetadata" },
          message: "must have required property '" + "tokenMetadata" + "'",
        }
        if (vErrors === null) {
          vErrors = [err50]
        } else {
          vErrors.push(err50)
        }
        errors++
      }
      if (data.totalNetworkFee === undefined) {
        const err51 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "totalNetworkFee" },
          message: "must have required property '" + "totalNetworkFee" + "'",
        }
        if (vErrors === null) {
          vErrors = [err51]
        } else {
          vErrors.push(err51)
        }
        errors++
      }
      if (data.zid === undefined) {
        const err52 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "zid" },
          message: "must have required property '" + "zid" + "'",
        }
        if (vErrors === null) {
          vErrors = [err52]
        } else {
          vErrors.push(err52)
        }
        errors++
      }
      if (data.transaction === undefined) {
        const err53 = {
          instancePath,
          schemaPath: "#/anyOf/0/anyOf/1/required",
          keyword: "required",
          params: { missingProperty: "transaction" },
          message: "must have required property '" + "transaction" + "'",
        }
        if (vErrors === null) {
          vErrors = [err53]
        } else {
          vErrors.push(err53)
        }
        errors++
      }
      if (data.allowanceTarget !== undefined) {
        let data16 = data.allowanceTarget
        if (typeof data16 !== "string" && data16 !== null) {
          const err54 = {
            instancePath: instancePath + "/allowanceTarget",
            schemaPath: "#/anyOf/0/anyOf/1/properties/allowanceTarget/type",
            keyword: "type",
            params: {
              type: schema36.anyOf[0].anyOf[1].properties.allowanceTarget.type,
            },
            message: "must be string,null",
          }
          if (vErrors === null) {
            vErrors = [err54]
          } else {
            vErrors.push(err54)
          }
          errors++
        }
        if (typeof data16 === "string") {
          if (!pattern1.test(data16)) {
            const err55 = {
              instancePath: instancePath + "/allowanceTarget",
              schemaPath:
                "#/anyOf/0/anyOf/1/properties/allowanceTarget/pattern",
              keyword: "pattern",
              params: { pattern: "^0x[a-fA-F0-9]{40}$" },
              message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err55]
            } else {
              vErrors.push(err55)
            }
            errors++
          }
        }
      }
      if (data.blockNumber !== undefined) {
        let data17 = data.blockNumber
        if (typeof data17 === "string") {
          if (!pattern10.test(data17)) {
            const err56 = {
              instancePath: instancePath + "/blockNumber",
              schemaPath: "#/anyOf/0/anyOf/1/properties/blockNumber/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err56]
            } else {
              vErrors.push(err56)
            }
            errors++
          }
        } else {
          const err57 = {
            instancePath: instancePath + "/blockNumber",
            schemaPath: "#/anyOf/0/anyOf/1/properties/blockNumber/type",
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
      if (data.buyAmount !== undefined) {
        let data18 = data.buyAmount
        if (typeof data18 === "string") {
          if (!pattern10.test(data18)) {
            const err58 = {
              instancePath: instancePath + "/buyAmount",
              schemaPath: "#/anyOf/0/anyOf/1/properties/buyAmount/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err58]
            } else {
              vErrors.push(err58)
            }
            errors++
          }
        } else {
          const err59 = {
            instancePath: instancePath + "/buyAmount",
            schemaPath: "#/anyOf/0/anyOf/1/properties/buyAmount/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
          }
          if (vErrors === null) {
            vErrors = [err59]
          } else {
            vErrors.push(err59)
          }
          errors++
        }
      }
      if (data.buyToken !== undefined) {
        let data19 = data.buyToken
        if (typeof data19 === "string") {
          if (!pattern1.test(data19)) {
            const err60 = {
              instancePath: instancePath + "/buyToken",
              schemaPath: "#/anyOf/0/anyOf/1/properties/buyToken/pattern",
              keyword: "pattern",
              params: { pattern: "^0x[a-fA-F0-9]{40}$" },
              message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err60]
            } else {
              vErrors.push(err60)
            }
            errors++
          }
        } else {
          const err61 = {
            instancePath: instancePath + "/buyToken",
            schemaPath: "#/anyOf/0/anyOf/1/properties/buyToken/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
          }
          if (vErrors === null) {
            vErrors = [err61]
          } else {
            vErrors.push(err61)
          }
          errors++
        }
      }
      if (data.estimatedNetSellAmount !== undefined) {
        let data20 = data.estimatedNetSellAmount
        if (typeof data20 === "string") {
          if (!pattern10.test(data20)) {
            const err62 = {
              instancePath: instancePath + "/estimatedNetSellAmount",
              schemaPath:
                "#/anyOf/0/anyOf/1/properties/estimatedNetSellAmount/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err62]
            } else {
              vErrors.push(err62)
            }
            errors++
          }
        } else {
          const err63 = {
            instancePath: instancePath + "/estimatedNetSellAmount",
            schemaPath:
              "#/anyOf/0/anyOf/1/properties/estimatedNetSellAmount/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
          }
          if (vErrors === null) {
            vErrors = [err63]
          } else {
            vErrors.push(err63)
          }
          errors++
        }
      }
      if (data.fees !== undefined) {
        if (
          !validate114(data.fees, {
            instancePath: instancePath + "/fees",
            parentData: data,
            parentDataProperty: "fees",
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate114.errors
              : vErrors.concat(validate114.errors)
          errors = vErrors.length
        }
      }
      if (data.issues !== undefined) {
        if (
          !validate100(data.issues, {
            instancePath: instancePath + "/issues",
            parentData: data,
            parentDataProperty: "issues",
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate100.errors
              : vErrors.concat(validate100.errors)
          errors = vErrors.length
        }
      }
      if (data.liquidityAvailable !== undefined) {
        let data23 = data.liquidityAvailable
        if (typeof data23 !== "boolean") {
          const err64 = {
            instancePath: instancePath + "/liquidityAvailable",
            schemaPath: "#/anyOf/0/anyOf/1/properties/liquidityAvailable/type",
            keyword: "type",
            params: { type: "boolean" },
            message: "must be boolean",
          }
          if (vErrors === null) {
            vErrors = [err64]
          } else {
            vErrors.push(err64)
          }
          errors++
        }
        if (!(data23 === true)) {
          const err65 = {
            instancePath: instancePath + "/liquidityAvailable",
            schemaPath: "#/anyOf/0/anyOf/1/properties/liquidityAvailable/enum",
            keyword: "enum",
            params: {
              allowedValues:
                schema36.anyOf[0].anyOf[1].properties.liquidityAvailable.enum,
            },
            message: "must be equal to one of the allowed values",
          }
          if (vErrors === null) {
            vErrors = [err65]
          } else {
            vErrors.push(err65)
          }
          errors++
        }
      }
      if (data.mode !== undefined) {
        let data24 = data.mode
        if (typeof data24 !== "string") {
          const err66 = {
            instancePath: instancePath + "/mode",
            schemaPath: "#/anyOf/0/anyOf/1/properties/mode/type",
            keyword: "type",
            params: { type: "string" },
            message: "must be string",
          }
          if (vErrors === null) {
            vErrors = [err66]
          } else {
            vErrors.push(err66)
          }
          errors++
        }
        if (!(data24 === "exact-out")) {
          const err67 = {
            instancePath: instancePath + "/mode",
            schemaPath: "#/anyOf/0/anyOf/1/properties/mode/enum",
            keyword: "enum",
            params: {
              allowedValues: schema36.anyOf[0].anyOf[1].properties.mode.enum,
            },
            message: "must be equal to one of the allowed values",
          }
          if (vErrors === null) {
            vErrors = [err67]
          } else {
            vErrors.push(err67)
          }
          errors++
        }
      }
      if (data.routes !== undefined) {
        if (
          !validate120(data.routes, {
            instancePath: instancePath + "/routes",
            parentData: data,
            parentDataProperty: "routes",
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate120.errors
              : vErrors.concat(validate120.errors)
          errors = vErrors.length
        }
      }
      if (data.maxSellAmount !== undefined) {
        let data26 = data.maxSellAmount
        if (typeof data26 === "string") {
          if (!pattern10.test(data26)) {
            const err68 = {
              instancePath: instancePath + "/maxSellAmount",
              schemaPath: "#/anyOf/0/anyOf/1/properties/maxSellAmount/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err68]
            } else {
              vErrors.push(err68)
            }
            errors++
          }
        } else {
          const err69 = {
            instancePath: instancePath + "/maxSellAmount",
            schemaPath: "#/anyOf/0/anyOf/1/properties/maxSellAmount/type",
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
      }
      if (data.sellToken !== undefined) {
        let data27 = data.sellToken
        if (typeof data27 === "string") {
          if (!pattern1.test(data27)) {
            const err70 = {
              instancePath: instancePath + "/sellToken",
              schemaPath: "#/anyOf/0/anyOf/1/properties/sellToken/pattern",
              keyword: "pattern",
              params: { pattern: "^0x[a-fA-F0-9]{40}$" },
              message: 'must match pattern "' + "^0x[a-fA-F0-9]{40}$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err70]
            } else {
              vErrors.push(err70)
            }
            errors++
          }
        } else {
          const err71 = {
            instancePath: instancePath + "/sellToken",
            schemaPath: "#/anyOf/0/anyOf/1/properties/sellToken/type",
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
      }
      if (data.tokenMetadata !== undefined) {
        if (
          !validate108(data.tokenMetadata, {
            instancePath: instancePath + "/tokenMetadata",
            parentData: data,
            parentDataProperty: "tokenMetadata",
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate108.errors
              : vErrors.concat(validate108.errors)
          errors = vErrors.length
        }
      }
      if (data.totalNetworkFee !== undefined) {
        let data29 = data.totalNetworkFee
        if (typeof data29 !== "string" && data29 !== null) {
          const err72 = {
            instancePath: instancePath + "/totalNetworkFee",
            schemaPath: "#/anyOf/0/anyOf/1/properties/totalNetworkFee/type",
            keyword: "type",
            params: {
              type: schema36.anyOf[0].anyOf[1].properties.totalNetworkFee.type,
            },
            message: "must be string,null",
          }
          if (vErrors === null) {
            vErrors = [err72]
          } else {
            vErrors.push(err72)
          }
          errors++
        }
        if (typeof data29 === "string") {
          if (!pattern10.test(data29)) {
            const err73 = {
              instancePath: instancePath + "/totalNetworkFee",
              schemaPath:
                "#/anyOf/0/anyOf/1/properties/totalNetworkFee/pattern",
              keyword: "pattern",
              params: { pattern: "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" },
              message:
                'must match pattern "' + "^[-+]?(0|[1-9]\\d*)(\\.\\d+)?$" + '"',
            }
            if (vErrors === null) {
              vErrors = [err73]
            } else {
              vErrors.push(err73)
            }
            errors++
          }
        }
      }
      if (data.zid !== undefined) {
        if (typeof data.zid !== "string") {
          const err74 = {
            instancePath: instancePath + "/zid",
            schemaPath: "#/anyOf/0/anyOf/1/properties/zid/type",
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
      if (data.transaction !== undefined) {
        if (
          !validate112(data.transaction, {
            instancePath: instancePath + "/transaction",
            parentData: data,
            parentDataProperty: "transaction",
            rootData,
          })
        ) {
          vErrors =
            vErrors === null
              ? validate112.errors
              : vErrors.concat(validate112.errors)
          errors = vErrors.length
        }
      }
    } else {
      const err75 = {
        instancePath,
        schemaPath: "#/anyOf/0/anyOf/1/type",
        keyword: "type",
        params: { type: "object" },
        message: "must be object",
      }
      if (vErrors === null) {
        vErrors = [err75]
      } else {
        vErrors.push(err75)
      }
      errors++
    }
    var _valid1 = _errs32 === errors
    valid1 = valid1 || _valid1
  }
  if (!valid1) {
    const err76 = {
      instancePath,
      schemaPath: "#/anyOf/0/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err76]
    } else {
      vErrors.push(err76)
    }
    errors++
  } else {
    errors = _errs2
    if (vErrors !== null) {
      if (_errs2) {
        vErrors.length = _errs2
      } else {
        vErrors = null
      }
    }
  }
  var _valid0 = _errs1 === errors
  valid0 = valid0 || _valid0
  if (!valid0) {
    const _errs61 = errors
    if (
      !validate126(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
      })
    ) {
      vErrors =
        vErrors === null
          ? validate126.errors
          : vErrors.concat(validate126.errors)
      errors = vErrors.length
    }
    var _valid0 = _errs61 === errors
    valid0 = valid0 || _valid0
  }
  if (!valid0) {
    const err77 = {
      instancePath,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf",
    }
    if (vErrors === null) {
      vErrors = [err77]
    } else {
      vErrors.push(err77)
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
  validate93.errors = vErrors
  return errors === 0
}
