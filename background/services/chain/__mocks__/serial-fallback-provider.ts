/* eslint-disable class-methods-use-this */
import { BigNumber } from "ethers"
import { Block, FeeData } from "@ethersproject/abstract-provider"
import { makeEthersBlock, makeEthersFeeData } from "../../../tests/factories"
import type SerialFallbackProvider from "../serial-fallback-provider"

export default class MockSerialFallbackProvider
  implements Partial<SerialFallbackProvider>
{
  async getBlock(): Promise<Block> {
    return makeEthersBlock()
  }

  async getBlockNumber(): Promise<number> {
    return 1
  }

  async getBalance(): Promise<BigNumber> {
    return BigNumber.from(100)
  }

  async getFeeData(): Promise<FeeData> {
    return makeEthersFeeData()
  }

  async getCode(): Promise<string> {
    return "false"
  }

  async subscribeFullPendingTransactions(): Promise<void> {
    return Promise.resolve()
  }
}

export const makeSerialFallbackProvider = (): Partial<SerialFallbackProvider> =>
  new MockSerialFallbackProvider()
