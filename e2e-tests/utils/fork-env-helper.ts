import { BrowserContext } from "@playwright/test"
import { BigNumber, utils } from "ethers"
import { FunctionFragment, Interface } from "ethers/lib/utils"

export default class ForkEnvHelper {
  url = "http://127.0.0.1:8545"

  #request_id = 0

  defaultAccounts = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
  ]

  emulatedAccount: string | null = null

  constructor(private context: BrowserContext) {}

  async send(method: string, params: unknown[]) {
    this.#request_id += 1

    const payload = JSON.stringify({
      id: this.#request_id,
      jsonrpc: "2.0",
      method,
      params,
    })

    return this.context.request
      .post(this.url, {
        data: payload,
        headers: { "Content-Type": "application/json" },
      })
      .then((resp) => resp.json())
  }

  impersonateAccount(addr: string) {
    this.emulatedAccount = addr
    return this.send("hardhat_impersonateAccount", [addr])
  }

  stopImpersonating(addr: string) {
    this.emulatedAccount = null
    return this.send("hardhat_stopImpersonatingAccount", [addr])
  }

  setBalance(address: string, amount: BigNumber) {
    return this.send("hardhat_setBalance", [address, amount.toHexString()])
  }

  async getERC20Balance(contract: string, address: string): Promise<BigNumber> {
    const iface = new Interface([
      "function balanceOf(address addr) view returns (uint256)",
    ])

    const amount = await this.send("eth_call", [
      {
        to: contract,
        data: iface.encodeFunctionData("balanceOf", [address]),
      },
    ])

    return iface.decodeFunctionResult("balanceOf", amount.result)[0]
  }

  async emptyERC20Balance(contract: string, address: string) {
    const balance = await this.getERC20Balance(contract, address)
    if (balance.gt(0n)) {
      await this.impersonateAccount(address)
      await this.transferERC20(contract, this.defaultAccounts[0], balance)
      await this.stopImpersonating(address)
    }
  }

  transferERC20(
    contract: string,
    addressTo: string,
    amount: string | BigNumber | bigint,
    decimals = 18,
  ) {
    if (this.emulatedAccount === null) {
      throw new Error("Must call impersonateAccount first")
    }

    const fragment = FunctionFragment.from("transfer(address to, uint amount)")

    const iface = new Interface([fragment])

    const transferValue =
      typeof amount === "string" ? utils.parseUnits(amount, decimals) : amount

    const data = iface.encodeFunctionData("transfer", [
      addressTo,
      transferValue,
    ])

    return this.send("eth_sendTransaction", [
      { from: this.emulatedAccount, to: contract, data },
    ])
  }

  transferNFT(
    addressFrom: string,
    addressTo: string,
    nftContract: string,
    tokenId: string,
  ) {
    if (this.emulatedAccount === null) {
      throw new Error("Must call impersonateAccount first")
    }

    this.setBalance(this.emulatedAccount, utils.parseUnits("10.0"))

    const fragment = FunctionFragment.from(
      "safeTransferFrom(address from, address to, uint256 tokenId)",
    )

    const iface = new Interface([fragment])

    const data = iface.encodeFunctionData("safeTransferFrom", [
      addressFrom,
      addressTo,
      BigNumber.from(tokenId),
    ])

    return this.send("eth_sendTransaction", [
      { from: this.emulatedAccount, to: nftContract, data },
    ])
  }
}
