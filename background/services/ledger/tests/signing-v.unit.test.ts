import Transport from "@ledgerhq/hw-transport"
import Eth from "@ledgerhq/hw-app-eth"
import {
  serialize,
  UnsignedTransaction,
  parse as parseRawTransaction,
} from "@ethersproject/transactions"
import { computeAddress, keccak256, SigningKey } from "ethers/lib/utils"

// A well-known test key (Hardhat/anvil account #0); never holds real funds.
const signingKey = new SigningKey(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
)
const signerAddress = computeAddress(signingKey.publicKey)

/**
 * Stands in for a Ledger running the Ethereum app: answers every SIGN
 * TRANSACTION (INS 0x04) APDU with a fixed signature response, and
 * everything else with a bare success status.
 */
class FakeLedgerTransport extends Transport {
  constructor(private signatureResponse: Buffer) {
    super()
  }

  override async exchange(apdu: Buffer): Promise<Buffer> {
    const success = Buffer.from([0x90, 0x00])
    return apdu[1] === 0x04
      ? Buffer.concat([this.signatureResponse, success])
      : success
  }
}

/**
 * The single `v` byte the device returns. For legacy transactions the device
 * applies EIP-155 to the chain id, truncated to its highest 4 bytes, and keeps
 * only the low byte of the result; typed transactions return the parity.
 */
function deviceVByte(chainId: number, type: 0 | 2, parity: number): number {
  if (type === 2) {
    return parity
  }
  const hex = chainId.toString(16)
  const padded = hex.length % 2 === 0 ? hex : `0${hex}`
  const chainIdUint32 = parseInt(padded.slice(0, 8), 16)
  return (chainIdUint32 * 2 + 35 + parity) % 256
}

function unsignedTransaction(
  chainId: number,
  type: 0 | 2,
  nonce: number,
): UnsignedTransaction {
  const common = {
    to: "0x000000000000000000000000000000000000dEaD",
    nonce,
    gasLimit: 21000,
    value: 1,
    data: "0x",
    chainId,
  }
  return type === 0
    ? { ...common, type: 0, gasPrice: 1_000_000_000 }
    : {
        ...common,
        type: 2,
        maxFeePerGas: 2_000_000_000,
        maxPriorityFeePerGas: 1_000_000_000,
      }
}

/**
 * Finds a transaction on the given chain whose signature has the requested
 * parity, so both parities are exercised deterministically.
 */
function signedWithParity(chainId: number, type: 0 | 2, parity: number) {
  for (let nonce = 0; nonce < 100; nonce += 1) {
    const transaction = unsignedTransaction(chainId, type, nonce)
    const signature = signingKey.signDigest(keccak256(serialize(transaction)))
    if (signature.recoveryParam === parity) {
      return { transaction, signature }
    }
  }
  throw new Error(`No nonce produced parity ${parity}`)
}

describe("Ledger transaction signing", () => {
  const chains = [
    { name: "Ethereum", chainId: 1 },
    { name: "Arbitrum Sepolia", chainId: 421614 },
    { name: "Mezo", chainId: 31612 },
    // Chain ids ≡ 110 (mod 128) make the device's one-byte EIP-155 v wrap
    // from 0xff to 0x00 when the parity is 1.
    { name: "a custom chain ≡ 110 (mod 128)", chainId: 128 * 1000 + 110 },
  ]

  chains.forEach(({ name, chainId }) => {
    ;([0, 2] as const).forEach((type) => {
      ;[0, 1].forEach((parity) => {
        it(`recovers the signer on ${name}, type ${type}, parity ${parity}`, async () => {
          const { transaction, signature } = signedWithParity(
            chainId,
            type,
            parity,
          )
          const deviceResponse = Buffer.concat([
            Buffer.from([deviceVByte(chainId, type, parity)]),
            Buffer.from(signature.r.slice(2), "hex"),
            Buffer.from(signature.s.slice(2), "hex"),
          ])

          const eth = new Eth(new FakeLedgerTransport(deviceResponse))
          const ledgerSignature = await eth.signTransaction(
            "44'/60'/0'/0/0",
            serialize(transaction).substring(2),
            null,
          )

          // Mirrors how LedgerService.signTransaction assembles the result.
          const signedTransaction = serialize(transaction, {
            r: `0x${ledgerSignature.r}`,
            s: `0x${ledgerSignature.s}`,
            v: parseInt(ledgerSignature.v, 16),
          })

          expect(parseRawTransaction(signedTransaction).from).toBe(
            signerAddress,
          )
        })
      })
    })
  })
})
