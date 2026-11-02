import { describe, expect, it } from "bun:test"
import { BigNumber } from "ethers"
import * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import type { SignedTransaction } from "../../../networks"
import { createAnyEVMTransaction } from "../../../tests/factories"
import type NonceAllocator from "../nonce-allocator"
import type SerialFallbackProvider from "../serial-fallback-provider"
import TransactionSubmitter from "../transaction-submitter"
import type TransactionTracker from "../transaction-tracker"

function harness() {
  const provider = {
    estimateGas: sinon.stub().resolves(BigNumber.from(100_000)),
    getGasPrice: sinon.stub().resolves(BigNumber.from(10)),
    sendTransaction: sinon.stub().resolves({ hash: "0xsent" }),
  }
  const nonceAllocator = { releaseNonce: sinon.stub() }
  const transactionTracker = {
    save: sinon.stub().resolves(),
    watchForReceipt: sinon.stub(),
  }
  const sent: string[] = []
  let failures = 0
  const submitter = new TransactionSubmitter({
    providerFor: () => provider as unknown as SerialFallbackProvider,
    nonceAllocator: nonceAllocator as unknown as NonceAllocator,
    transactionTracker: transactionTracker as unknown as TransactionTracker,
    onSent: (hash) => sent.push(hash),
    onSendFailed: () => {
      failures += 1
    },
  })
  return {
    submitter,
    provider,
    nonceAllocator,
    transactionTracker,
    sent,
    failures: () => failures,
  }
}

const signed = (): SignedTransaction =>
  ({
    ...createAnyEVMTransaction({ network: ETHEREUM }),
    r: "0x1492a3699be79b1c6c0f77505556cc90194ba8fe3317d83ce4075f3292108cd0",
    s: "0x0c6480bb00fa6e1f630ec004cdca7c725e6d8e964b8201b9cc6471e750415181",
    v: 37,
  }) as unknown as SignedTransaction

describe("TransactionSubmitter", () => {
  it("adds 10% to the gas estimate", async () => {
    const { submitter } = harness()

    await expect(
      submitter.estimateGasLimit(ETHEREUM, {
        from: "0x0d18b6e68ec588149f2fc20b76ff70b1cfb28882",
        network: ETHEREUM,
        chainID: ETHEREUM.chainID,
      } as never),
    ).resolves.toBe(110_000n)
  })

  it("broadcasts, saves locally, and follows a signed transaction", async () => {
    const { submitter, sent, transactionTracker, nonceAllocator } = harness()
    const transaction = signed()

    await submitter.broadcastSigned(transaction)

    expect(sent).toEqual(["0xsent"])
    expect(transactionTracker.save.calledWith(transaction, "local")).toBe(true)
    expect(transactionTracker.watchForReceipt.called).toBe(true)
    expect(nonceAllocator.releaseNonce.called).toBe(false)
  })

  it("saves a failed broadcast as failed, releases its nonce, and reports it", async () => {
    const {
      submitter,
      provider,
      transactionTracker,
      nonceAllocator,
      failures,
    } = harness()
    provider.sendTransaction.rejects(new Error("nonce too low"))
    const transaction = signed()

    await expect(submitter.broadcastSigned(transaction)).rejects.toThrow(
      "nonce too low",
    )

    const failedSave = transactionTracker.save
      .getCalls()
      .find(({ args: [saved] }) => "status" in saved)
    expect(failedSave?.args[0]).toMatchObject({ status: 0 })
    expect(failedSave?.args[1]).toBe("local")
    expect(nonceAllocator.releaseNonce.calledWith(transaction)).toBe(true)
    expect(failures()).toBe(1)
  })
})
