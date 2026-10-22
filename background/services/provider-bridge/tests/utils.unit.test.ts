import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
} from "@tallyho/provider-bridge-shared"
import {
  handleRPCErrorResponse,
  validateAddEthereumChainParameter,
} from "../utils"

describe("Utils", () => {
  describe("handleRPCErrorResponse", () => {
    it("should return a provider Rpc error", () => {
      const response = handleRPCErrorResponse(
        new EIP1193Error(EIP1193_ERROR_CODES.disconnected),
      )

      expect(response).toBe(EIP1193_ERROR_CODES.disconnected)
    })

    it("should return a custom error when a message is in the body", () => {
      const error = {
        body: JSON.stringify({
          error: {
            message: "Custom error",
          },
        }),
      }
      const response = handleRPCErrorResponse(error)

      expect(response).toStrictEqual({ code: 4001, message: "Custom error" })
    })

    it("should return a custom error when a message is nested in the error object", () => {
      const error = {
        error: {
          body: JSON.stringify({
            error: {
              message: "Custom error",
            },
          }),
        },
      }
      const response = handleRPCErrorResponse(error)

      expect(response).toStrictEqual({ code: 4001, message: "Custom error" })
    })

    it("should return a default message when is not possible to handle the error", () => {
      const error = {
        error: {
          body: {
            error: {
              message: "Custom error",
            },
          },
        },
      }
      const response = handleRPCErrorResponse(error)

      expect(response).toBe(EIP1193_ERROR_CODES.userRejectedRequest)
    })
  })

  describe("validateAddEthereumChainParameter", () => {
    const baseParameter = {
      chainId: "0x1b6e6",
      chainName: "Hostile Chain",
      nativeCurrency: { name: "Hostile", symbol: "HOSTILE", decimals: 18 },
      rpcUrls: ["https://rpc.hostile.example"],
      blockExplorerUrls: ["https://explorer.hostile.example"],
    }

    const iconUrlFor = (iconUrls?: string[]) =>
      validateAddEthereumChainParameter({ ...baseParameter, iconUrls }).iconUrl

    it("accepts an http(s) icon URL", () => {
      expect(iconUrlFor(["https://hostile.example/icon.png"])).toEqual(
        "https://hostile.example/icon.png",
      )
      expect(iconUrlFor(["http://hostile.example/icon.png"])).toEqual(
        "http://hostile.example/icon.png",
      )
    })

    it("takes only the first icon URL", () => {
      expect(
        iconUrlFor([
          "https://hostile.example/first.png",
          "https://hostile.example/second.png",
        ]),
      ).toEqual("https://hostile.example/first.png")
    })

    it("drops an icon URL that is missing, empty, or not a string", () => {
      expect(iconUrlFor(undefined)).toBeUndefined()
      expect(iconUrlFor([])).toBeUndefined()
      expect(iconUrlFor([""])).toBeUndefined()
      expect(iconUrlFor([undefined as unknown as string])).toBeUndefined()
    })

    it("drops icon URLs whose scheme is not http(s)", () => {
      // Assembled rather than written literally so the lint rule that bans
      // script URLs in source does not fire on a string that only ever exists
      // as hostile test input.
      expect(iconUrlFor([`java${"script"}:alert(1)`])).toBeUndefined()
      expect(iconUrlFor(["data:image/svg+xml,<svg/>"])).toBeUndefined()
      expect(iconUrlFor(["file:///etc/passwd"])).toBeUndefined()
      expect(iconUrlFor(["chrome-extension://abcdef/icon.png"])).toBeUndefined()
    })

    it("drops a payload crafted to break out of a CSS url() value", () => {
      // The shape of a dapp payload aimed at injecting declarations into
      // wallet UI stylesheets by closing the surrounding `url("…")` value.
      expect(
        iconUrlFor(['x");} .confirm_button{visibility:hidden}/*']),
      ).toBeUndefined()
      expect(
        iconUrlFor(['./icon.png");} .confirm_button{display:none}/*']),
      ).toBeUndefined()
    })

    it("normalizes an accepted icon URL so no raw delimiters survive", () => {
      const iconUrl = iconUrlFor([
        'https://hostile.example/a");} .confirm_button{display:none}/*',
      ])

      expect(iconUrl).toBeDefined()
      expect(iconUrl).not.toContain('"')
      expect(iconUrl).not.toContain("{")
      expect(iconUrl).not.toContain("}")
    })
  })
})
