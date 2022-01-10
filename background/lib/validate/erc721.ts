import { JTDDataType, ValidateFunction } from "ajv/dist/jtd"

/* eslint-disable @typescript-eslint/no-var-requires, global-require */
export const isValidMetadata: ValidateFunction<
  JTDDataType<typeof metadataJTD>
> = require("./jtd-validators")["erc721-metadata.jtd.schema.json"]
/* eslint-enable @typescript-eslint/no-var-requires, global-require */

export const metadataJTD = {
  optionalProperties: {
    name: { type: "string" },
    description: { type: "string" },
    image: { type: "string" },
    title: { type: "string" }, // not found in 721, but seen in the wild
    external_url: { type: "string" }, // not found in 721, but seen in the wild
  },
  additionalProperties: true,
} as const
