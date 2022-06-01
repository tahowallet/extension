# RFB 3: Multinetwork dApp Connections

## Mental Models

1. The extension is connected to every supported chain all the time — meaning it has a live connection simultaneously — but presents only a single connection to the dApps.
2. Redux store is a normal service for UI/app state/ settings. It can call other services “directly" — through async thunks —, it is persisted, has its migrations, and other services can also query it.
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
- > The question of what calls current do or don't carry chain information (the questions here are: what is the delta between where the current RPC sits and where we would like it to in a perfect world where all calls carry chain ids? At what level do we need to track chain id?)
  - ❗️ TODO

## Proposal

### dApp Settings

> How do we persist the network of a given dapp? (likely preference service - but maybe a new service?). Also we’ll probably want > an in-memory store as well to avoid doing a bunch of i/o every time we get rpc requests.

This should be broken down into 2 pieces: permission and current connection,

We store these in redux since this will be needed in the UI as well and it will be changeable through the UI. And it will need to be synced between the UI and dapp connection continuously.
So we should refactor the `dapp-permission` slice to be more generic and store all the settings for dApps. Probably also rename it to be simply `dapp`.

⚠️TBD: How to query the redux store from services without creating circular dependencies? We have 3 options

- Break out redux into it's own service.
- Back and forth through events.
- ~~Query the persisted store in local storage~~ // This is just for the record. We should not do this if we can avoid.

#### dApp Permissions

In that redux slice the permissions are stored with in `chainID -> address -> object` nested object style.

```
{
  permissionRequests: { [url: string]: PermissionRequest }
  allowed: { [origin_accountAddress_networkID: string]: PermissionRequest }
  activeConnections: ...
}
```

```
  export type PermissionRequest = {
    key: string
    origin: string
    faviconUrl: string
    title: string
    state: "request" | "allow" | "deny"
    addressOnNetwork: AddressOnNetwork
  }
```

#### Current Connection Per dApps

[This issue](https://github.com/tallycash/extension/issues/1532#issuecomment-1139410588) belongs to this topic.

This would be the other part of the redux slice: dApp URL <> active network, selected account.

This changes when

- or the dApp uses the RPC methods eg. `wallet_switchEthereumChain`

```
{
  permissionRequests: ...
  allowed: ...
  activeConnections: { [origin: string]: AddressOnNetwork}
}
```

### Current Connection Context For dApp RPC Calls

> We'll need get rid of activeChain and add network context to every rpc request (context that dapps will not be sending us). Things like eth_estimateGas, eth_getBalance, eth_blockNumber all need a way of being network aware

The lookup of the current dapp context should happen in the `InternalEthereumProviderService` and provide it as a parameter to the chain service calls.

> We might need an additional layer in the future just like with the `SigningService` but we should worry about that we want to support non EVM chains.

#### `eth_chainId`

> Many dapps periodically ping eth_chainId - we’ll need to refactor our response there to send our persisted chainId for a given > dapp.

We can handle that in the `InternalEthereumProviderService`, the same way we handle the current context lookup.

### `InternalEthereumProviderService` vs direct calls

> There’s gonna be complexity in how we handle parts of the code where we dogfood our internal ethereum provider versus parts where we skip that step and call our services directly via main

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
