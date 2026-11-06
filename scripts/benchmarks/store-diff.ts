/* oxlint-disable no-console */
/**
 * Compares ways of diffing the background store for the UI, on a wallet's
 * real saved state.
 *
 * Every time the background's store changes, it diffs the old and new state
 * and sends the delta to each open popup or tab. Diffing a long array that
 * changed used to match its items with a longest common subsequence search,
 * which blocked the background for seconds when a list of thousands of asset
 * ids was reordered. This runs the same state changes through three ways of
 * diffing and reports how long each takes in the background, how big a
 * delta it sends, how long the UI takes to decode and apply it, and whether
 * applying it to the old state gives the new one:
 *
 * - **matching**: every array diffed item by item with subsequence matching,
 *   as the differ did before long arrays were treated differently.
 * - **replace**: a changed array over 100 items sent whole.
 * - **current**: the differ in background/services/redux/differ.ts, which
 *   diffs a long array of unchanged length position by position, and sends
 *   it whole only when its length changed.
 *
 * The changes are made to a copy of the wallet's state, modeled on what the
 * wallet does: rebuilding the asset list as it loads assets, reordering it,
 * adding an asset, updating a balance and adding an activity.
 *
 * To get a wallet's state, open the extension's full tab, open its DevTools
 * console and run:
 *
 *   chrome.storage.local.get("state").then(({ state }) => {
 *     const link = document.createElement("a")
 *     link.href = URL.createObjectURL(new Blob([state]))
 *     link.download = "taho-state.json"
 *     link.click()
 *   })
 *
 * Note that the file holds the wallet's addresses and balances, though no
 * keys. Then run, from the repository root:
 *
 *   bun scripts/benchmarks/store-diff.ts path/to/taho-state.json
 *
 * Without a path, it uses a synthetic state with 5,000 assets.
 */
// jsondiffpatch and immer are dependencies of the background package, not
// the repository root, so they're imported from there.
import {
  create,
  DiffContext,
  Filter,
} from "../../background/node_modules/jsondiffpatch"
import { produce } from "../../background/node_modules/immer"
import { decodeJSON, encodeJSON } from "../../background/lib/utils"
import {
  diff as currentDiff,
  patch,
  MAX_ELEMENT_DIFF_ARRAY_LENGTH,
} from "../../background/services/redux/differ"

type State = Record<string, any>

/** Checks whether a decoded value is an object, as a state or delta is. */
const isObject = (value: unknown): value is State =>
  typeof value === "object" && value !== null
type Differ = (left: unknown, right: unknown) => unknown

/** Diffs bigints as values, as the store's differ does. */
const bigintFilter: Filter<DiffContext> = (context) => {
  if (typeof context.left === "bigint" && typeof context.right === "bigint") {
    if (context.left !== context.right) {
      context.setResult([context.left, context.right])
    }
  }
}
bigintFilter.filterName = "bigint"

/** Returns a differ like the store's before long arrays were special. */
function matchingDiffer(): Differ {
  const differ = create()
  differ.processor.pipes.diff.before("objects", bigintFilter)
  return differ.diff.bind(differ)
}

/** Returns a differ that sends any changed long array whole. */
function replacingDiffer(): Differ {
  const differ = create()
  differ.processor.pipes.diff.before("objects", bigintFilter)
  const replaceLong: Filter<DiffContext> = (context) => {
    const { left, right } = context
    if (
      Array.isArray(left) &&
      Array.isArray(right) &&
      (left.length > MAX_ELEMENT_DIFF_ARRAY_LENGTH ||
        right.length > MAX_ELEMENT_DIFF_ARRAY_LENGTH)
    ) {
      context.setResult([left, right]).exit()
    }
  }
  replaceLong.filterName = "replaceLong"
  differ.processor.pipes.diff.before("arrays", replaceLong)
  return differ.diff.bind(differ)
}

const DIFFERS: [string, Differ][] = [
  ["matching", matchingDiffer()],
  ["replace", replacingDiffer()],
  ["current", currentDiff],
]

/** Returns a deep copy of a state, as the UI holds one. */
const copy = <T>(value: T): T => structuredClone(value)

/** A synthetic state, for running without a wallet's. */
function syntheticState(): State {
  const ids = Array.from(
    { length: 5_000 },
    (_, index) => `1/0x${index.toString(16).padStart(40, "0")}`,
  )
  const entities = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        symbol: `T${id.slice(-4)}`,
        name: "Token",
        decimals: 18,
        contractAddress: id.slice(2),
        homeNetwork: { chainID: "1", name: "Ethereum" },
        metadata: { tokenLists: [{ name: "List", url: "https://list" }] },
      },
    ]),
  )
  const address = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
  return {
    assets: { ids, entities },
    account: {
      accountsData: {
        evm: {
          "1": {
            [address]: {
              address,
              balances: Object.fromEntries(
                ids
                  .slice(0, 40)
                  .map((id) => [id, { amount: 10n ** 18n, retrievedAt: 0 }]),
              ),
            },
          },
        },
      },
    },
    activities: {
      activities: {
        [address]: {
          "1": Array.from({ length: 25 }, (_, index) => ({
            hash: `0x${index.toString(16).padStart(64, "0")}`,
            blockHeight: 1_000 + index,
          })),
        },
      },
    },
  }
}

/** State changes modeled on what the wallet does, each from `state`. */
function changesOf(state: State): [string, State][] {
  const changes: [string, State][] = []
  const { ids, entities } = state.assets ?? {}
  if (Array.isArray(ids) && ids.length > 0) {
    const withAssets = (newIDs: string[], newEntities = entities) => ({
      ...state,
      assets: { ...state.assets, ids: newIDs, entities: newEntities },
    })
    // Loading every asset again rebuilds the list and its entities, even
    // when nothing changed.
    changes.push([
      "asset list rebuilt",
      withAssets(
        [...ids],
        Object.fromEntries(
          Object.entries(entities).map(([id, asset]) => [
            id,
            isObject(asset) ? { ...asset } : asset,
          ]),
        ),
      ),
    ])
    changes.push(["asset list reordered", withAssets([...ids].reverse())])
    const middle = Math.floor(ids.length / 2)
    const added = "1/0x00000000000000000000000000000000000add3d"
    changes.push([
      "asset added",
      withAssets([...ids.slice(0, middle), added, ...ids.slice(middle)], {
        ...entities,
        [added]: { ...entities[ids[0]], symbol: "NEW" },
      }),
    ])
  }

  const evm = state.account?.accountsData?.evm ?? {}
  const [chainID, accounts] =
    Object.entries<Record<string, any>>(evm).find(([, byAddress]) =>
      Object.values(byAddress).some(
        (data) =>
          data !== "loading" && Object.keys(data.balances ?? {}).length > 0,
      ),
    ) ?? []
  if (chainID !== undefined && accounts !== undefined) {
    const [address, data] = Object.entries(accounts).find(
      ([, entry]) => entry !== "loading",
    )!
    const [assetID, balance] = Object.entries<any>(data.balances)[0]
    changes.push([
      "balance updated",
      {
        ...state,
        account: {
          ...state.account,
          accountsData: {
            ...state.account.accountsData,
            evm: {
              ...evm,
              [chainID]: {
                ...accounts,
                [address]: {
                  ...data,
                  balances: {
                    ...data.balances,
                    [assetID]: {
                      ...balance,
                      amount: BigInt(balance.amount) + 1n,
                    },
                  },
                },
              },
            },
          },
        },
      },
    ])
  }

  const activities = state.activities?.activities ?? {}
  const longest = Object.entries<Record<string, any[]>>(activities)
    .flatMap(([address, byChain]) =>
      Object.entries(byChain).map(([chain, list]) => ({
        address,
        chain,
        list,
      })),
    )
    .sort((a, b) => b.list.length - a.list.length)[0]
  if (longest !== undefined && longest.list.length > 0) {
    const { address, chain, list } = longest
    changes.push([
      "activity added",
      {
        ...state,
        activities: {
          ...state.activities,
          activities: {
            ...activities,
            [address]: {
              ...activities[address],
              [chain]: [{ ...list[0], hash: "0xnew" }, ...list.slice(0, -1)],
            },
          },
        },
      },
    ])
  }
  return changes
}

/**
 * Returns the median time of diffing `left` against `right`, running it up
 * to five times but stopping once the runs have taken over five seconds.
 */
function time(differ: Differ, left: unknown, right: unknown) {
  const durations: number[] = []
  let delta: unknown
  const startedAt = performance.now()
  while (durations.length < 5 && performance.now() - startedAt < 5_000) {
    const runStartedAt = performance.now()
    delta = differ(left, right)
    durations.push(performance.now() - runStartedAt)
  }
  durations.sort((a, b) => a - b)
  return { ms: durations[Math.floor(durations.length / 2)], delta }
}

/** Formats a size in bytes, kB or MB. */
const size = (bytes: number) =>
  bytes < 1_000
    ? `${bytes} B`
    : bytes < 1_000_000
      ? `${(bytes / 1_000).toFixed(1)} kB`
      : `${(bytes / 1_000_000).toFixed(2)} MB`

const path = process.argv[2]
let state: State
if (path === undefined) {
  state = syntheticState()
  console.log("No state given; using a synthetic one with 5,000 assets.")
} else {
  // Accept the saved state string, or an object holding it as `state`.
  const parsed = decodeJSON(await Bun.file(path).text())
  const decoded =
    isObject(parsed) && typeof parsed.state === "string"
      ? decodeJSON(parsed.state)
      : parsed
  if (!isObject(decoded)) {
    throw new Error(`${path} doesn't hold a saved state.`)
  }
  state = decoded
}
console.log(
  `State: ${size(encodeJSON(state).length)}, ` +
    `${state.assets?.ids?.length ?? 0} asset ids.\n`,
)

/**
 * Applies a delta the way the UI's proxy store does: decoded from the
 * message, then patched into an immer draft of the UI's copy of the state.
 * Returns the new state and how long that took.
 */
function applyLikeUI(uiState: unknown, encodedDelta: string) {
  const startedAt = performance.now()
  const next = produce(uiState, (draft) => {
    const delta = decodeJSON(encodedDelta)
    if (isObject(delta)) patch(draft, delta)
  })
  return { next, ms: performance.now() - startedAt }
}

const ms = (value: number) => Number(value.toFixed(1))

const rows: Record<string, string | number>[] = []
changesOf(state).forEach(([change, next]) => {
  DIFFERS.forEach(([name, differ]) => {
    const diffed = time(differ, state, next)
    const encodeStartedAt = performance.now()
    const encoded =
      diffed.delta === undefined ? undefined : encodeJSON(diffed.delta)
    const encodeMs = performance.now() - encodeStartedAt
    const applied =
      encoded === undefined
        ? { next: copy(state), ms: 0 }
        : applyLikeUI(copy(state), encoded)
    rows.push({
      change,
      differ: name,
      "diff ms": ms(diffed.ms),
      "encode ms": ms(encodeMs),
      delta: encoded === undefined ? "none" : size(encoded.length),
      "UI apply ms": ms(applied.ms),
      "applies right":
        encodeJSON(applied.next) === encodeJSON(next) ? "yes" : "NO",
    })
  })
})
console.table(rows)
