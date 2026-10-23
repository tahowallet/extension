import { expect } from "bun:test"
import { diff } from "jest-diff"
import * as matchers from "@testing-library/jest-dom/matchers"
import "./_locales/i18n"
import "./__mocks__/IntersectionObserver"

// Bun's expect.extend doesn't provide this.utils.diff, which jest-dom's
// error formatting paths need (e.g. toHaveStyle's expectedDiff). Wrap each
// matcher so `this.utils.diff` is always available.
const wrapped = Object.fromEntries(
  Object.entries(matchers).map(([name, matcher]) => [
    name,
    function (this: { utils: Record<string, unknown> }, ...args: unknown[]) {
      if (this.utils && !this.utils.diff) {
        this.utils.diff = diff
      }
      return (matcher as Function).apply(this, args)
    },
  ]),
)

expect.extend(wrapped)
