import { TokenInfo } from "@uniswap/token-lists"

export const polygonTokenListURL =
  "https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json"

export function fixPolygonWETHIssue(tokensParam: TokenInfo[]): TokenInfo[] {
  // See the discussion behind this migration here
  // https://matrix.to/#/!WZRftnsYNnOtzOGuZy:thesis.co/$nhJA20S7sFCv8qyPoxsYF0xIlOBAW4rqhdkUEmxCQYQ?via=thesis.co&via=matrix.org

  const tokens = tokensParam

  const wethToWethPOSAddress = "0xae740d42e4ff0c5086b2b5b5d149eb2f9e1a754f"

  let tokenToRenameIndex = tokens.findIndex(
    (token) => token.address === wethToWethPOSAddress,
  )

  if (tokenToRenameIndex !== -1) {
    tokens[tokenToRenameIndex] = {
      ...tokens[tokenToRenameIndex],
      name: "PoS - Wrapped ETH (old)",
      symbol: "PoS - Wrapped ETH (old)",
    }
  }

  const ethPOSToWethAddress = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"

  tokenToRenameIndex = tokens.findIndex(
    (token) => token.address === ethPOSToWethAddress,
  )

  if (tokenToRenameIndex !== -1) {
    tokens[tokenToRenameIndex] = {
      ...tokens[tokenToRenameIndex],
      name: "Wrapped Ether",
      symbol: "WETH",
      logoURI: "https://assets.polygon.technology/tokenAssets/eth.svg",
    }
  }

  return tokens
}
