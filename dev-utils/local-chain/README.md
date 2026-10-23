# Local chain for development

This runs a local fork of Ethereum mainnet with [anvil](https://getfoundry.sh/anvil/overview).
The extension can interact with this chain and contracts can be deployed to it.
The chain loses its state on restart.

The important configuration is in the `start` script in `package.json`.

- `--chain-id 1337`: At the moment we know that this works but chainId 1 does not. (03/06/2022)
  - With `chainId: 1` if there is almost any wallet communication — at the moment — the fork becomes unresponsive quickly.
    The time it takes is not deterministic. Had it working for hours but usually it breaks after a couple of seconds.
- `--block-time 5` mines a block every 5 seconds instead of on every transaction, so it's easy to see if the chain
  becomes unresponsive.

The funded development accounts are anvil's defaults, which are the same as Hardhat's.

## Setup

> This project is intentionally not part of the root workspace, because it's not part of the application,
> but a simple tool for development.

Install Foundry, which provides anvil, by following
[its installation instructions](https://getfoundry.sh/introduction/installation). Then point `CHAIN_API_URL` at
an Ethereum mainnet RPC endpoint and start the chain:

```
$ cd dev-utils/local-chain
$ CHAIN_API_URL=<mainnet RPC URL> bun start
```

The fork starts at the latest block, so any up-to-date mainnet endpoint works, including Boar's. A non-archive
endpoint can only serve recent state, though, so a long-running fork may eventually fail to read state at the block
it forked from; restarting the chain moves the fork up to the latest block again.
