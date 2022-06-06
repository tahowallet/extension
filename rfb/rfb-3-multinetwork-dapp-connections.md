# RFB 3: Multinetwork dApp Connections

## Mental Models

1. The extension is connected to every supported chain all the time — meaning it has a live connection simultaneously — but presents only a single connection to the dApps.
2. Redux store is a special glue layer in our architecture between the services and the UI.

- It can call methods on main through the async thunks
- It can depend on services, but services can't depend on it
  - It can not be read or written directly from services
  - When in doubt: the source of truth is the service. Eg If there is a special part — like dApp connections — where UI and services needs the same information
    - In these special cases we keep everything in sync through events
      - We don't use optimistic update to avoid the complexity of rollbacks
    - typical data flow:
      - initialization: service emits an initialize event > listener in main dispatches action > reducer sets the content of the slice to the payload in the action
      - user action: UI dispatches async thunk > async thunk calls service through main OR emits an event (whichever makes sense in given context) > service updates persistance layer > service fires an event > in main there is a listener that dispatches the redux action > reducer updates redux > UI updates

3. The extension can be thought of as a multinetwork skeleton AND network specific internal dApps.
   - Multinetwork skeleton: settings, overview, assets, activity, ...
     - The common thing about these parts that they are network independent OR the network as concept applies only as a filter, but we need to have all the data for a given view.
     - These are mostly the informational views
   - Internal dApps: swaps, send, ...
     - The common thing about them is that their functionality is tightly coupled with a network.
     - These are mostly the parts that can make changes to the chain.

## Product decisions / FAQ

- > Permissions are network bound or not (the question here is: do we need to track different permissions by network, or only by address?).
  - [Decision thread](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/GKW_YsOIDVoqoo9LV4fx5RIwHDh)
  - Permissions are network bound, we need to be able differentiate between networks
    - it’s possible to have permission for `0xdeadbeef` on mainnet but not on polygon
    - it's possible to have permission for `0xdeadbeef` on mainnet and polygon but not on arbitrum
- > The question of whether the current network is synced between a dApp and the extension popover (the question here is: do internal dApps need the same model to handle this as external dApps?).
  - [Discussion thread](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/8Y_PUeEyibY-z698qCsnDp77wGa)
  - They are not synced
- [What should be the initial default address and network](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/mFivf2mZ7YAhKm5OPQIfxoVVkoW)
- [Common address and network for internal dApps or independent](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/-dXUTwSD3bXZ9enPRczVmEoDR1X)

## TODO

- [ ] which methods need the additional chain context / which one have it baked in
  - > The question of what calls current do or don't carry chain information (the questions here are: what is the delta between where the current RPC sits and where we would like it to in a perfect world where all calls carry chain ids? At what level do we need to track chain id?)
  - > Let's make an exhaustive list of what methods currently do and don't include `chainId`. For example, I believe `eth_estimateGas` does in fact include it, at least optionally (see [the ethers `TransactionRequest` type](https://github.com/ethers-io/ethers.js/blob/8b62aeff9cce44cbd16ff41f8fc01ebb101f8265/packages/abstract-provider/src.ts/index.ts#L28) and [the Ethers `hexlifyTransaction` function](https://github.com/ethers-io/ethers.js/blob/8b62aeff9cce44cbd16ff41f8fc01ebb101f8265/packages/providers/src.ts/json-rpc-provider.ts#L671), which is used [in gas estimation](https://github.com/ethers-io/ethers.js/blob/8b62aeff9cce44cbd16ff41f8fc01ebb101f8265/packages/providers/src.ts/json-rpc-provider.ts#L558-L560)).

## dApp Settings

> How do we persist the network of a given dapp? (likely preference service - but maybe a new service?). Also we’ll probably want > an in-memory store as well to avoid doing a bunch of i/o every time we get rpc requests.

This should be broken down into 2 pieces: permission and current connection,

We store these information in services but have a redux slice contain all of these for the UI.

When initializing the app we emit an event from the services with the current payload and the existing content of the redux store is overwritten with the payload.

So we should refactor the `dapp-permission` slice to be more generic and store all the settings for dApps. Also rename it to be `dapp`.

### dApp Permissions

#### Redux

In that redux slice the permissions are stored with in `chainID -> address -> object` nested object style.

```
{
  permissionRequests: { [url: string]: PermissionRequest },
  allowed: { [chainID: string | number]: {
      [address: string]: { [origin: string]: PermissionRequest }
  },
  activeConnections: ...
}
```

```
  export type PermissionRequest = {
    origin: string
    faviconUrl: string
    title: string
    state: "request" | "allow" | "deny"
    addressOnNetwork: AddressOnNetwork
  }
```

#### ProviderBridgeService

Because of the changes in the `PermissionRequest` type we need to create a migration in `ProviderBridgeServiceDatabase`.
The permissions will be queried often — on every RPC call — but written rarely, so we should optimize for read performance.
This means that we need to add the `chainID` to the primary index. This will require
 - [the same back-and-forth as outlined in this comment](https://github.com/tallycash/extension/blob/b1edcac0805b678c839005fb80d993d55850a0ab/background/services/provider-bridge/db.ts#L29)
 - augmenting the existing permissions with the mainnet `AddressOnNetwork` related data

From the perspective of permissions multi-network or multi-account permission grant should be broken down, to multiple single permission grant or deny.

Note: When UI sends multiple permission request in a short period of time — because the UI will be multi-address + multi-network, but we will insert a separate permission for every address+network+origin triplet — we don't need to worry about the indexedDB write performance, because this code path won't be used often and the number of inserted permissions won't be significant.

### Current Connection Per dApps

- [ ] communication flow + events of account changing for a dApp
- [ ] db structure for internal ethereum provider

#### Redux

This would be the other part of the redux slice: dApp URL <> active network, selected account.

This changes when the dApp uses the RPC methods eg. `wallet_switchEthereumChain`

```
{
  permissionRequests: ...
  allowed: ...
  activeConnections: { [origin: string]: AddressOnNetwork}
}
```

#### InternalEthereumProviderService

[This issue](https://github.com/tallycash/extension/issues/1532#issuecomment-1139410588) belongs to this topic.

The current connections for the dApps will be stored in the `InternalEthereumProviderService` because the augmentation of current network will be necessary for our internal dApps as well.

Our internal dApps — swap, send etc — will use the global account and network selected.

⚠️ [Pending product verification](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/-dXUTwSD3bXZ9enPRczVmEoDR1X) We are exploring whether our internal dApps should share a common selected/current address+network or they should be independent. In the meantime we will use the global account + network.

##### Default network and account

In this new paradigm we still need to be able to select an initial value to be used.

The global current address and current network should be used as a default network and account.

⚠️ [Pending product verification](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/mFivf2mZ7YAhKm5OPQIfxoVVkoW) We are exploring the options on how to handle default network and account when the global selector is gone.

##### Initial active connection

When connecting to a dApp the chainID needs to be set on the window-provider. The default network should be used for this.

When permission is granted the default address and chain should be used if given permission. If not, then the first the was granted.

❗️The user can change networks e.g. on uniswap before granting permission but there is no way for us to know what it is and the dApp follows what the wallet sets on window-provider. So we can use the default value as active connection when permission is granted.

##### QnA

- > We'll need get rid of activeChain and add network context to every rpc request (context that dapps will not be sending us). Things like eth_estimateGas, eth_getBalance, eth_blockNumber all need a way of being network aware
  - The lookup of the current dapp context should happen in the `InternalEthereumProviderService` and provide it as a parameter to the chain service calls.
- > Many dapps periodically ping eth_chainId - we’ll need to refactor our response there to send our persisted chainId for a given > dapp.
  - We can handle that in the `InternalEthereumProviderService`, the same way we handle the current context lookup.
- > There’s gonna be complexity in how we handle parts of the code where we dogfood our internal ethereum provider versus parts where we skip that step and call our services directly via main
  - When we use internal dApps we should use our internal provider path.
  - For extension specific calls it's ok to make the calls directly through main. See the direct calls we have now. None of these belongs to chain communication, but kind of like utility functionality
    ```
    addAccount
    addOrEditAddressName
    removeAccount
    importLedgerAccounts
    deriveLedgerAddress
    connectLedger
    getAccountEthBalanceUncached
    resolveNameOnNetwork
    connectPopupMonitor
    onPopupDisconnected
    ```
