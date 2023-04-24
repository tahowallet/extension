# Release checklist

This release checklist should be performed before release will be published.

- dev tests should be performed by the dev team
- if something is not working please create an issue and link it here. Checkbox should be checked only if everything was fine
- in case of serious issues or doubts you should ask the team first

**Don't forget to approve the PR when checklist will be finished ✅**

---

### Dev tests

<details>
<summary>Version update</summary>

- [ ] update from previous version with some accounts loaded
</details>

---

### Manual tests

<details>
<summary>Add account</summary>

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
   </details>

<details>
<summary>Remove account</summary>

- [ ] remove read-only account
- [ ] remove address from imported account
- [ ] add removed address from imported account
- [ ] remove all addresses from imported account
- [ ] remove Ledger account
- [ ] remove selected account
- [ ] remove not selected account
- [ ] check if NFTs are removed for removed accounts
- [ ] check if abilities are removed for removed accounts
- [ ] check if Portfolio page is updated for removed accounts
- [ ] remove all accounts

</details>

<details>
<summary>Send base asset</summary>

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

</details>

<details>
<summary>Send ERC20</summary>

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
   </details>

<details>
<summary>Internal swap</summary>

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
   </details>

<details>
<summary>dApps connections</summary>

- [ ] connect to Uniswap
- [ ] connect to Opensea
- [ ] connect to Galxe
- [ ] connect to PancakeSwap
- [ ] connect to TraderJoe
- [ ] connect to SpookySwap
- [ ] connect to Velodrome
- [ ] connect to GMX
- [ ] connect to Mintkudos
</details>

<details>
<summary>Sign in with Ethereum</summary>

- [ ] SIWE on login.xyz
- [ ] SIWE on Taho Pledge
</details>

<details>
<summary>Default wallet</summary>

1. Default wallet setting turned OFF
   - [ ] connect with dapp without MM available using Taho
   - [ ] connect with dapp with MM available using MM
2. Default wallet setting turnef ON
   - [ ] connect with dapp without MM available using Taho
   - [ ] connect with dapp with MM available using Taho
   </details>

<details>
<summary>Settings</summary>

- [ ] check `hide balance under $2` option
- [ ] check bug reports - export logs
</details>

<details>
<summary>Abilities</summary>

- [ ] check each filter option
- [ ] delete ability
- [ ] mark ability as completed
</details>

<details>
<summary>NFTs page</summary>

1. NFTs page
   - [ ] browse NFTs
   - [ ] expand and collapse collection
   - [ ] check NFT preview
   - [ ] check Badges tab
2. NFTs filters
   - [ ] check each sort type
   - [ ] disable account
   - [ ] disable collection
   </details>
