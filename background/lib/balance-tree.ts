import { BigNumber, utils } from "ethers"
import MerkleTree from "./merkle-tree"

export default class BalanceTree {
  private readonly tree: MerkleTree

  constructor(
    balances: { address: string; earnings: string; reasons: string }[]
  ) {
    this.tree = new MerkleTree(
      balances.map(({ address, earnings }, index) => {
        return BalanceTree.toNode(index, address, BigNumber.from(earnings))
      })
    )
  }

  public static verifyProof(
    index: number | BigNumber,
    account: string,
    amount: BigNumber,
    proof: Buffer[],
    root: Buffer
  ): boolean {
    let pair = BalanceTree.toNode(index, account, amount)
    // eslint-disable-next-line no-restricted-syntax
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item)
    }

    return pair.equals(root)
  }

  // keccak256(abi.encode(index, account, amount))
  public static toNode(
    index: number | BigNumber,
    account: string,
    amount: BigNumber
  ): Buffer {
    return Buffer.from(
      utils
        .solidityKeccak256(
          ["uint256", "address", "uint256"],
          [index, account, amount]
        )
        .substr(2),
      "hex"
    )
  }

  public getHexRoot(): string {
    return this.tree.getHexRoot()
  }

  public getRoot(): Buffer {
    return this.tree.getRoot()
  }

  // returns the hex bytes32 values of the proof
  public getHexProof(
    index: number | BigNumber,
    account: string,
    amount: BigNumber
  ): string[] {
    return this.tree.getHexProof(BalanceTree.toNode(index, account, amount))
  }

  public getProof(
    index: number | BigNumber,
    account: string,
    amount: BigNumber
  ): Buffer[] {
    return this.tree.getProof(BalanceTree.toNode(index, account, amount))
  }
}
