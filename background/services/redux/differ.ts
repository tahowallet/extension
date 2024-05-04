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

export const diff = differ.diff.bind(differ)
export const patch = differ.patch.bind(differ)
export type { Delta } from "jsondiffpatch"
