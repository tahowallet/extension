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

export default metadataJTD
