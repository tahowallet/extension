import mergeMiddleware from 'json-rpc-engine/src/mergeMiddleware'
import createScaffoldMiddleware from 'json-rpc-engine/src/createScaffoldMiddleware'
import createBlockReRefMiddleware from 'eth-json-rpc-middleware/block-ref'
import createRetryOnEmptyMiddleware from 'eth-json-rpc-middleware/retryOnEmpty'
import createBlockCacheMiddleware from 'eth-json-rpc-middleware/block-cache'
import createInflightMiddleware from 'eth-json-rpc-middleware/inflight-cache'
import createBlockTrackerInspectorMiddleware from 'eth-json-rpc-middleware/block-tracker-inspector'
import providerFromMiddleware from 'eth-json-rpc-middleware/providerFromMiddleware'
import BlockTracker from 'eth-block-tracker'

import createInfuraMiddleware from 'eth-json-rpc-infura'
import createAlchemyMiddleware from '@mechamittens/eth-json-rpc-alchemy'
import * as networkEnums from './enums'

/*
 * Create an Alchemy or Infura client to access chain data.
 * @param {'infura'|'alchemy'} providerName - The name of the third-party provider service.
 * @param {'mainnet','ropsten','rinkeby','kovan','goerli'} network - A specific Ethereum network
 */
export default function createThirdPartyClient ({ providerName, network }) {

  const clientMiddleware = (providerName == 'alchemy' ?
    createAlchemyMiddleware({ network, maxAttempts: 5 }) :
    createInfuraMiddleware({ network, maxAttempts: 5, source: 'metamask' }))
  const provider = providerFromMiddleware(clientMiddleware)
  const blockTracker = new BlockTracker({ provider: provider })

  const networkMiddleware = mergeMiddleware([
    createNetworkAndChainIdMiddleware({ network }),
    createBlockCacheMiddleware({ blockTracker }),
    createInflightMiddleware(),
    createBlockReRefMiddleware({ blockTracker, provider }),
    createRetryOnEmptyMiddleware({ blockTracker, provider }),
    createBlockTrackerInspectorMiddleware({ blockTracker }),
    clientMiddleware,
  ])
  return { networkMiddleware, blockTracker }
}

function createNetworkAndChainIdMiddleware ({ network }) {
  let chainId
  let netId

  switch (network) {
    case 'mainnet':
      netId = networkEnums.MAINNET_NETWORK_ID
      chainId = '0x01'
      break
    case 'ropsten':
      netId = networkEnums.ROPSTEN_NETWORK_ID
      chainId = '0x03'
      break
    case 'rinkeby':
      netId = networkEnums.RINKEBY_NETWORK_ID
      chainId = '0x04'
      break
    case 'kovan':
      netId = networkEnums.KOVAN_NETWORK_ID
      chainId = networkEnums.KOVAN_CHAIN_ID
      break
    case 'goerli':
      netId = networkEnums.GOERLI_NETWORK_ID
      chainId = '0x05'
      break
    default:
      throw new Error(`createThirdPartyClient - unknown network "${network}"`)
  }

  return createScaffoldMiddleware({
    eth_chainId: chainId,
    net_version: netId,
  })
}
