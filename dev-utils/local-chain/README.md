# Local chain for development

This is a sample hardhat project that has been modified to run a local fork of the mainnet.
The extension can interact with this chain and contracts can be deployed to it.
The chain loses it's state on restart.

The important configuration is in `hardhat.config.js`.

- `chainId: 1337`: At the moment we know that this works but chainId 1 does not. (03/06/2022)
  - With `chainId: 1` if there is almost any wallet communication — at the moment — the fork becomes unresponsive quickly.
    The time it takes is not deterministric. Had it working for hours but usually it breaks after a couple of seconds.
- `mining.auto: false;` and `mining.interval: 5000` is set so it's easy to see if the chain becomes unresponsive.

## Setup

> This project is intentionally not part of the yarn workspace, because it's not part of the application,
> but a simple a tool for development. Because of this, it needs to be setup as a separate node project.

```
$ cd dev-utils/local-chain
$ yarn install
$ yarn start
```

## API key for alchemy

There is a separate application for this, and that api key is used in the config.

## Original README

(Basic Sample Hardhat Project)

https://hardhat.org/getting-started/

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```
