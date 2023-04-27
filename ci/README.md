# Configuration / running

To run the extension on forked Mainnet:

```
cd ..
yarn install
yarn start # optional
cd ci
yarn install
npx hardhat node --network hardhat
```

Then unpack `./dist/chrome` to Chrome Extensions.

The project is configured to use environment variables set in `./.env` or
`./.env.default`:
`MAINNET_FORK_CHAIN_ID` (suggested value: `1337`)
`CHAIN_API_URL`

# What wallet features work / don't work on `hardhat` network

When run on `1337`:
:heavy_plus_sign: we can use specific block as a start.
:heavy_plus_sign: we can send txs and do swaps (balances updated)
:heavy_plus_sign: we can browse NFTs
:heavy_minus_sign: we can't browse Activities
:heavy_minus_sign: wallet shows strange assets
:heavy_minus_sign: if no cashe exists, loading assets takes long, account
avatars may look strange

State of the network is lost after Hardhat reset.

# Running E2E tests on fork

The E2E tests are located in the `../e2e-tests` directory. Only those with
`-fork` suffix are meant to be run on forked Mainnet.

To run those tests, go to `..` and run `npx playwright test` .
To run specific test, go to `..` and run `npx playwright test <file_name>`.
To run all tests designed for fork, go to `..` and run
`find test -type f -name "*-fork.*" -exec npx playwright test {} \;`.
