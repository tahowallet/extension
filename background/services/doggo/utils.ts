import { IPFSLinkItem } from "./types"
import { HexString } from "../../types"
import { fetchWithTimeout } from "../../utils/fetching"

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

  const IPFSFileDirectory = await fetchWithTimeout(
    `${IPFSHTTPGet}${IPFSFileDirectoryIPFSHash}`
  )
  const partGlossary = await fetchWithTimeout(
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
  const res = await fetchWithTimeout(`${IPFSHTTPGatewayPrefix}${hash}`)
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
