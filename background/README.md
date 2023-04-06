# Taho Background

The Taho Background package can effectively be considered the background script for the
Taho extension. It is designed to connect to external data providers including
Ethereum nodes, as well as specific providers like Alchemy and Blocknative that
may enable specific functionality beyond the standard node functions. It constructs
a data model in the form of a [Redux](https://redux.js.org) store, which is
then synchronized to any consumer via a proxy store using functionality in the
[webext-redux](https://github.com/tshaddix/webext-redux) library.

## Internal Architecture

The API package is structured roughly using the [Event
Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) architectural
pattern. At startup, the `startApi` function triggers the creation of a set of
[services](./services). Services in turn monitor their various data sources and
emit events with updates. They also manage snapshots of their own state,
persisted to the extension's IndexedDB (using [Dexie](https://dexie.org)
tables).

Events that affect UI rendering are dispatched as actions on the redux store,
which in turn updates its own internal aggregate state. The redux state is
handled using [slices](./redux-slices), as implemented by [Redux
Toolkit](https://redux-toolkit.js.org). The wiring between events and redux
store is done in the [`Main` class](./main.ts), which is instantiated in
`startApi`.

The following diagram describes the flow of data and events at a high level:

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│    ____             _                                   _                          │
│   | __ )  __ _  ___| | ____ _ _ __ ___  _   _ _ __   __| |                         │
│   |  _ \ / _` |/ __| |/ / _` | '__/ _ \| | | | '_ \ / _` |                         │
│   | |_) | (_| | (__|   < (_| | | | (_) | |_| | | | | (_| |                         │
│   |____/ \__,_|\___|_|\_\__, |_|  \___/ \__,_|_| |_|\__,_|                         │
│                         |___/                                                      │
│                                                                                    │
│                                 ┌────────────┐                                     │
│                                 │            │                                     │
│             ┌─────events───────▶│    Main    │─────────actions──────┐              │
│             │                   │            │                      │              │
│   ┌──────────────────┐          └────────────┘                      │              │
│   │                  │               │  ▲                           ▼              │
│   │     Services     │               │  │               ┌───────────────────────┐  │
│   │                  │               │  │               │                       │  │
│   └──────────────────┘               │  │               │         Redux         │  │
│             ▲                        │  │               │                       │  │
│             │                        │  │   events      │ ┌───────────────────┐ │  │
│             └─────forwarded events───┘  └───────────────│ │                   │ │  │
│                                                         │ │       Store       │─┼──┼────────┐
│                                                         │ │                   │ │  │        │
│                                                         │ └───────────────────┘ │  │        │
│                                                         └───────────────────────┘  │        │
│                                                                     ▲              │        │
└─────────────────────────────────────────────────────────────────────┼──────────────┘        │
                                                                      │                       │
                                                                 proxy actions                │
                                                                      │                      data
┌─────────────────────────────────────────────────────────────────────┼──────────────┐  synchronization
│    _   _ ___                                                        │              │        │
│   | | | |_ _|                                           ┌───────────────────────┐  │        │
│   | | | || |                                            │                       │  │        │
│   | |_| || |    ┌────────standard redux data────────────│         Redux         │  │        │
│    \___/|___|   │                                       │                       │  │        │
│                 ▼                                       │ ┌───────────────────┐ │  │        │
│      ┌────────────────────┐                             │ │                   │ │  │        │
│      │                    │                             │ │    Proxy Store    │◀┼──┼────────┘
│      │  React Components  │                             │ │                   │ │  │
│      │                    │                             │ └───────────────────┘ │  │
│      └────────────────────┘                             └───────────────────────┘  │
│                 │                                                   ▲              │
│                 │                                                   │              │
│                 └────────────standard redux actions─────────────────┘              │
│                                                                                    │
│                                                                                    │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Terminology

#### Networks

Network communication is central to the functionality of a web3 wallet. Due
to the complexity of handling multiple concurrent network connections, we
try to attribute networks (through variable and method naming) in the following way:

- Supported Network: A network that the extension is able to track
- Tracked Network: A network that the extension is tracking or has ever tracked.
- Active Network: A network that the extension is actively tracking / listening to.
- Current Network: The network that a given dapp (or the internal wallet) is connected to.

## Public API

The only public API of the Taho Background package is what is exported directly on
[`index.ts`](./index.ts). No submodule API is considered public, and all such
APIs are subject to arbitrary change without warning. Any API from a child
module that is meant for public consumption is re-exported in `index.ts`.

## Tools we use

### Data Validation - Ajv

We use [ajv](https://ajv.js.org/) for data validation and most of the time the JTD schema definition. These are useful links to get up to speed w/ JTD quickly

- https://github.com/ajv-validator/ajv/blob/master/spec/types/jtd-schema.spec.ts - jtd unit tests
- https://ajv.js.org/json-type-definition.html - jtd spec ajv
- https://jsontypedef.com/docs/jtd-in-5-minutes/ - jtd in 5 mins
- https://ajv.js.org/guide/typescript.html - using with ts
- https://github.com/jsontypedef/homebrew-jsontypedef - jtd tooling
