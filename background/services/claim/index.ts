import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"
import { Eligible, IPFSLinkItem } from "./types"
import BaseService from "../base"

const IPFSFileDirectoryIPFSHash = process.env.FILE_DIRECTORY_IPFS_HASH
const partGlossaryIPFSHash = process.env.PART_GLOSSARY_IPFS_HASH

const IPFSHTTPGatewayPrefix = "https://ipfs.io/ipfs/"
const IPFSHTTPGet = "https://ipfs.io/api/v0/dag/get?arg="

/*
 * Binary search to find which segment file to look in.
 * For context, the eligibility data is split up into files:
 * claim-0x90F79bf6EB2c4f870365E785982E1f101E93b906.ndjson
 * claim-0x9eef87f4c08d8934cb2a3309df4dec5635338115.ndjson
 * claim-0xa0Ee7A142d267C1f36714E4a8F75612F20a79720.ndjson
 * claim-0xdD2FD4581271e230360230F9337D5c0430Bf44C0.ndjson
 * claim-0xf6ff2962af467ca09d27378559b92ad912006719.ndjson
 * ...
 * To find which file to look in, we reference claim-index.json
 */
function findIndexOfPartToLookIn(
  addressEligibilityPartGlossary: string[],
  targetAddressNumber: number
) {
  const n = addressEligibilityPartGlossary.length
  let start = 0
  let end = n - 1

  while (start <= end) {
    const mid = Math.floor((start + end) / 2)
    const current = Number(addressEligibilityPartGlossary[mid])

    if (current === targetAddressNumber) {
      return mid
    }
    if (current < targetAddressNumber) {
      start = mid + 1
    } else {
      end = mid - 1
    }
  }
  return end + 1
}

async function getFileHashProspect(targetAddress: string) {
  const IPFSFileDirectory = await fetch(
    `${IPFSHTTPGet}${IPFSFileDirectoryIPFSHash}`
  )
  const partGlossary = await fetch(
    `${IPFSHTTPGatewayPrefix}${partGlossaryIPFSHash}`
  )
  const IPFSFileDirectoryJson = await IPFSFileDirectory.json()
  const partGlossaryJson = await partGlossary.json()

  const fileIndex = findIndexOfPartToLookIn(
    partGlossaryJson.map((item: { startAddress: string; file: string }) => {
      return item.startAddress
    }),
    Number(targetAddress)
  )
  const inClaimFileName = partGlossaryJson[fileIndex].file

  const IPFSHashForFoundFile = IPFSFileDirectoryJson.Links.find(
    (linkItem: IPFSLinkItem) => {
      return linkItem.Name === inClaimFileName
    }
  )

  return IPFSHashForFoundFile.Hash["/"]
}

async function getClaimFromFileHash(targetAddress: string, hash: string) {
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
  static create: ServiceCreatorFunction<Events, ClaimService, []> =
    async () => {
      return new this()
    }

  private constructor() {
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
    const { amount } = await getClaimFromFileHash(address, fileHash)

    // TEMP: Place into current structure to avoid conflict with claim slice PR
    const claim = {
      address,
      earnings: BigInt(amount),
      reasons: "",
    }
    this.emitter.emit("newEligibility", claim)
    return claim
  }
}
