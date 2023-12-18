# Release checklist

This release checklist should be performed before release is published.

- dev tests should be performed by the dev team
- if something is not working please create an issue and link it here. Checkbox should be checked only if everything was fine
- in case of serious issues or doubts you should ask the team first

**Don't forget to approve the PR when checklist is finished ✅**

---

## Dev tests

### 🚀 Version update

- [ ] update from previous version with some accounts loaded

---

## Manual tests

🤖 Items marked with this emoji are good candidates for automation (although
it does not mean that they all would be obsolete once automated).

### 📝 Background processes

1. During execution of other tests on the list monitor extension's DevTools
   - [ ] check that there are no problematic errors in the Console tab
   - [ ] check the number of requests on the Network tab (the number shouldn't
         increase significantly in periods of user inactivity)

### 📨 Add account

1. Add read-only account with ENS
   - [ ] check assets 🤖
   - [ ] check balance 🤖
   - [ ] check NFTs 🤖
   - [ ] check abilities (abilities should not be displayed) 🤖
   - [ ] check activities
   - [ ] check portfolio page 🤖
   - [ ] check export options (export recovery phrase and export private key should not be available) 🤖
2. Add read-only account with UNS
   - [ ] check assets 🤖
   - [ ] check balance 🤖
   - [ ] check NFTs 🤖
   - [ ] check abilities (abilities should not be displayed) 🤖
   - [ ] check activities
   - [ ] check portfolio page 🤖
   - [ ] check export options (export recovery phrase and export private key should not be available) 🤖
3. Add read-only account with 0x address
   - [ ] check assets 🤖
   - [ ] check balance 🤖
   - [ ] check NFTs 🤖
   - [ ] check abilities (abilities should not be displayed) 🤖
   - [ ] check activities
   - [ ] check portfolio page 🤖
   - [ ] check export options (export recovery phrse and export private key should not be available) 🤖
4. Import account with a seed phrase
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check portfolio page
   - [ ] check seed phrase export
   - [ ] check private key export for first account 🤖
5. Add another account from the same seed phrase
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check portfolio page
   - [ ] check private key export for second account 🤖
6. Add account with a Ledger
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check portfolio page
   - [ ] check export options (export recovery phrase and export private key should not be available)
7. Create new wallet
   - [ ] check assets 🤖
   - [ ] check balance 🤖
   - [ ] check NFTs 🤖
   - [ ] check abilities 🤖
   - [ ] check activities 🤖
   - [ ] check portfolio page 🤖
   - [ ] check private key export 🤖
8. Add account with private key
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check portfolio page
   - [ ] check private key export 🤖
9. Add account with JSON keystore
   - [ ] check assets 🤖
   - [ ] check balance 🤖
   - [ ] check NFTs 🤖
   - [ ] check abilities 🤖
   - [ ] check activities 🤖
   - [ ] check portfolio page 🤖
   - [ ] check private key export 🤖

### 🗑️ Remove account

1. Remove account by type
   - [ ] remove read-only account 🤖
   - [ ] remove address from imported account 🤖
   - [ ] remove Ledger account
   - [ ] remove account imported with private key 🤖
   - [ ] remove account imported with JSON keystore 🤖
   - [ ] remove selected account 🤖
   - [ ] remove not selected account 🤖
   - [ ] remove all accounts 🤖
2. Remove account and check functionalities
   - [ ] add removed address from imported account 🤖
   - [ ] remove all addresses from imported account 🤖
   - [ ] check if NFTs are removed for removed accounts 🤖
   - [ ] check if abilities are removed for removed accounts 🤖
   - [ ] check if Portfolio page is updated for removed accounts 🤖

### 💌 Send base asset

When there are no changes touching sending txs in the release, only one base
asset send transaction on some mainnet chain is required to be tested. Make sure
it's on different chain than the ERC-20 asset send transaction.
When there are changes in the release that may affect transactions, lets test
everything from the list.

1. Ethereum mainnet
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
2. Polygon
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
3. Optimism
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
4. Arbitrum
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
5. Avalanche
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
6. Binance Smart Chain
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website

### 🎁 Send ERC20

When there are no changes touching sending txs in the release, only one ERC20
send transaction on some mainnet chain is required to be tested. Make sure it's
on different chain than the base asset send transaction.
When there are changes in the release that may affect transactions, lets test
everything from the list.

1. Ethereum mainnet
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
2. Polygon
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
3. Optimism
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
4. Arbitrum
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
5. Avalanche
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
6. Binance Smart Chain
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website

### 💸 Internal swap

When there are no changes touching swaps in the release, only one swap on some
mainnet chain is required to be tested.
When there are changes in the release that may affect swaps, lets test
everything from the list.

1. Ethereum mainnet
   - [ ] check token list
   - [ ] sign token spend approval
   - [ ] check gas settings and gas price
   - [ ] sign (if expensive, can be executed on testnet)
   - [ ] check transaction on scan website
2. Polygon
   - [ ] check token list
   - [ ] sign token spend approval
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
3. Optimism
   - [ ] check token list
   - [ ] sign token spend approval
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
4. Arbitrum
   - [ ] check token list
   - [ ] sign token spend approval
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
5. Avalanche
   - [ ] check token list
   - [ ] sign token spend approval
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website
6. Binance Smart Chain
   - [ ] check token list
   - [ ] sign token spend approval
   - [ ] check gas settings and gas price
   - [ ] sign
   - [ ] check transaction on scan website

### 📡 dApps connections

When there are no changes touching connectivity to dApps, it's enough to do only
a few reandom tests from the list.

- [ ] connect to [Uniswap](https://app.uniswap.org/) 🤖
- [ ] connect to [Opensea](https://opensea.io/) 🤖
- [ ] connect to [Galxe](https://galxe.com/)🤖
- [ ] connect to [PancakeSwap](https://pancakeswap.finance/) 🤖
- [ ] connect to [TraderJoe](https://traderjoexyz.com/avalanche) 🤖
- [ ] connect to [SpookySwap](https://spooky.fi/#/) 🤖
- [ ] connect to [Velodrome](https://app.velodrome.finance/swap) 🤖
- [ ] connect to [GMX](https://app.gmx.io/#/trade) 🤖
- [ ] connect to [MetaMask Test dApp](https://metamask.github.io/test-dapp/) 🤖

### 🎭 Sign in with Ethereum

- [ ] SIWE on [login.xyz](https://login.xyz/) 🤖
- [ ] SIWE on [Taho Pledge](https://taho.xyz/web3pledge) 🤖

### 🐶 Default wallet

1. Default wallet setting turned OFF
   - [ ] connect with dapp without MM available using Taho
   - [ ] connect with dapp with MM available using MM
2. Default wallet setting turned ON
   - [ ] connect with dapp without MM available using Taho
   - [ ] connect with dapp with MM available using Taho

### ⚙️ Settings

- [ ] check `hide balance under $2` option 🤖
- [ ] check bug reports - export logs 🤖
- [ ] check connected dapp - confirm you are able to disconnect from a dapp and connect again on different network 🤖

### ☀️ Abilities

- [ ] check each filter option 🤖
- [ ] delete ability 🤖
- [ ] mark ability as completed 🤖

### 🌠 NFTs page

1. NFTs page
   - [ ] browse NFTs 🤖
   - [ ] expand and collapse collection 🤖
   - [ ] check NFT preview 🤖
   - [ ] check Badges tab 🤖
2. NFTs filters
   - [ ] check each sort type 🤖
   - [ ] disable account 🤖
   - [ ] disable collection 🤖

### 🦾 Flashbots

1. Enable Flashbots in settings:
   - [ ] send/swap an asset & confirm trxn on Ethereum shows the Flashbots option with it auto-selected 🤖
   - [ ] confirm trxn is then sent through Flashbots 🤖 (send only)
   - [ ] send/swap another asset deselect Flashbots option
   - [ ] confirm that trxn is not sent through Flashbots 🤖 (send only)
2. Check trxns on other networks
   - [ ] confirm Flashbots checkbox isn't shown at all 🤖
   - [ ] confirm trxn is not sent through Flashbots 🤖
3. Disable Flashbots option in settings
   - [ ] send/swap an asset on Ethereum & confirm trxn shows without the Flashbots option 🤖
   - [ ] confirm trxn is not sent through Flashbots 🤖 (send only)
