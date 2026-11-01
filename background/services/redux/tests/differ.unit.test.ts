import assert from "assert"
import { diff, patch } from "../differ"

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
  })
})
