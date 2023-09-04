import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
} from "@tallyho/provider-bridge-shared"
import { handleRPCErrorResponse } from "../utils"

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
})
