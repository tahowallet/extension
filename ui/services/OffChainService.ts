import {
  OffChainAccount,
  OffChainAccountCredentials,
  OffChainProvider,
} from "@tallyho/tally-background/accounts"
import { OffChainAsset } from "@tallyho/tally-background/assets"

// eslint-disable-next-line import/prefer-default-export
export class OffChainService {
  static login({
    provider,
    credentials,
  }: {
    provider: OffChainProvider
    credentials: OffChainAccountCredentials
  }): Promise<OffChainAccount> {
    const apiResponsePromise = fetch(
      `https://mocki.io/v1/d14997dd-ea1d-496a-b3ca-f6576201a9f3`,
      {
        // const apiResponsePromise = fetch(`${provider}/api/v1/login`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Referrer: document.location.origin,
        },
      }
    ).then((response) => {
      try {
        return response.json()
      } catch (e) {
        return response
      }
    })

    return apiResponsePromise
  }

  static assets({ userId = "" }): Promise<{ assets: OffChainAsset[] }> {
    const token = localStorage.getItem("token")
    const apiResponsePromise = fetch(
      `https://mocki.io/v1/6f412ee4-2875-4764-bbdc-eefada21ec2a`,
      {
        // const apiResponsePromise = fetch(`http://192.168.1.120:8000/api/v1/balances?user_id=${userId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Referrer: document.location.origin,
          Authorization: `JWT ${token}`,
        },
      }
    ).then((response) => {
      try {
        return response.json()
      } catch (e) {
        return response
      }
    })

    return apiResponsePromise
  }

  static trade({
    accountId = "123456",
    chainId = 1,
    tokenAddress = "abcde",
    sourceAmount = 1,
    destinationAddress = "myAddress",
  }: {
    accountId?: string
    sourceCurrencySymbol?: string
    chainId?: number
    tokenAddress?: string
    sourceAmount?: number
    destinationAddress?: string
  }): Promise<any> {
    const token = localStorage.getItem("token")

    // const apiResponsePromise = fetch("http://localhost:8000/api/v1/transfer", {
    //   method: "POST",
    //   headers: {
    //     Accept: "application/json",
    //     "Content-Type": "application/json",
    //     Referrer: document.location.origin,
    //     Authorization: `JWT ${token}`,
    //   },
    // }).then((response) => {
    //   try {
    //     return response.json()
    //   } catch (e) {
    //     return e
    //   }
    // })
    // return apiResponsePromise

    // BUG: the above request is not returning a response properly, console is not logging out anything either
    // Thus mocking the response for now
    const response = new Promise(() => ({
      transactionHash:
        "0xd82da596bb57caf12be84359d0a3a53b0fbae91a519400c92f598edc1a2c60a2",
    }))

    return response
  }
}
