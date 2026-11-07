import sinon from "sinon"
import {
  createInternalSignerService,
  createLedgerService,
  createSigningService,
} from "../../../tests/factories"
import SigningService from "../index"
import SparkService from "../../spark"
import { SPARK_REGTEST } from "../../../constants/spark"
import type { SparkTransactionRequest } from "../../../networks"

const SPARK_REQUEST: SparkTransactionRequest = {
  network: SPARK_REGTEST,
  from: "sparkrt1pgssy6vty7krpze82ecm8j39gd35v35aqjjmhftc4culawsavkyh564u2uv8v0",
  to: "sparkrt1pgssya57xvd3avs5eqhdnpelmpaf9e6mlhvwzdtcx2hua26c0dfmglezf65z7t",
  sparkAccountID: "spark-regtest:keyring-1:0",
  value: 1000n,
  estimatedFee: 0n,
  maxFee: 0n,
}

describe("Signing Service Unit", () => {
  let signingService: SigningService
  const sandbox = sinon.createSandbox()

  beforeEach(async () => {
    signingService = await createSigningService()
    await signingService.startService()
    sandbox.restore()
  })

  afterEach(async () => {
    await signingService.stopService()
  })

  describe("deriveAddress", () => {
    it("should use ledger service to derive from a ledger account", async () => {
      const ledgerService = await createLedgerService()
      await ledgerService.startService()
      const deriveAddressStub = sandbox
        .stub(ledgerService, "deriveAddress")
        .callsFake(async () => "0x")

      signingService = await createSigningService({
        ledgerService: Promise.resolve(ledgerService),
      })
      await signingService.startService()

      await signingService.deriveAddress({
        type: "ledger",
        deviceID: "foo",
        path: "bar",
      })

      expect(deriveAddressStub.called).toBe(true)
    })

    it("should use keyring service to derive from a keyring account", async () => {
      const internalSignerService = await createInternalSignerService()
      const deriveAddressStub = sandbox
        .stub(internalSignerService, "deriveAddress")
        .callsFake(async () => "0x")

      signingService = await createSigningService({
        internalSignerService: Promise.resolve(internalSignerService),
      })
      await signingService.startService()

      await signingService.deriveAddress({
        type: "keyring",
        keyringID: "foo",
      })

      expect(deriveAddressStub.called).toBe(true)
    })

    it("should error when trying to derive from a read-only account", () => {
      expect(
        signingService.deriveAddress({
          type: "read-only",
        }),
      ).rejects.toBeTruthy()
    })
  })

  describe("signTransaction for Spark payments", () => {
    const withSparkService = async () => {
      const internalSignerService = createInternalSignerService()
      const sparkService = await SparkService.create(internalSignerService)
      const sendStub = sandbox
        .stub(sparkService, "send")
        .callsFake(async () => ({
          accountID: SPARK_REQUEST.sparkAccountID,
          id: "transfer-id",
          kind: "spark",
          status: "TRANSFER_STATUS_COMPLETED",
        }))
      signingService = await createSigningService({
        internalSignerService,
        sparkService: Promise.resolve(sparkService),
      })
      await signingService.startService()
      return sendStub
    }

    it("routes keyring accounts to the Spark signer", async () => {
      const sendStub = await withSparkService()
      const result = await signingService.signTransaction(SPARK_REQUEST, {
        type: "keyring",
        keyringID: "keyring-1",
      })
      expect(sendStub.calledOnceWith(SPARK_REQUEST)).toBe(true)
      expect(result.id).toBe("transfer-id")
    })

    it("refuses signers that can't hold Spark keys", async () => {
      const sendStub = await withSparkService()
      await expect(
        signingService.signTransaction(SPARK_REQUEST, {
          type: "ledger",
          deviceID: "foo",
          path: "bar",
        }),
      ).rejects.toThrow(/recovery-phrase/)
      await expect(
        signingService.signTransaction(SPARK_REQUEST, { type: "read-only" }),
      ).rejects.toThrow(/Read-only/)
      expect(sendStub.called).toBe(false)
    })
  })
})
