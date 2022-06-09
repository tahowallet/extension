# RFB 3: Multinetwork dApp Connections

## 1. Background

Currently our extension is defaulting to ethereum mainnet, and in many cases we don't have the network as a concept in our data structures.
We also rely on a global, extension wide account selector and our dApps share the same selected network and account.

## 2. Proposal

### 2.1. Goal

We want to change the functionality of our dApp connections to

- be independent of each other (as a preparatory work for fully decoupling them from extension global state)
- introduce the concept of networks where it's missing and make it so that we can track reliably throughout the dApp permission handling, and communication cycle.

#### Mental Models

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

### 2.2. Implementation

This should be broken down into 2 pieces: permission and current connection.

We store these information in services but have a redux slice contain all of these for the UI.

When initializing the app we emit an event from the services with the current payload and the existing content of the redux store is overwritten with the payload.

So we should refactor the `dapp-permission` slice to be more generic and store all the settings for dApps. Also rename it to be `dapp`.

#### dApp Permissions

##### Redux

In that redux slice the permissions are stored with in `NetworkFamily -> chainID -> address -> object` nested object style.

```
{
  permissionRequests: { [origin: string]: PermissionRequest },
  allowed: {
    [networkFamily: NetworkFamily]: {
      [chainID: string]: {
        [address: string]: { [origin: string]: PermissionRequest }
      }
    }
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

##### ProviderBridgeService

Because of the changes in the `PermissionRequest` type we need to create a migration in `ProviderBridgeServiceDatabase`.
The permissions will be queried often — on every RPC call — but written rarely, so we should optimize for read performance.
This means that we need to add the `chainID` to the primary index. This will require

- [the same back-and-forth as outlined in this comment](https://github.com/tallycash/extension/blob/b1edcac0805b678c839005fb80d993d55850a0ab/background/services/provider-bridge/db.ts#L29)
- augmenting the existing permissions with the mainnet `AddressOnNetwork` related data

From the perspective of permissions multi-network or multi-account permission grant should be broken down, to multiple single permission grant or deny.

Note: When UI sends multiple permission request in a short period of time — because the UI will be multi-address + multi-network, but we will insert a separate permission for every address+network+origin triplet — we don't need to worry about the indexedDB write performance, because this code path won't be used often and the number of inserted permissions won't be significant.

⚠️ The methods in `authorization.ts` also needs to be updated to check for chainID. e.g.: `checkPermissionSign`

#### Current Connection Per dApps

##### Initial active connection

Default account and network: The global current address and current network should be used as a default network and account, until pending future work overrides it.

When connecting to a dApp the chainID needs to be set on the window-provider. The default network should be used for this.

When permission is granted the default address and chain should be used if given permission. If not, then the first the was granted.

❗️The user can change networks e.g. on uniswap before granting permission but there is no way for us to know what it is and the dApp follows what the wallet sets on window-provider. So we can use the default value as active connection when permission is granted.

##### Redux

This would be the other part of the redux slice: dApp URL <> active network, selected account.

This changes when the dApp uses the RPC methods eg. `wallet_switchEthereumChain`

```
{
  permissionRequests: ...
  allowed: ...
  activeConnections: { [origin: string]: AddressOnNetwork}
}
```

##### InternalEthereumProviderService

The current connections for the dApps will be stored in the `InternalEthereumProviderService` because the augmentation of current network will be necessary for our internal dApps as well.

Our internal dApps — swap, send etc — will use the global account and network selected.

⚠️ Note: the selected account related solution is currently located in the `PreferenceService`. We need to move the logic to the `InternalEthereumProvider` and migrate the existing settings. We do this migration in the `main.ts` but we will need to clean up `PreferenceService` after this implementation is released.

⚠️ Note: the [else here](https://github.com/tallycash/extension/blob/0c12499d711290a0de9f28898be44f87fe6d664f/background/main.ts#L1098) should be removed as part of this work.

###### Initialization flow

- `InternalEthereumService`
  - on first db initialization it creates the db with the schema
    - migration will happen in main to avoid dependency circles between `ProviderBridgeService` and `InternalEthereumProvider`
  - in `internalStartService`
    - it reads
      - all the persisted account + network for every dApp that has been granted permission
      - the current selected account from `PreferenceService`
    - populates and fires `initializeSelectedAddressOnNetwork`
      ```
      interface Events extends ServiceLifecycleEvents {
        ...
        initializeSelectedAddressOnNetwork: { [origin: string]: AddressOnNetwork }
        ...
      }
      ```
- in main there is a listener for `initializeSelectedAddressOnNetwork`
  - migration mode: (if the payload is empty): it reads all the dapp permissions that has already been granted and
    - reads all the permissions granted from `ProviderBridgeService` and the selected address
    - populates the payload with current selected address and network and dispatches the `setSelectedAddressOnNetwork`
    - calls the `setSelectedAddressOnNetwork` method on `InternalEthereumProvider` which persists all dApps with the current address and network information
  - normal mode: (if the payload is not empty) dispatches `setSelectedAddressOnNetwork` which overwrites the data in redux

###### Update flow

- User changes network or account in the global selector
- `setNewSelectedSelectedAddressOnNetwork` is dispatched
  - ⚠️ note: We don't make the distinction here whether the account or the network was changed. This information will be important in the `window-provider` but it will take care of it in it's own scope.
  - redux is updated for every dApp that has been granted permission
- in main we update the [uiSliceEmitter > newAddressOnNetwork listener](https://github.com/tallycash/extension/blob/0c12499d711290a0de9f28898be44f87fe6d664f/background/main.ts#L1110)
  - persist the change in `InternalEthereumProvider` for every dApp that has been granted permission
  - notify the content scripts for every dApp that has an live connection / open port
  - check referrals

###### Incoming RPC call augmentation flow

Every incoming RPC call from the dApps should be augmented with the information of selected networks.
This will be done in `InternalEthereumProvider` when calling `ChainService` as an additional argument for the method calls.

‼️ Security concern:
Based on the [ethereum JSON RPC APIs spec](https://github.com/ethereum/execution-apis) calls that have transactions as a parameter have the chainID. We need to validate, that the call param is the same as one that the user has selected.

These are the following methods:

- `eth_sendRawTransaction`
- `eth_sendTransaction`
- `eth_signTransaction`
- `eth_estimateGas`
- `eth_call`

## 3. Future work

- Decouple dApp connections from the global address and network selector (and also provide a separate UI for it)
- [Make the default account and network configurable](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/mFivf2mZ7YAhKm5OPQIfxoVVkoW)
- [Common address and network for internal dApps or independent](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/-dXUTwSD3bXZ9enPRczVmEoDR1X)

## Related links / Product decisions

- > Permissions are network bound or not (the question here is: do we need to track different permissions by network, or only by address?).
  - [Decision thread](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/GKW_YsOIDVoqoo9LV4fx5RIwHDh)
  - Permissions are network bound, we need to be able differentiate between networks
    - it’s possible to have permission for `0xdeadbeef` on mainnet but not on polygon
    - it's possible to have permission for `0xdeadbeef` on mainnet and polygon but not on arbitrum
- > The question of whether the current network is synced between a dApp and the extension popover (the question here is: do internal dApps need the same model to handle this as external dApps?).
  - [Discussion thread](https://www.flowdock.com/app/cardforcoin/tally-product-design/threads/8Y_PUeEyibY-z698qCsnDp77wGa)
  - They are not synced
