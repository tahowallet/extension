// It's necessary to have an object w/ the function on it so we can use spyOn
import * as ethers from "@ethersproject/web" // << THIS IS THE IMPORTANT TRICK

import {
  CoingeckoPriceData,
  coingeckoPriceSchema,
  getPrice,
  getPrices,
} from "./prices"
import { jsonSchemaValidatorFor } from "./validation"

import logger from "./logger"
import { BTC, ETH, FIAT_CURRENCIES, USD } from "../constants"
import { CoinGeckoAsset } from "../types"

const dateNow = 1634911514834

beforeAll(() => {
  // this is implementation detail, date should come through IoC
  jest.spyOn(Date, "now").mockReturnValue(dateNow)

  // just to keep the output nice and tidy
  jest.spyOn(logger, "warn").mockImplementation()
})
describe("CoinGecko Price response validation", () => {
  it("passes for correct simple price response", () => {
    const validate =
      jsonSchemaValidatorFor<CoingeckoPriceData>(coingeckoPriceSchema)
    const apiResponse = {
      ethereum: {
        usd: 3832.26,
        last_updated_at: 1634671650,
      },
    }

    expect(validate(apiResponse)).toBeTruthy()
    expect(validate.errors).toBeFalsy()
  })

  it("passes for correct complex price response", () => {
    const validate =
      jsonSchemaValidatorFor<CoingeckoPriceData>(coingeckoPriceSchema)

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

    expect(validate(apiResponse)).toBeTruthy()
    expect(validate.errors).toBeFalsy()
  })

  it("fails if required prop is missing w/ the correct error", () => {
    const validate =
      jsonSchemaValidatorFor<CoingeckoPriceData>(coingeckoPriceSchema)
    const apiResponse = {
      ethereum: {
        usd: 3832.26,
      },
    }

    expect(validate(apiResponse)).toBeFalsy()
    if (!Array.isArray(validate.errors)) return
    expect(validate.errors[0].params.missingProperty).toEqual("last_updated_at")
  })

  it("fails if required prop is wrong type", () => {
    const validate =
      jsonSchemaValidatorFor<CoingeckoPriceData>(coingeckoPriceSchema)
    const apiResponse = {
      ethereum: {
        usd: 3832.26,
        last_updated_at: "1634672139",
      },
    }

    expect(validate(apiResponse)).toBeFalsy()
    if (!Array.isArray(validate.errors)) return
    expect(validate.errors[0].instancePath).toEqual("/ethereum/last_updated_at")
    expect(validate.errors[0].message).toEqual("must be number")
  })

  it("fails if additional prop is wrong type", () => {
    const validate =
      jsonSchemaValidatorFor<CoingeckoPriceData>(coingeckoPriceSchema)
    const apiResponse = {
      ethereum: {
        usd: "3832.26",
        last_updated_at: "1634672139",
      },
    }

    expect(validate(apiResponse)).toBeFalsy()
    if (!Array.isArray(validate.errors)) return
    expect(validate.errors[0].instancePath).toEqual("/ethereum/usd")
    expect(validate.errors[0].message).toEqual("must be number")
  })
})
describe("getPrice", () => {
  beforeEach(() => {
    // Important to clean up the internal mock variables between tests
    jest.clearAllMocks()
  })
  it("should return correct price if the data exist", async () => {
    const response = {
      ethereum: {
        usd: 3832.26,
        last_updated_at: 1634671650,
      },
    }

    jest.spyOn(ethers, "fetchJson").mockResolvedValue(response)
    await expect(getPrice("ethereum", "usd")).resolves.toEqual(
      response.ethereum.usd
    )
    expect(ethers.fetchJson).toHaveBeenCalledTimes(1)
  })
  it("should return null if the data DOESN'T exist", async () => {
    const response = {
      ethereum: {
        last_updated_at: 1634671650,
      },
    }

    jest.spyOn(ethers, "fetchJson").mockResolvedValue(response)
    await expect(getPrice("ethereum", "usd")).resolves.toBeNull()
    expect(ethers.fetchJson).toHaveBeenCalledTimes(1)
  })
  it("should return null if the api response does not fit the schema", async () => {
    const response = "Na na na na na na na na na na na na ... BATMAN!"

    jest.spyOn(ethers, "fetchJson").mockResolvedValue(response)

    await expect(getPrice("ethereum", "usd")).resolves.toBeNull()
    expect(ethers.fetchJson).toHaveBeenCalledTimes(1)
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

    const getPricesResponse = [
      {
        amounts: [639090000000000n, 1n],
        pair: [
          { decimals: 10, name: "United States Dollar", symbol: "USD" },
          {
            decimals: 8,
            metadata: {
              coinGeckoId: "bitcoin",
              tokenLists: [],
              websiteURL: "https://bitcoin.org",
            },
            name: "Bitcoin",
            symbol: "BTC",
          },
        ],
        time: dateNow,
      },
      {
        amounts: [549280000000000n, 1n],
        pair: [
          { decimals: 10, name: "euro", symbol: "EUR" },
          {
            decimals: 8,
            metadata: {
              coinGeckoId: "bitcoin",
              tokenLists: [],
              websiteURL: "https://bitcoin.org",
            },
            name: "Bitcoin",
            symbol: "BTC",
          },
        ],
        time: dateNow,
      },
      {
        amounts: [4079080000000000n, 1n],
        pair: [
          { decimals: 10, name: "renminbi", symbol: "CNY" },
          {
            decimals: 8,
            metadata: {
              coinGeckoId: "bitcoin",
              tokenLists: [],
              websiteURL: "https://bitcoin.org",
            },
            name: "Bitcoin",
            symbol: "BTC",
          },
        ],
        time: dateNow,
      },
      {
        amounts: [38365300000000n, 1n],
        pair: [
          { decimals: 10, name: "United States Dollar", symbol: "USD" },
          {
            decimals: 18,
            metadata: {
              coinGeckoId: "ethereum",
              tokenLists: [],
              websiteURL: "https://ethereum.org",
            },
            name: "Ether",
            symbol: "ETH",
          },
        ],
        time: dateNow,
      },
      {
        amounts: [32973600000000n, 1n],
        pair: [
          { decimals: 10, name: "euro", symbol: "EUR" },
          {
            decimals: 18,
            metadata: {
              coinGeckoId: "ethereum",
              tokenLists: [],
              websiteURL: "https://ethereum.org",
            },
            name: "Ether",
            symbol: "ETH",
          },
        ],
        time: dateNow,
      },
      {
        amounts: [244870000000000n, 1n],
        pair: [
          { decimals: 10, name: "renminbi", symbol: "CNY" },
          {
            decimals: 18,
            metadata: {
              coinGeckoId: "ethereum",
              tokenLists: [],
              websiteURL: "https://ethereum.org",
            },
            name: "Ether",
            symbol: "ETH",
          },
        ],
        time: dateNow,
      },
    ]

    jest.spyOn(ethers, "fetchJson").mockResolvedValue(fetchJsonResponse)

    await expect(
      getPrices([BTC, ETH] as CoinGeckoAsset[], FIAT_CURRENCIES)
    ).resolves.toEqual(getPricesResponse)
    expect(ethers.fetchJson).toHaveBeenCalledTimes(1)
  })
  it("should filter out unvalid pairs if the data DOESN'T exist", async () => {
    const currencies = [
      USD,
      {
        name: "Fake Currency",
        symbol: "FAK",
        decimals: 10,
      },
    ]
    const FAKE_COIN = {
      name: "FakeCoin",
      symbol: "qwerqwer",
      decimals: 18,
      metadata: {
        coinGeckoId: "qwerqwer",
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
        amounts: [38365300000000n, 1n],
        pair: [
          { decimals: 10, name: "United States Dollar", symbol: "USD" },
          {
            decimals: 18,
            metadata: {
              coinGeckoId: "ethereum",
              tokenLists: [],
              websiteURL: "https://ethereum.org",
            },
            name: "Ether",
            symbol: "ETH",
          },
        ],
        time: dateNow,
      },
    ]

    jest.spyOn(ethers, "fetchJson").mockResolvedValue(fetchJsonResponse)
    await expect(
      getPrices([ETH, FAKE_COIN] as CoinGeckoAsset[], currencies)
    ).resolves.toEqual(getPricesResponse)
    expect(ethers.fetchJson).toHaveBeenCalledTimes(1)
  })
  it("should return [] if the api response does not fit the schema", async () => {
    const response = "Na na na na na na na na na na na na ... BATMAN!"

    jest.spyOn(ethers, "fetchJson").mockResolvedValue(response)

    await expect(
      getPrices([ETH] as CoinGeckoAsset[], FIAT_CURRENCIES)
    ).resolves.toEqual([])
    expect(ethers.fetchJson).toHaveBeenCalledTimes(1)
  })
})
