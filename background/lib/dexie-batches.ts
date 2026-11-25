import type { IndexableType, Table } from "dexie"

/**
 * How many rows {@link deleteInBatches} reads or deletes in one transaction.
 * Small enough that a batch of the largest rows, chain transactions, takes
 * well under the 100ms that background work may hold the thread for.
 */
export const DELETE_BATCH_SIZE = 200

/** Yields to other work in the background before continuing. */
export const yieldToOtherWork = (): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })

/**
 * Deletes the rows with the given primary keys, {@link DELETE_BATCH_SIZE} at
 * a time, yielding to other work between batches, and returns how many rows
 * were deleted.
 *
 * Deleting a removed network's rows can mean deleting thousands at once,
 * such as every block and transaction seen on a busy fork, and doing that in
 * one transaction would hold up the background for as long as it takes.
 *
 * Note that when `matches` is given, each batch's rows are read first and
 * only those it accepts are deleted. This is for tables whose indexes can't
 * single out a chain's rows, so the rows themselves have to be checked.
 *
 * @param table The table to delete rows from.
 * @param keys The primary keys of the rows to consider.
 * @param matches Decides, from a row's contents, whether to delete it.
 */
export async function deleteInBatches<T, K extends IndexableType>(
  table: Table<T, K>,
  keys: K[],
  matches?: (row: T) => boolean,
): Promise<number> {
  let deleted = 0
  for (let start = 0; start < keys.length; start += DELETE_BATCH_SIZE) {
    if (start > 0) {
      // oxlint-disable-next-line no-await-in-loop
      await yieldToOtherWork()
    }
    const batch = keys.slice(start, start + DELETE_BATCH_SIZE)
    // oxlint-disable-next-line no-await-in-loop
    deleted += await table.db.transaction("rw", table, async () => {
      let doomed = batch
      if (matches !== undefined) {
        const rows = await table.bulkGet(batch)
        doomed = batch.filter((_, index) => {
          const row = rows[index]
          return row !== undefined && matches(row)
        })
      }
      await table.bulkDelete(doomed)
      return doomed.length
    })
  }
  return deleted
}

/**
 * Returns the primary keys of the rows that `matches` accepts, reading the
 * table {@link DELETE_BATCH_SIZE} rows at a time in primary key order and
 * yielding to other work between pages.
 *
 * This is for tables with no index that singles out the rows wanted, which
 * leaves reading every row as the only way to find them. Paging keeps that
 * from holding up the background however large the table is.
 *
 * @param table The table to search.
 * @param matches Decides, from a row's contents, whether it is wanted.
 */
export async function findPrimaryKeys<T, K extends IndexableType>(
  table: Table<T, K>,
  matches: (row: T) => boolean,
): Promise<K[]> {
  const found: K[] = []
  let after: K | undefined
  for (;;) {
    const page = (
      after === undefined
        ? table.orderBy(":id")
        : table.where(":id").above(after)
    ).limit(DELETE_BATCH_SIZE)
    // oxlint-disable-next-line no-await-in-loop
    const [rows, keys] = await table.db.transaction("r", table, () =>
      Promise.all([page.toArray(), page.primaryKeys()]),
    )
    rows.forEach((row, index) => {
      if (matches(row)) found.push(keys[index])
    })
    if (keys.length < DELETE_BATCH_SIZE) return found
    after = keys[keys.length - 1]
    // oxlint-disable-next-line no-await-in-loop
    await yieldToOtherWork()
  }
}
