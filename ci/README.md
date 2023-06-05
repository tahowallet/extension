# Configuration / running

To run the extension on a forked Mainnet:

1. Configure required environment variables (either by setting them in `../.env`
   or directly in the console):  
   `USE_MAINNET_FORK=true` (needed for building the package)  
   `MAINNET_FORK_CHAIN_ID=1337` (needed for running Hardhat, `1337` is the
   suggested and a default value)  
   `CHAIN_API_URL=<Insert_your_API_URL_here>` (needed for running Hardhat, may
   be e.g. Alchemy or Infura API URL)
   `FORKING_BLOCK=<Insert_forking_block_here>` (needed for running Hardhat, if
   not specified, current block will be used)

2. Run the following commands from root:  
   `yarn install`  
   `yarn start` (or `yarn build`)  
   `cd ci`  
   `npx hardhat node --network hardhat`

3. Unpack `./dist/chrome` to Chrome Extensions.

# What wallet features work / don't work on `hardhat` network

When run on `1337`:

:heavy_plus_sign: we can use specific block as a start.  
:heavy_plus_sign: we can send txs and do swaps (balances updated)  
:heavy_plus_sign: we can browse NFTs  
:heavy_minus_sign: the activities are not loading
:heavy_minus_sign: wallet shows strange assets  
:heavy_minus_sign: if no cache exists, loading assets takes long, account
avatars may look strange

State of the network is lost after Hardhat reset.

# Running E2E tests on fork

The E2E tests are located in the `../e2e-tests` directory. Only those with
`-fork` suffix are meant to be run on forked Mainnet.

To run specific test, go to root and run `npx playwright test <file_name>`.

To run all tests designed for the fork, go to root and run
`yarn run test:e2e-fork` ( or its equivalent
`find e2e-tests -type f -name "*-fork.*" -exec npx playwright test {} \;`).
