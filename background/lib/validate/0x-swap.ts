// Derived from docs at https://0x.org/docs/api, alongside
// occasional direct reading of the API code at
// https://github.com/0x-project/0x-api .

/**
 * https://api.0x.org/swap/allowance-holder/price
 */
export const swapPriceJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  oneOf: [
    {
      type: "object",
      properties: {
        liquidityAvailable: {
          const: true,
        },
        allowanceTarget: {
          oneOf: [{ type: "string" }, { type: "null" }],
        },
        blockNumber: {
          type: "string",
        },
        buyAmount: {
          type: "string",
        },
        buyToken: {
          type: "string",
        },
        fees: {
          type: "object",
          properties: {
            integratorFee: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    amount: {
                      type: "string",
                    },
                    token: {
                      type: "string",
                    },
                    type: {
                      const: "volume",
                    },
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
                      amount: {
                        type: "string",
                      },
                      token: {
                        type: "string",
                      },
                      type: {
                        const: "volume",
                      },
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
                    amount: {
                      type: "string",
                    },
                    token: {
                      type: "string",
                    },
                    type: {
                      const: "volume",
                    },
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
                    amount: {
                      type: "string",
                    },
                    token: {
                      type: "string",
                    },
                    type: {
                      const: "gas",
                    },
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
        gas: {
          oneOf: [{ type: "string" }, { type: "null" }],
        },
        gasPrice: {
          type: "string",
        },
        issues: {
          type: "object",
          properties: {
            allowance: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    actual: {
                      type: "string",
                    },
                    spender: {
                      type: "string",
                    },
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
                    token: {
                      type: "string",
                    },
                    actual: {
                      type: "string",
                    },
                    expected: {
                      type: "string",
                    },
                  },
                  required: ["token", "actual", "expected"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            simulationIncomplete: {
              type: "boolean",
            },
            invalidSourcesPassed: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: [
            "allowance",
            "balance",
            "simulationIncomplete",
            "invalidSourcesPassed",
          ],
          additionalProperties: false,
        },
        minBuyAmount: {
          type: "string",
        },
        route: {
          type: "object",
          properties: {
            fills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: {
                    type: "string",
                  },
                  to: {
                    type: "string",
                  },
                  source: {
                    type: "string",
                  },
                  proportionBps: {
                    type: "string",
                  },
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
                  address: {
                    type: "string",
                  },
                  symbol: {
                    type: "string",
                  },
                },
                required: ["address", "symbol"],
                additionalProperties: false,
              },
            },
          },
          required: ["fills", "tokens"],
          additionalProperties: false,
        },
        sellAmount: {
          type: "string",
        },
        sellToken: {
          type: "string",
        },
        tokenMetadata: {
          type: "object",
          properties: {
            buyToken: {
              type: "object",
              properties: {
                buyTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
                sellTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
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
                buyTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
                sellTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
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
        totalNetworkFee: {
          oneOf: [{ type: "string" }, { type: "null" }],
        },
        zid: {
          type: "string",
        },
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
        liquidityAvailable: {
          const: false,
        },
        zid: {
          type: "string",
        },
      },
      required: ["liquidityAvailable", "zid"],
      additionalProperties: false,
    },
  ],
}

/**
 * https://api.0x.org/swap/allowance-holder/quote
 */
export const swapQuoteJSONSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  oneOf: [
    {
      type: "object",
      properties: {
        liquidityAvailable: {
          type: "boolean",
          const: true,
        },
        allowanceTarget: {
          oneOf: [{ type: "string" }, { type: "null" }],
        },
        blockNumber: {
          type: "string",
        },
        buyAmount: {
          type: "string",
        },
        buyToken: {
          type: "string",
        },
        fees: {
          type: "object",
          properties: {
            integratorFee: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    amount: {
                      type: "string",
                    },
                    token: {
                      type: "string",
                    },
                    type: {
                      type: "string",
                      enum: ["volume"],
                    },
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
                      amount: {
                        type: "string",
                      },
                      token: {
                        type: "string",
                      },
                      type: {
                        type: "string",
                        enum: ["volume"],
                      },
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
                    amount: {
                      type: "string",
                    },
                    token: {
                      type: "string",
                    },
                    type: {
                      type: "string",
                      enum: ["volume"],
                    },
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
                    amount: {
                      type: "string",
                    },
                    token: {
                      type: "string",
                    },
                    type: {
                      type: "string",
                      enum: ["gas"],
                    },
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
                    actual: {
                      type: "string",
                    },
                    spender: {
                      type: "string",
                    },
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
                    token: {
                      type: "string",
                    },
                    actual: {
                      type: "string",
                    },
                    expected: {
                      type: "string",
                    },
                  },
                  required: ["token", "actual", "expected"],
                  additionalProperties: false,
                },
                { type: "null" },
              ],
            },
            simulationIncomplete: {
              type: "boolean",
            },
            invalidSourcesPassed: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: [
            "allowance",
            "balance",
            "simulationIncomplete",
            "invalidSourcesPassed",
          ],
          additionalProperties: false,
        },
        minBuyAmount: {
          type: "string",
        },
        route: {
          type: "object",
          properties: {
            fills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: {
                    type: "string",
                  },
                  to: {
                    type: "string",
                  },
                  source: {
                    type: "string",
                  },
                  proportionBps: {
                    type: "string",
                  },
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
                  address: {
                    type: "string",
                  },
                  symbol: {
                    type: "string",
                  },
                },
                required: ["address", "symbol"],
                additionalProperties: false,
              },
            },
          },
          required: ["fills", "tokens"],
          additionalProperties: false,
        },
        sellAmount: {
          type: "string",
        },
        sellToken: {
          type: "string",
        },
        tokenMetadata: {
          type: "object",
          properties: {
            buyToken: {
              type: "object",
              properties: {
                buyTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
                sellTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
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
                buyTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
                sellTaxBps: {
                  oneOf: [{ type: "string" }, { type: "null" }],
                },
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
        totalNetworkFee: {
          oneOf: [{ type: "string" }, { type: "null" }],
        },
        transaction: {
          type: "object",
          properties: {
            to: {
              type: "string",
            },
            data: {
              type: "string",
            },
            gas: {
              oneOf: [{ type: "string" }, { type: "null" }],
            },
            gasPrice: {
              type: "string",
            },
            value: {
              type: "string",
            },
          },
          required: ["to", "data", "gas", "gasPrice", "value"],
          additionalProperties: false,
        },
        zid: {
          type: "string",
        },
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
        liquidityAvailable: {
          type: "boolean",
          const: false,
        },
        zid: {
          type: "string",
        },
      },
      required: ["liquidityAvailable", "zid"],
      additionalProperties: false,
    },
  ],
}
