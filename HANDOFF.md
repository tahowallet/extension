# Handoff: history in the indexing service

This branch, `card-catalog`, continues `history-buff`. It removes the separate
history service and its `tally/history` database, and keeps balance and price
history in the indexing service's existing `balances` and `prices` tables.
Remove this file before merging.

## Why

The user's direction, after reviewing `history-buff`:

- History is indexing, which is what the indexing service is for. There
  should be no separate history service.
- No new tables out of nowhere. The indexing database's `balances` and
  `prices` tables existed already, and were write-only: nothing read them,
  and history recorded the same events into its own database. History should
  use them.
- Public names follow the vocabulary that already exists
  (`AccountBalance`, `FullAssetID`, price measurements, `retrievedAt`), not
  new terms.

## What's on this branch

Four commits on top of `history-buff` (`7304f84e2`):

1. **Move history's pure modules under the indexing service.** Series math,
   compaction tiers, rate budgets, scheduling, live price conversion,
   transfer reconstruction and backfill sources now live in
   `background/services/indexing/history/`, unchanged apart from imports.
2. **Keep balance and price history as series in the indexing database.**
   Indexing database version 7 turns `balances` and `prices` into one record
   per series, with times, values and origins in typed arrays.
   - `balances`: `++id,&key,address,chainID`. Series keys are
     `balance:${address}|${FullAssetID}`.
   - `prices`: `++id,&key,[symbol+key]`. Series keys are
     `price:${FullAssetID}`.
   - Backfill bookkeeping is kept as records of `kind: "backfill"` in the same
     tables: `backfill:balances:${chainID}` and
     `backfill:transfers:${chainID}:${address}` in `balances`, and
     `backfill:price:${assetID}` in `prices`.
   - Dexie can't change a table's primary key, so tables keep `++id` and find
     series by the unique `key` index. The database keeps a key-to-ID map
     current so lookups use `bulkGet`; without it charts and writes were
     20–90% slower.
   - The upgrade converts up to 100,000 existing rows per table into series
     (`indexing/history/upgrade.ts`).
3. **Fold the history service into the indexing service.**
   `IndexingService` records live balances (including base-asset balances
   from the chain service's `accountsWithBalances`) and prices, schedules
   `historyCompaction` and `historyBackfill` alarms, and answers
   `getValueHistory` (`indexing/history/value-history.ts`). Backfill lives in
   `indexing/history/backfill.ts`. The Redux thunk is now
   `account/fetchValueHistory` in `redux-slices/accounts.ts`. On startup the
   service deletes the old `tally/history` database, which never shipped.
4. **Read history series by ID and compact them in smaller pages.**

Public renames: `Holding` → `BalanceSeries`, `holdingKeyFor` →
`balanceSeriesKeyFor`, `priceKey` → `assetID: FullAssetID`, `PointSource` /
`source` → `PointOrigin` / `origin`, `PriceRecord` / `BalanceRecord` →
`PriceMeasurement` / `BalanceMeasurement`, `time` → `retrievedAt` on balance
measurements, `addPrices` → `savePriceMeasurements`, `getHoldings` →
`getBalanceSeries`, `getPriceKeysBySymbol` → `getPricedAssetIDsBySymbol`,
`history/fetchValueHistory` → `account/fetchValueHistory`.

Checks at the tip: `bun check`, unit (1,367), integration (298) and UI (214)
tests, and `bun run build` pass, with no new lint warnings.
`CHROMIUM_PATH=/opt/pw-browsers/chromium bun bench:history` (500 tokens, 5
accounts, 20 chains) loads chart data in 76–119ms, with compaction's longest
stall at 12–15ms.

## Open decision: converting the old rows

This is the next thing to settle, with the user.

- **A, convert (what's here now).** A week of existing rows becomes the start
  of each series. That matters for balances on chains with no archive state,
  where backfill can't fill the gap. But it's about 250 lines that run once,
  and it runs in IndexedDB's upgrade transaction, which can't yield: on a
  large install, the first start after updating could stall the background
  for seconds.
- **B, clear the old rows.** A few lines, no stall. Backfill refills prices,
  and balances wherever an endpoint keeps old state; elsewhere history starts
  on the day of the update.

The recommendation was B. Before deciding, measure the conversion's stall on
a realistic install, e.g. 100,000 rows per table in Chromium.

## Also left to do

- **Line count.** The move came out about 390 lines of code larger than
  `history-buff`, not smaller: the conversion (~250), the key-to-ID map, and
  backfill records in place of a table. Option B recovers most of that.
  `indexing/history/records.ts` (~500 lines) is worth a pass for anything
  duplicated from the database code.
- **The 1-month chart** sometimes stalls up to 23ms, just over the 20ms goal.
- **A test isolation problem:** `history-live.unit` ("dates the Chainlink
  feed's live price") fails when run in one process with the other indexing
  test files, and passes on its own and under `bun run test:unit`.
- **Then land it:** bring these commits onto `history-buff` and rebase
  `clean-break` onto it. `clean-break` deletes per-chain data from the old
  `tally/history` database (`removeChainData`, `getChainIDsWithData`) and
  filters `getValueHistory` to listed networks; both need porting to the
  indexing tables and `IndexingService.getValueHistory`.

## Branches around this one

| Branch              | Tip         | State                                                                                                                       |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `history-buff`      | `7304f84e2` | On `main`. Full tab, history, charts. No PR.                                                                                |
| `clean-break`       | `13d92726e` | Stacked on `history-buff`. Removed-network cleanup. No PR.                                                                  |
| `card-catalog`      | this branch | Stacked on `history-buff`. This work. No PR.                                                                                |
| `watched-pot`       | `d91c8167c` | On an older `main`. Stall diagnostics, cheaper UI diffs and persist timing, with `scripts/benchmarks/store-diff.ts`. No PR. |
| `little-black-book` | `1e7b8ff8b` | Address book names per network. Its earlier commits are in `history-buff`; its last four aren't. No PR.                     |

Already merged: `storm-drain` (#3890, RPC request storms), `saving-grace`
(#3893, persist the store at most once a second), `report-card` (#3892,
build output and the Ledger footer) and `control-freak` (#3888).

Note that a local `.env` with `SUPPORT_MEZO_NETWORK=true` adds Mezo's testnet
to the default networks, which makes two `ChainService` integration tests
expecting 10 supported networks fail. They pass with the default settings.

The user amends commits in place on branches without a PR and force-pushes
with a lease. On branches with a PR, they prefer amended commits too; check
with them before force-pushing.

## Related findings, not yet acted on

From profiling a real 4 MB saved state (11 accounts, 12 networks):

- **93% of stored balances point at assets missing from the asset table.**
  That's 8,047 of 8,615, mostly spam on Polygon and test tokens on Sepolia.
  Reloading a network's assets (`assetsLoaded` with network scope) removes
  assets that balances still refer to, so lookups drop those balances. That
  includes the full tab's unverified-assets page, which is meant to list
  them. The next balance refresh adds them back, so the state swings between
  about 4 MB and 6.9 MB. The direction discussed was a count of unverified
  assets per account and network in Redux, with the unverified page reading
  balances from the indexing database when opened.
- **Every balance refresh rewrites every refreshed balance's asset** through
  the asset slice's `upsertMany` extra reducer. That makes the UI diff walk
  them all: 71ms against 21ms in a burst. Upserting only missing or changed
  assets is a one-reducer fix.
- **The state could shrink further** by referring to networks by chain ID in
  assets and accounts, and token lists by URL: 4 MB to about 2.9 MB. Commit
  `47012fbc9` ("Normalize redux state…") is the precedent. 277 of 2,630
  embedded `homeNetwork` copies had already drifted from the network list.
- **The chain database's own `balances` table** is also write-only and is
  never pruned.

## Conventions

- Use bun, never python.
- Commits: imperative sentence-case subject, no period; a body wrapped at 72
  columns that explains why.
- PR titles: "Pun Name: Summary", with a pun kebab-case branch name.
- Background work must never block for more than 100ms.
- Comments and docstrings, all of them, inline and test comments included,
  follow Antonio Salazar Cardozo's 2022–2024 style (see his commits in this
  repository):
  - Open with what the thing does, in plain present tense ("Returns…",
    "Checks whether…"); for a value or type, say what it is.
  - Then say why it exists, with concrete examples: chain IDs, providers,
    error wordings, numbers.
  - Use "Note that…" for caveats, `@param` with capitalized descriptions,
    and wrap at 80 columns.
  - Write full sentences, without semicolon chains or "we" narration about
    the change. Comments describe the code as it is; history belongs in
    commit messages.
  - Inline comments say why, not what.
