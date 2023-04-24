# Release checklist

This release checklist should be performed before release will be published.

- dev tests should be performed by the dev team
- if something is not working please create an issue and link it here. Checkbox should be checked only if everything was fine
- in case of serious issues or doubts you should ask the team first

**Don't forget to approve the PR when checklist will be finished ✅**

---

## Dev tests

### 🚀 Version update

- [ ] update from previous version with some accounts loaded

---

## Manual tests

### 📨 Add account

1. Add read-only account with ENS
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check overview page
2. Add read-only account with UNS
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check overview page
3. Add read-only account with 0x address
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check overview page
4. Import account with a seed phrase
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check overview page
5. Add another account from the same seed phrase
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check overview page
6. Add account with a Ledger
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check overview page
7. Create new wallet
   - [ ] check assets
   - [ ] check balance
   - [ ] check NFTs
   - [ ] check abilities
   - [ ] check activities
   - [ ] check overview page

### 🗑️ Remove account

1. Remove account by type
   - [ ] remove read-only account
   - [ ] remove address from imported account
   - [ ] remove Ledger account
   - [ ] remove selected account
   - [ ] remove not selected account
   - [ ] remove all accounts
2. Remove account and check functinalities
   - [ ] add removed address from imported account
   - [ ] remove all addresses from imported account
   - [ ] check if NFTs are removed for removed accounts
   - [ ] check if abilities are removed for removed accounts
   - [ ] check if Portfolio page is updated for removed accounts

### 💌 Send base asset

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

1. Ethereum mainnet
   - [ ] check token list
   - [ ] sign token spend approval
   - [ ] check gas settings and gas price
   - [ ] sign
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

- [ ] connect to [Uniswap](https://app.uniswap.org/)
- [ ] connect to [Opensea](https://opensea.io/)
- [ ] connect to [Galxe](https://galxe.com/)
- [ ] connect to [PancakeSwap](https://pancakeswap.finance/)
- [ ] connect to [TraderJoe](https://traderjoexyz.com/avalanche)
- [ ] connect to [SpookySwap](https://spooky.fi/#/)
- [ ] connect to [Velodrome](https://app.velodrome.finance/swap)
- [ ] connect to [GMX](https://app.gmx.io/#/trade)
- [ ] connect to [Mintkudos](https://mintkudos.xyz/)

### 🎭 Sign in with Ethereum

- [ ] SIWE on [login.xyz](https://login.xyz/)
- [ ] SIWE on [Taho Pledge](https://taho.xyz/web3pledge)

### 🐶 Default wallet

1. Default wallet setting turned OFF
   - [ ] connect with dapp without MM available using Taho
   - [ ] connect with dapp with MM available using MM
2. Default wallet setting turnef ON
   - [ ] connect with dapp without MM available using Taho
   - [ ] connect with dapp with MM available using Taho

### ⚙️ Settings

- [ ] check `hide balance under $2` option
- [ ] check bug reports - export logs

### ☀️ Abilities

- [ ] check each filter option
- [ ] delete ability
- [ ] mark ability as completed

### 🌠 NFTs page

1. NFTs page
   - [ ] browse NFTs
   - [ ] expand and collapse collection
   - [ ] check NFT preview
   - [ ] check Badges tab
2. NFTs filters
   - [ ] check each sort type
   - [ ] disable account
   - [ ] disable collection
