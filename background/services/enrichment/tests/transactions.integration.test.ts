import sinon from "sinon"
import { ETHEREUM } from "../../../constants"

import {
  createChainService,
  createIndexingService,
  createNameService,
  createAnyEVMBlock,
} from "../../../tests/factories"
import { makeSerialFallbackProvider } from "../../chain/serial-fallback-provider"
import { annotationsFromLogs } from "../transactions"

// These logs reference transaction https://etherscan.io/tx/0x0ba306853f8be38d54327675f14694d582a14759b851f2126dd900bef0aff840
// prettier-ignore
const TEST_ERC20_LOGS = [ { contractAddress: "0x853d955aCEf822Db058eb8505911ED77F175b99e", data: "0x00000000000000000000000000000000000000000000057d723eb063126abeaf", topics: [ "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x0000000000000000000000009eef87f4c08d8934cb2a3309df4dec5635338115", "0x00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18", ], }, { contractAddress: "0x853d955aCEf822Db058eb8505911ED77F175b99e", data: "0xffffffffffffffffffffffffffffffffffffffffffffcf2f0540996d1fc52a54", topics: [ "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", "0x0000000000000000000000009eef87f4c08d8934cb2a3309df4dec5635338115", "0x000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff", ], }, { contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", data: "0x000000000000000000000000000000000000000000000000000000060869fd65", topics: [ "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x0000000000000000000000009a834b70c07c81a9fcd6f22e842bf002fbffbe4d", "0x00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18", ], }, { contractAddress: "0x853d955aCEf822Db058eb8505911ED77F175b99e", data: "0x00000000000000000000000000000000000000000000057d723eb063126abeaf", topics: [ "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18", "0x0000000000000000000000009a834b70c07c81a9fcd6f22e842bf002fbffbe4d", ], }, { contractAddress: "0x853d955aCEf822Db058eb8505911ED77F175b99e", data: "0xffffffffffffffffffffffffffffffffffffffffffe0bf27eab0a412146f26d0", topics: [ "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", "0x00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18", "0x000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564", ], }, { contractAddress: "0x9A834b70C07C81a9fcD6F22E842BF002fBfFbe4D", data: "0x00000000000000000000000000000000000000000000057d723eb063126abeaffffffffffffffffffffffffffffffffffffffffffffffffffffffff9f796029b0000000000000000000000000000000000000000000010c5f0437647d68615730000000000000000000000000000000000000000000002091686803a9aa2714ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffbc897", topics: [ "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67", "0x000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564", "0x00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18", ], }, { contractAddress: "0x22F9dCF4647084d6C31b2765F6910cd85C178C18", data: "0x00000000000000000000000000000012556e6973776170563300000000000000000000000000000000000000853d955acef822db058eb8505911ed77f175b99e000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000057d723eb063126abeaf000000000000000000000000000000000000000000000000000000060869fd65", topics: [ "0xe59e71a14fe90157eedc866c4f8c767d3943d6b6b2e8cd64dddcc92ab4c55af8", ], }, { contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", data: "0x00000000000000000000000000000000000000000000000000000000079b57dc", topics: [ "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18", "0x00000000000000000000000099b36fdbc582d113af36a21eba06bfeab7b9be12", ], }, { contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", data: "0x0000000000000000000000000000000000000000000000000000000600cea589", topics: [ "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18", "0x0000000000000000000000009eef87f4c08d8934cb2a3309df4dec5635338115", ], }, { contractAddress: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF", data: "0x000000000000000000000000853d955acef822db058eb8505911ed77f175b99e000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000057d723eb063126abeaf0000000000000000000000000000000000000000000000000000000600cea589", topics: [ "0x0f6672f78a59ba8e5e5b5d38df3ebc67f3c792e2c9259b8d97d7f00dd78ba1b3", "0x0000000000000000000000009eef87f4c08d8934cb2a3309df4dec5635338115", ], }, ]

describe("Enrichment Service Transactions", () => {
  const sandbox = sinon.createSandbox()

  beforeEach(async () => {
    sandbox.restore()
  })

  describe("annotationsFromLogs", () => {
    it("Should only create subannotations from logs with relevant addresses in them", async () => {
      const chainServicePromise = createChainService()
      const indexingServicePromise = createIndexingService({
        chainService: chainServicePromise,
      })
      const nameServicePromise = createNameService({
        chainService: chainServicePromise,
      })

      const [chainService, indexingService, nameService] = await Promise.all([
        chainServicePromise,
        indexingServicePromise,
        nameServicePromise,
      ])

      await chainService.startService()

      await chainService.addAccountToTrack({
        address: "0x9eef87f4c08d8934cb2a3309df4dec5635338115",
        network: ETHEREUM,
      })

      await indexingService.addCustomAsset({
        contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        symbol: "USDC",
        name: "USDC Coin",
        metadata: { tokenLists: [] },
        decimals: 6,
        homeNetwork: ETHEREUM,
      })

      await indexingService.addCustomAsset({
        contractAddress: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
        symbol: "FRAX",
        name: "FRAX Token",
        metadata: { tokenLists: [] },
        decimals: 18,
        homeNetwork: ETHEREUM,
      })

      sandbox
        .stub(chainService, "providerForNetworkOrThrow")
        .returns(makeSerialFallbackProvider("1", []))

      const subannotations = await annotationsFromLogs(
        chainService,
        indexingService,
        nameService,
        TEST_ERC20_LOGS,
        ETHEREUM,
        2,
        Date.now(),
        createAnyEVMBlock()
      )

      expect(subannotations.length).toBe(2)
    })
  })
})
