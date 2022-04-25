import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"
import { Eligible, IPFSLinkItem } from "./types"
import BaseService from "../base"
import IndexingService from "../indexing"
import { HexString } from "../../types"

export const IPFSFileDirectoryIPFSHash = process.env.FILE_DIRECTORY_IPFS_HASH
export const partGlossaryIPFSHash = process.env.PART_GLOSSARY_IPFS_HASH

export const IPFSHTTPGatewayPrefix = "https://ipfs.io/ipfs/"
export const IPFSHTTPGet = "https://ipfs.io/api/v0/dag/get?arg="

/*
 * For context, the eligibility data is split up into files:
 * claim-0x90F79bf6EB2c4f870365E785982E1f101E93b906.ndjson
 * claim-0x9eef87f4c08d8934cb2a3309df4dec5635338115.ndjson
 * claim-0xa0Ee7A142d267C1f36714E4a8F75612F20a79720.ndjson
 * claim-0xdD2FD4581271e230360230F9337D5c0430Bf44C0.ndjson
 * claim-0xf6ff2962af467ca09d27378559b92ad912006719.ndjson
 * ...
 * To find which file to look in, we reference claim-index.json
 */
export async function getFileHashProspect(
  targetAddress: string
): Promise<string> {
  const numericTargetAddress = BigInt(targetAddress)

  const IPFSFileDirectory = await fetch(
    `${IPFSHTTPGet}${IPFSFileDirectoryIPFSHash}`
  )
  const partGlossary = await fetch(
    `${IPFSHTTPGatewayPrefix}${partGlossaryIPFSHash}`
  )

  const IPFSFileDirectoryJson = await IPFSFileDirectory.json()
  const partGlossaryJson = await partGlossary.json()

  const fileIndex =
    partGlossaryJson
      .map((item: { startAddress: string; file: string }) => {
        return item.startAddress
      })
      .findIndex((startAddress: string) => {
        return BigInt(startAddress ?? 0) > numericTargetAddress
      }) - 1
  const inClaimFileName = partGlossaryJson[fileIndex]?.file

  const IPFSHashForFoundFile = IPFSFileDirectoryJson.Links.find(
    (linkItem: IPFSLinkItem) => {
      return linkItem.Name === inClaimFileName
    }
  )

  return IPFSHashForFoundFile?.Hash["/"]
}

export async function getClaimFromFileHash(
  targetAddress: string,
  hash: string
): Promise<{
  account: HexString
  amount: string | number
  index: HexString
  proof: HexString[]
}> {
  const res = await fetch(`${IPFSHTTPGatewayPrefix}${hash}`)
  let claim
  const reader = res?.body?.getReader()
  let result
  const decoder = new TextDecoder()
  if (typeof reader !== "undefined") {
    let unfinishedLine = ""
    const searchString = `"account":"${targetAddress}"`
    result = await reader.read()

    while (!result.done) {
      const currentChunk =
        unfinishedLine + decoder.decode(result.value, { stream: true })

      if (currentChunk.includes(searchString)) {
        const lines = currentChunk.split(/[\r\n]/)

        // Last entry is definitionally after the last newline.
        // Could be empty if the chunk ends on a newline.
        unfinishedLine = lines.pop() || ""

        const matchingClaim = lines
          .map((claimEntry) => JSON.parse(claimEntry))
          .find((claimEntry) => claimEntry.account === targetAddress)
        if (matchingClaim) {
          claim = matchingClaim
          break
        }
      }
      // Seems reasonable to await inside of the while loop
      // with the idea of avoiding reading everything.
      // eslint-disable-next-line no-await-in-loop
      result = await reader.read()
    }
  }

  return (
    claim ?? {
      account: targetAddress,
      amount: 0,
    }
  )
}

interface Events extends ServiceLifecycleEvents {
  newEligibility: Eligible
}

/*
 * The claim service saves the eligibility data for
 * efficient storage and retrieval.
 */
export default class ClaimService extends BaseService<Events> {
  static create: ServiceCreatorFunction<
    Events,
    ClaimService,
    [Promise<IndexingService>]
  > = async (indexingService) => {
    return new this(await indexingService)
  }

  private constructor(private indexingService: IndexingService) {
    super()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService()
  }

  protected async internalStopService(): Promise<void> {
    await super.internalStopService()
  }

  async getEligibility(address: string): Promise<Eligible> {
    const fileHash = await getFileHashProspect(address)
    const { account, amount, index, proof } = await getClaimFromFileHash(
      address,
      fileHash
    )

    const claim = {
      index,
      amount: BigInt(amount),
      account,
      proof,
    }
    this.emitter.emit("newEligibility", claim)
    return claim
  }
}
