import { CoingeckoPriceData, coingeckoPriceSchema } from "./prices"
import { jsonSchemaValidatorFor } from "./validation"

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
