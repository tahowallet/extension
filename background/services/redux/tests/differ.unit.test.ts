import assert from "assert"
import { produce } from "immer"
import { decodeJSON, encodeJSON } from "../../../lib/utils"
import { Delta, MAX_ELEMENT_DIFF_ARRAY_LENGTH, diff, patch } from "../differ"

const assetIDs = (count: number, prefix = "1/0x"): string[] =>
  Array.from(
    { length: count },
    (_, i) => `${prefix}${i.toString(16).padStart(40, "0")}`,
  )

// Shuffles deterministically, so that a failure can be reproduced.
const shuffled = <T>(items: T[]): T[] => {
  const result = [...items]
  let seed = 42
  for (let i = result.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    const j = seed % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Applies a delta the way the UI's proxy store does: encoded and decoded as
 * it is for messaging, then patched into an immer draft of the UI's state.
 */
const patchLikeUI = (state: unknown, delta: Delta): unknown => {
  const uiDelta = decodeJSON(encodeJSON(delta))
  assert(typeof uiDelta === "object" && uiDelta !== null)

  return produce(decodeJSON(encodeJSON(state)), (draft) =>
    patch(draft, uiDelta),
  )
}

describe("Diffing & Patching", () => {
  describe("BigInts", () => {
    const cases = [
      0,
      "test",
      2n,
      { b: 1 },
      [5],
      null,
      undefined,
      true,
      false,
      "",
      NaN,
    ]

    test("Creates correct patches when diffing against bigints", () => {
      cases.forEach((initial) => {
        const expected = 9999n
        const delta = diff(initial, expected)

        assert(delta)
        expect(patch(initial, delta)).toEqual(expected)
      })
    })

    test("Creates correct patches when diffing from bigints", () => {
      cases.forEach((expected) => {
        const initial = 9999n
        const delta = diff(initial, expected)

        assert(delta)
        expect(patch(initial, delta)).toEqual(expected)
      })
    })

    test("Creates correct patches regardless of depth of change", () => {
      cases.forEach((expected) => {
        const targetFrom = { a: { b: [0, { c: 9999n }] } }
        const target = { a: { b: [0, { c: expected }] } }

        const delta = diff(targetFrom, target)

        assert(delta)

        expect(patch(targetFrom, delta)).toEqual(target)
      })

      // against bigints
      cases.forEach((initial) => {
        const targetFrom = { a: { b: [0, { c: initial }] } }
        const target = { a: { b: [0, { c: 9999n }] } }

        const delta = diff(targetFrom, target)

        assert(delta)

        expect(patch(targetFrom, delta)).toEqual(target)
      })
    })

    test("Creates correct patches for bigints in long arrays", () => {
      const amounts = Array.from(
        { length: MAX_ELEMENT_DIFF_ARRAY_LENGTH + 1 },
        (_, i) => BigInt(i),
      )
      const changed = amounts.map((amount, i) => (i === 7 ? 9999n : amount))

      const delta = diff({ amounts }, { amounts: changed })

      assert(delta)
      expect(patchLikeUI({ amounts }, delta)).toEqual({ amounts: changed })
    })
  })

  describe("Arrays", () => {
    const longLength = MAX_ELEMENT_DIFF_ARRAY_LENGTH + 1

    test("Yields no delta for identical arrays", () => {
      const ids = assetIDs(5_000)

      expect(diff(ids, ids)).toBeUndefined()
      expect(diff({ assets: { ids } }, { assets: { ids } })).toBeUndefined()
    })

    test("Yields no delta for a rebuilt long array with the same items", () => {
      // An entity adapter's setAll rebuilds the ids array even when no
      // entity was added or removed.
      const ids = assetIDs(5_000)
      const entities = ids.map((id) => ({ id, symbol: "TEST" }))

      expect(diff({ ids }, { ids: [...ids] })).toBeUndefined()
      expect(
        diff(
          { entities },
          { entities: entities.map((entity) => ({ ...entity })) },
        ),
      ).toBeUndefined()
    })

    test("Replaces long arrays whose length changed", () => {
      const ids = assetIDs(longLength)
      const added = [...ids.slice(0, 50), "1/0xadded", ...ids.slice(50)]
      const removed = ids.slice(1)

      expect(diff(ids, added)).toEqual([ids, added])
      expect(diff(ids, removed)).toEqual([ids, removed])
      expect(diff([], ids)).toEqual([[], ids])
    })

    test("Patches long arrays in the UI at the root, in a slice and nested", () => {
      const ids = assetIDs(5_000)
      const variants = [
        [...ids.slice(0, 2_500), "1/0xa", "1/0xb", ...ids.slice(2_500)],
        ids.slice(0, 4_000),
        shuffled(ids),
        ids.map((id, i) => (i === 1_234 ? "1/0xreplaced" : id)),
      ]

      variants.forEach((newIDs) => {
        const states: [unknown, unknown][] = [
          [ids, newIDs],
          [{ ids }, { ids: newIDs }],
          [
            { assets: { ids, entities: {} }, other: { kept: true } },
            { assets: { ids: newIDs, entities: {} }, other: { kept: true } },
          ],
          [{ lists: [[1], ids] }, { lists: [[1], newIDs] }],
        ]

        states.forEach(([oldState, newState]) => {
          const delta = diff(oldState, newState)

          assert(delta)
          expect(patchLikeUI(oldState, delta)).toEqual(newState)
        })
      })
    })

    test("Patches changed items of a long array of objects by position", () => {
      const activities = Array.from({ length: longLength }, (_, i) => ({
        hash: `0x${i}`,
        blockHeight: i,
      }))
      const updated = activities.map((activity, i) =>
        i === 3 ? { ...activity, blockHeight: 9999 } : { ...activity },
      )

      const delta = diff({ activities }, { activities: updated })

      expect(delta).toEqual({
        activities: { _t: "a", 3: { blockHeight: [3, 9999] } },
      })
      assert(delta)
      expect(patchLikeUI({ activities }, delta)).toEqual({
        activities: updated,
      })
    })

    test("Still diffs short arrays item by item", () => {
      const ids = assetIDs(MAX_ELEMENT_DIFF_ARRAY_LENGTH - 1)
      const added = [...ids.slice(0, 50), "1/0xadded", ...ids.slice(50)]
      const moved = [ids[1], ids[0], ...ids.slice(2)]

      expect(diff(ids, added)).toEqual({ _t: "a", 50: ["1/0xadded"] })
      expect(diff(ids, moved)).toEqual({ _t: "a", _1: ["", 0, 3] })
      ;[added, moved].forEach((newIDs) => {
        const delta = diff({ ids }, { ids: newIDs })

        assert(delta)
        expect(patchLikeUI({ ids }, delta)).toEqual({ ids: newIDs })
      })
    })

    test("Replaces a long array whose item becomes or stops being undefined", () => {
      // At a fixed index, the deltas for these items would read as a removal
      // or an insertion, shifting every later item when patched.
      const items = assetIDs(MAX_ELEMENT_DIFF_ARRAY_LENGTH + 1).map((id) => ({
        id,
      }))
      const emptied = [undefined, ...items.slice(1)]
      ;[
        [items, emptied],
        [emptied, items],
      ].forEach(([left, right]) => {
        const delta = diff(left, right)

        expect(delta).toEqual([left, right])
        assert(delta)
        expect(patch(structuredClone(left), delta)).toEqual(right)
      })
    })

    test("Replaces a long array when most of its items changed", () => {
      // A delta per position for a reversed list would be larger than both
      // lists, so the list is sent whole instead.
      const ids = assetIDs(5_000)
      const reversed = [...ids].reverse()
      const oneReplaced = ids.map((id, i) => (i === 1_234 ? "1/0xnew" : id))

      expect(diff(ids, reversed)).toEqual([ids, reversed])
      expect(diff(ids, oneReplaced)).toEqual({
        _t: "a",
        1234: [ids[1_234], "1/0xnew"],
      })
    })

    test("Diffs a reorder of 5,000 asset ids quickly", () => {
      // Matching items across a reorder of 5,000 ids took about 400ms, during
      // which nothing else in the background could run.
      const ids = assetIDs(5_000)
      const reordered = shuffled(ids)

      const startedAt = performance.now()
      const delta = diff({ assets: { ids } }, { assets: { ids: reordered } })
      const duration = performance.now() - startedAt

      expect(duration).toBeLessThan(50)
      assert(delta)
      expect(patchLikeUI({ assets: { ids } }, delta)).toEqual({
        assets: { ids: reordered },
      })
    })
  })
})
