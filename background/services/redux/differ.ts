import { DiffContext, Filter, create } from "jsondiffpatch"

const differ = create()

const bigintDiffFilter: Filter<DiffContext> = (context) => {
  if (typeof context.left === "bigint" && typeof context.right === "bigint") {
    if (context.left !== context.right) {
      context.setResult([context.left, context.right])
    }
  }
}
bigintDiffFilter.filterName = "bigint"

differ.processor.pipes.diff.before("objects", bigintDiffFilter)

/**
 * The longest array, in items, that is still diffed element by element.
 * Diffing an array matches items with a longest common subsequence search,
 * whose cost grows with the product of the two lengths. Reordering 100
 * strings takes about 0.2ms, 500 take about 5ms, 5,000 take about 400ms and
 * 20,000 take about 7s. Arrays in the store up to this length, such as an
 * account's activities, are cheap to match and gain from small deltas.
 * Longer ones, such as the thousands of token list asset ids in
 * `assets.ids`, are replaced whole instead.
 */
export const MAX_ELEMENT_DIFF_ARRAY_LENGTH = 100

/**
 * Diffs two arrays of the same length item by item at each index, without
 * matching moved items. Returns an array delta, or undefined if no item
 * changed. Returns null when the array is better sent whole: when more than
 * half its items changed, as when a list of 5,000 asset ids is reversed and a
 * delta per position would be larger than both arrays, or when an item's
 * delta would read as an insertion or a removal in an array delta. That
 * happens when the item on either side is undefined, and applying either at
 * a fixed index would shift later items.
 */
function diffByPosition(
  left: unknown[],
  right: unknown[],
): Record<string, unknown> | undefined | null {
  const delta: Record<string, unknown> = { _t: "a" }
  let changed = 0
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      const itemDelta = differ.diff(left[i], right[i])
      if (
        Array.isArray(itemDelta) &&
        (itemDelta.length === 1 ||
          (itemDelta.length === 3 && itemDelta[2] === 0))
      ) {
        return null
      }
      if (itemDelta !== undefined) {
        delta[i] = itemDelta
        changed += 1
        if (changed * 2 > left.length) {
          return null
        }
      }
    }
  }
  return changed > 0 ? delta : undefined
}

/**
 * Diffs arrays longer than `MAX_ELEMENT_DIFF_ARRAY_LENGTH` without the
 * longest common subsequence search, so a reordered or rebuilt long array
 * can't block the background for seconds.
 *
 * Arrays of the same length are diffed item by item at each index. The
 * entity adapter's `setAll`, for example, rebuilds `assets.ids` on every
 * full `assetsLoaded` even when no asset was added or removed, and that
 * yields no delta. Arrays of different lengths are replaced whole. Note that
 * the delta then carries both arrays, which for 5,000 asset ids is about
 * 470KB to send to the UI, but encoding that takes about 1ms, far less than
 * matching them.
 */
const longArrayDiffFilter: Filter<DiffContext> = (context) => {
  const { left, right } = context
  if (
    Array.isArray(left) &&
    Array.isArray(right) &&
    (left.length > MAX_ELEMENT_DIFF_ARRAY_LENGTH ||
      right.length > MAX_ELEMENT_DIFF_ARRAY_LENGTH)
  ) {
    const positionalDelta =
      left.length === right.length ? diffByPosition(left, right) : null
    context
      .setResult(positionalDelta === null ? [left, right] : positionalDelta)
      .exit()
  }
}
longArrayDiffFilter.filterName = "longArray"

differ.processor.pipes.diff.before("arrays", longArrayDiffFilter)

export const diff = differ.diff.bind(differ)
export const patch = differ.patch.bind(differ)
export type { Delta } from "jsondiffpatch"
