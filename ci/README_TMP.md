# CONFIGURATION / RUNNING

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

The project is configured to use environment variables configured in `./.env` and `./.env.default`.

# WHAT WORKS / DOESN'T WORK

When run on `1337`:
:heavy_plus_sign: we can use specific block as a start.
:heavy_plus_sign: we can send txs and do swaps (balances updated)
:heavy_plus_sign: we can browse NFTs
:heavy_minus_sign: we can't browse Activities
:heavy_minus_sign: wallet shows strange assets
:heavy_minus_sign: if no cashe exists, loading of assets takes long, account avatars may look strange

State of the network is lost after Hardhat reset.

# TROUBLESHOOTING

I temporarily added some tools helping with investigation of some of the issues I had during config.
The `npx ts-node get-chain-id.ts` runs a script that checks what chain id the local network is running on.
To make it work I installed `@types/web3` and `web3` packages.

You can run the test script by uncommenting `test/hardhat.config.test.ts` and running `npx hardhat test test/hardhat.config.test.ts` to test your configuration.
To make that work, I installed `chai` and `@types/chai` packages. The troubleshooting scripts and modules will need to be removed in the final code.
