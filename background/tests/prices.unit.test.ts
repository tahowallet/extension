import { describe, it, expect } from "bun:test"
import { isValidCoinGeckoPriceResponse } from "../lib/validate"

describe("lib/prices.ts", () => {
  describe("CoinGecko Price response validation", () => {
    it("passes for correct simple price response", () => {
      const apiResponse = {
        ethereum: {
          usd: 3832.26,
          last_updated_at: 1634671650,
        },
      }

      expect(isValidCoinGeckoPriceResponse(apiResponse)).toBeTruthy()
      expect(isValidCoinGeckoPriceResponse.errors).toBeNull()
    })

    it("passes for correct complex price response", () => {
      const apiResponse = {
        ethereum: {
          usd: 3836.53,
          eur: 3297.36,
          cny: 24487,
          last_updated_at: 1634672101,
        },
        bitcoin: {
          usd: 63909,
          eur: 54928,
          cny: 407908,
          last_updated_at: 1634672139,
        },
      }

      expect(isValidCoinGeckoPriceResponse(apiResponse)).toBeTruthy()
      expect(isValidCoinGeckoPriceResponse.errors).toBeNull()
    })

    it("fails if required prop is missing w/ the correct error", () => {
      const apiResponse = {
        ethereum: {
          usd: 3832.26,
        },
      }

      const error = [
        {
          instancePath: "/ethereum",
          keyword: "required",
          message: "must have required property 'last_updated_at'",
          params: { missingProperty: "last_updated_at" },
          schemaPath: "#/additionalProperties/required",
        },
      ]

      const validationResult = isValidCoinGeckoPriceResponse(apiResponse)

      expect(isValidCoinGeckoPriceResponse.errors).toMatchObject(error)
      expect(validationResult).toBeFalsy()
    })

    it("fails if required prop is wrong type", () => {
      const apiResponse = {
        ethereum: {
          usd: 3832.26,
          last_updated_at: "1634672139",
        },
      }

      const error = [
        {
          instancePath: "/ethereum/last_updated_at",
          keyword: "type",
          message: "must be number",
          params: { type: "number" },
          schemaPath: "#/additionalProperties/properties/last_updated_at/type",
        },
      ]

      const validationResult = isValidCoinGeckoPriceResponse(apiResponse)

      expect(isValidCoinGeckoPriceResponse.errors).toMatchObject(error)
      expect(validationResult).toBeFalsy()
    })

    it("fails if additional prop is wrong type", () => {
      const apiResponse = {
        ethereum: {
          usd: "3832.26",
          last_updated_at: "1634672139",
        },
      }

      const error = [
        {
          instancePath: "/ethereum/usd",
          keyword: "type",
          message: "must be number",
          params: { type: "number" },
          schemaPath: "#/additionalProperties/additionalProperties/type",
        },
        {
          instancePath: "/ethereum/last_updated_at",
          keyword: "type",
          message: "must be number",
          params: {
            type: "number",
          },
          schemaPath: "#/additionalProperties/properties/last_updated_at/type",
        },
      ]

      const validationResult = isValidCoinGeckoPriceResponse(apiResponse)

      expect(isValidCoinGeckoPriceResponse.errors).toMatchObject(error)
      expect(validationResult).toBeFalsy()
    })
  })
})
