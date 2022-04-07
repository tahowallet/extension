import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"
import { Eligible, IPFSLinkItem } from "./types"
import BaseService from "../base"
import { ETHEREUM } from "../../constants"
import IndexingService from "../indexing"

const IPFSFileDirectoryIPFSHash = process.env.FILE_DIRECTORY_IPFS_HASH
const partGlossaryIPFSHash = process.env.PART_GLOSSARY_IPFS_HASH

const IPFSHTTPGatewayPrefix = "https://ipfs.io/ipfs/"
const IPFSHTTPGet = "https://ipfs.io/api/v0/dag/get?arg="

const HARDCODED_VAULTS = [
  {
    network: ETHEREUM,
    vaultAddress: "0xB3eF3AA87B87C606Da4d49F4E643bA0B73c1022D",
    yearnVault: "0xd9788f3931Ede4D5018184E198699dC6d66C1915",
    duration: 1209600,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338446,
    poolEndTime: 1650548046,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "Aave Token",
      symbol: "AAVE",
      decimals: 18,
      contractAddress: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    },
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x0d0A303488BD2775CCd6e958484A1565F1fb521a",
    yearnVault: "0xFBEB78a723b8087fD2ea7Ef1afEc93d35E8Bed42",
    duration: 1209600,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338451,
    poolEndTime: 1650548051,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    },
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x8b7B6006a260d492b8Ce5a4BA23BA5c90cA81351",
    yearnVault: "0x1635b506a88fBF428465Ad65d00e8d6B6E5846C3",
    duration: 1209600,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338456,
    poolEndTime: 1650548056,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "Curve CVX-ETH",
      symbol: "crvCVXETH",
      decimals: 18,
      contractAddress: "0x3A283D9c08E8b55966afb64C515f5143cf907611",
    },
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x9c209062d7C2432837b09d00bf0C3E81843CeD31",
    yearnVault: "0x790a60024bC3aea28385b60480f15a0771f26D09",
    duration: 1209600,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338461,
    poolEndTime: 1650548061,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "Curve.fi Factory Crypto Pool: YFI/ETH",
      symbol: "YFIETH-f",
      decimals: 18,
      contractAddress: "0x29059568bB40344487d62f7450E78b8E6C74e0e5",
    },
  },
  {
    network: ETHEREUM,
    vaultAddress: "0xb36f1F7f4e0982daa926b93E720e2695732aCbfd",
    yearnVault: "0xF29AE508698bDeF169B89834F76704C3B205aedf",
    duration: 1209600,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338467,
    poolEndTime: 1650548067,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "Synthetix Network Token",
      symbol: "SNX",
      decimals: 18,
      contractAddress: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
    },
  },
  {
    network: ETHEREUM,
    vaultAddress: "0xDd7d1CE6A076e83165d162C029dCf31066F444FB",
    yearnVault: "0x6d765CbE5bC922694afE112C140b8878b9FB0390",
    duration: 1209600,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338472,
    poolEndTime: 1650548072,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "SushiToken",
      symbol: "SUSHI",
      decimals: 18,
      contractAddress: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
    },
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x8AaA53f416AacbdBe999f3f0D4b9c24Bb957308c",
    yearnVault: "0x67B9F46BCbA2DF84ECd41cC6511ca33507c9f4E9",
    duration: 1209600,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338475,
    poolEndTime: 1650548075,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "LooksRare Token",
      symbol: "LOOKS",
      decimals: 18,
      contractAddress: "0xf4d2888d29D722226FafA5d9B24F9164c092421E",
    },
  },
  {
    network: ETHEREUM,
    vaultAddress: "0xCE95BC0D818222d097e39dA3Ce5f7a903a6e346B",
    yearnVault: "0xD4108Bb1185A5c30eA3f4264Fd7783473018Ce17",
    duration: 1209600,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338480,
    poolEndTime: 1650548080,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "KEEP Token",
      symbol: "KEEP",
      decimals: 18,
      contractAddress: "0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC",
    },
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x1D93f92BfB93f26558228CFB019f9DCF826e3E3C",
    yearnVault: "0xB364D19c3FF37e0fa4B94bf4cf626729533C1c26",
    duration: 1209600,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338485,
    poolEndTime: 1650548085,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "Curve T-ETH",
      symbol: "crvTETH",
      decimals: 18,
      contractAddress: "0xCb08717451aaE9EF950a2524E33B6DCaBA60147B",
    },
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x173e2998F48b958787850912A4b01A73228cA89C",
    yearnVault: "0x5faF6a2D186448Dfa667c51CB3D695c7A6E52d8E",
    duration: 2592000,
    rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
    poolStartTime: 1649338490,
    poolEndTime: 1651930490,
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
    asset: {
      name: "Uniswap V2",
      symbol: "UNI-V2",
      decimals: 18,
      contractAddress: "0xAC5115B57709880448d090AC6De8Fc2D6a4fC507",
    },
  },
]

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
async function getFileHashProspect(targetAddress: string) {
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

    const huntingGrounds = HARDCODED_VAULTS

    huntingGrounds.forEach(({ network, asset }) => {
      this.indexingService.addAssetToTrack({ ...asset, homeNetwork: network })
    })
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
