// It's necessary to have an object w/ the function on it so we can use spyOn
import * as ethers from "@ethersproject/web" // << THIS IS THE IMPORTANT TRICK

import logger from "../lib/logger"
import { ETH, USD } from "../constants"
import { getPrices } from "../lib/prices"
import { isValidCoinGeckoPriceResponse } from "../lib/validate"

const dateNow = 1634911514834

describe("lib/prices.ts", () => {
  beforeAll(() => {
    // this is implementation detail, date should come through IoC
    jest.spyOn(Date, "now").mockReturnValue(dateNow)

    // just to keep the output nice and tidy
    jest.spyOn(logger, "warn").mockImplementation()
  })
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
  describe("getPrices", () => {
    beforeEach(() => {
      // Important to clean up the internal mock variables between tests
      jest.clearAllMocks()
    })
    it("should return correct price if the data exist", async () => {
      const fetchJsonResponse = {
        ethereum: {
          usd: 3836.53,
          last_updated_at: 1634672101,
        },
        bitcoin: {
          usd: 63909,
          last_updated_at: 1634672139,
        },
      }

      const getPricesResponse = [
        {
          amounts: [639090000000000n, 100000000n],
          pair: [
            { decimals: 10, name: "United States Dollar", symbol: "USD" },
            ETH,
          ],
          time: dateNow,
        },
        {
          amounts: [38365300000000n, 1000000000000000000n],
          pair: [
            { decimals: 10, name: "United States Dollar", symbol: "USD" },
            ETH,
          ],
          time: dateNow,
        },
      ]

      jest.spyOn(ethers, "fetchJson").mockResolvedValue(fetchJsonResponse)

      await expect(getPrices([ETH], [USD])).resolves.toEqual(getPricesResponse)
      expect(ethers.fetchJson).toHaveBeenCalledTimes(1)
    })
    it("should filter out invalid pairs if the data DOESN'T exist", async () => {
      const currencies = [
        USD,
        {
          name: "Fake Currency",
          symbol: "FAK",
          sign: "F$",
          decimals: 10,
          rate: 1_200_000_0000n,
        },
      ]

      const FAKE_COIN = {
        name: "FakeCoin",
        symbol: "qwerqwer",
        decimals: 18,
        metadata: {
          coinGeckoID: "qwerqwer",
          tokenLists: [],
          websiteURL: "https://www.youtube.com/watch?v=xvFZjo5PgG0",
        },
      }
      const fetchJsonResponse = {
        ethereum: {
          usd: 3836.53,
          last_updated_at: 1634672101,
        },
      }
      const getPricesResponse = [
        {
          amounts: [38365300000000n, 1000000000000000000n],
          pair: [
            { decimals: 10, name: "United States Dollar", symbol: "USD" },
            ETH,
          ],
          time: dateNow,
        },
      ]

      jest.spyOn(ethers, "fetchJson").mockResolvedValue(fetchJsonResponse)
      await expect(getPrices([ETH, FAKE_COIN], currencies)).resolves.toEqual(
        getPricesResponse,
      )
      expect(ethers.fetchJson).toHaveBeenCalledTimes(1)
    })
    it("should return [] if the api response does not fit the schema", async () => {
      const response = "Na na na na na na na na na na na na ... BATMAN!"

      jest.spyOn(ethers, "fetchJson").mockResolvedValue(response)

      await expect(getPrices([ETH], [USD])).resolves.toEqual([])
      expect(ethers.fetchJson).toHaveBeenCalledTimes(1)
    })
  })
})
