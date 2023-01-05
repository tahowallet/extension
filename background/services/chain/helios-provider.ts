import {
  JsonRpcProvider,
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/providers"
import { BigNumber } from "ethers"
import { Node } from "helios-ts/pkg"

export type BlockTag = "latest" | number

export class HeliosClient extends JsonRpcProvider {
  #node

  isSynced = false

  constructor(executionRpc?: string, consensusRpc?: string) {
    super()
    this.#node = new Node(
      executionRpc ?? "http://localhost:9001/proxy",
      consensusRpc ?? "http://localhost:9002/proxy"
    )

    // TODO: please please please for the love of everything that is good and dear ... do not do this ... please just don't
    //       but this is just a hack so it's ok ... :)
    this.sync().then(() => {
      this.isSynced = true
    })
  }

  async sync() {
    await this.#node.sync()
    this.isSynced = true
    setInterval(async () => this.#node.advance(), 12_000)
  }

  override async getBlockNumber(): Promise<number> {
    return this.#node.get_block_number()
  }

  override async getBalance(
    addr: string,
    block: BlockTag = "latest"
  ): Promise<BigNumber> {
    const balance = await this.#node.get_balance(addr, block.toString())
    return BigNumber.from(balance)
  }

  override async getCode(
    addr: string,
    block: BlockTag = "latest"
  ): Promise<string> {
    return this.#node.get_code(addr, block.toString())
  }

  async getNonce(addr: string, block: BlockTag = "latest"): Promise<number> {
    return this.#node.get_nonce(addr, block.toString())
  }

  override async getTransaction(hash: string): Promise<TransactionResponse> {
    const tx = await this.#node.get_transaction_by_hash(hash)

    if (!tx) {
      throw new Error("panic panic end of the world")
    }
    return Promise.resolve({
      hash: tx.hash,
      to: tx.to,
      from: tx.from,
      nonce: tx.nonce,
      gasLimit: BigNumber.from(tx.gas_limit),
      data: tx.data,
      value: BigNumber.from(tx.value),
      chainId: tx.chain_id,
      gasPrice: tx.gas_price ? BigNumber.from(tx.gas_price) : undefined,
      maxFeePerGas: tx.max_fee_per_gas
        ? BigNumber.from(tx.max_fee_per_gas)
        : undefined,
      maxPriorityFeePerGas: tx.max_priority_fee_per_gas
        ? BigNumber.from(tx.max_priority_fee_per_gas)
        : undefined,
      r: tx.r,
      s: tx.s,
      v: parseInt(tx.v, 10),
      confirmations: 0, // TODO: replace this with proper confirmation code
      wait: () => Promise.resolve({} as TransactionReceipt),
    })
  }
}
