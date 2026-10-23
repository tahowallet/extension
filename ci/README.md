# Running Taho extension on a forked Mainnet

This directory holds the mainnet fork that the fork-based E2E tests run
against in CI, so the same fork can be run locally:

- `start-anvil.sh` starts an [anvil](https://getfoundry.sh/anvil/overview)
  fork of Ethereum mainnet on port 8545, exactly as CI does.
- `stop-anvil.sh` stops it with a SIGINT so anvil flushes its fork cache to
  `~/.foundry/cache` before exiting. CI saves that cache between runs.
- `fork.env` holds the block the fork starts at and the chain id it runs as.
  Both `start-anvil.sh` and the CI workflow read it, so this is the one place
  to change them. Setting `FORKING_BLOCK` or `MAINNET_FORK_CHAIN_ID` in the
  environment overrides it for a single run.

The fork starts at a fixed, historical block, so `CHAIN_API_URL` must be an
archive-capable Ethereum mainnet RPC URL.

## Configuration / running

To run the extension on a forked Mainnet, install Foundry, which provides
anvil, by following
[its installation instructions](https://getfoundry.sh/introduction/installation),
then:

1. Build the extension for the fork from the repository root. Set
   `USE_MAINNET_FORK=true` in `../.env` or directly in the console; the
   extension uses `MAINNET_FORK_CHAIN_ID` from `.env.defaults` (`1337`),
   which matches `fork.env`.  
   `bun install`  
   `USE_MAINNET_FORK=true bun start` (or `bun run build`)

2. Start the fork:  
   `cd ci`  
   `CHAIN_API_URL=<archive mainnet RPC URL> bun start`

3. Unpack `./dist/chrome` to Chrome Extensions.

## What wallet features work / don't work on the fork

When run on `1337`:

:heavy_plus_sign: we can use specific block as a start.  
:heavy_plus_sign: we can send txs and do swaps (balances updated)  
:heavy_plus_sign: we can browse NFTs  
:heavy_minus_sign: the activities are not loading
:heavy_minus_sign: wallet shows strange assets  
:heavy_minus_sign: if no cache exists, loading assets takes long, account
avatars may look strange

State of the network is lost when the fork restarts.

## Running E2E tests on fork

The E2E tests are located in the `../e2e-tests` directory. The tests use
`test.skip` expression, which decides whether a given test should be run based
on the value of a `USE_MAINNET_FORK` environment variable. The fork tests also
need the test wallet's keystore in `FORK_TEST_WALLET_JSON_BODY` and its
password in `FORK_TEST_WALLET_JSON_PASSWORD`.

With the extension built for the fork and the fork running, run all tests
designed for the fork from the root with:

`USE_MAINNET_FORK=true bun run e2e:fork`

To run a specific test, run `bun --bun playwright test <file_name>` instead.

To run the fork in the background the way CI does, start it with
`./ci/start-anvil.sh &` and stop it with `./ci/stop-anvil.sh` once the tests
finish.
