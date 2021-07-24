import { platform } from '../lib/platform'
import { Network, NetworkFungibleAsset } from '../types'

import Ajv from 'ajv'

import { TokenList, schema } from '@uniswap/token-lists'

// TODO integrate this with /api/networks
const ETHEREUM_NETWORK : Network = {
  name: 'Ethereum Main Net',
  baseAsset: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: BigInt(18),
  },
  chainId: '1',
  family: 'EVM'
}

async function fetchAndValidateTokenList(url : string) {
  let response = await fetch(url)
  if (response.ok) {
    let json = await response.json()
    let valid = (new Ajv()).validate(schema, json)
    if (valid) {
      return json as TokenList
    }
  }
}

function tokenListToFungibleAssets(tokenList : TokenList) : NetworkFungibleAsset[] {
  return tokenList.tokens.map((t) => {
    return {
      metadata: {
        logoURL: t.logoURI,
      },
      name: t.name,
      symbol: t.symbol,
      decimals: BigInt(t.decimals),
      homeNetwork: ETHEREUM_NETWORK,
      contractAddress: t.address
    }
  })
}

// TODO fetch, validate, and cache a token list
// TODO maintain a cached NetworkFungibleAsset list from prioritized token lists
// TODO get the latest list of assets from the cache
// TODO bust the cache
