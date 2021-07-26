import { v0 } from './00'

export interface Migration {
  version: number
  migration: (any) => any
}

const migrations : Migration[] = [
  v0,
]

export async function migrate (versionedState) {
  return migrations.reduce(async (newVersionedState, { migration }) => {
    const state = await newVersionedState
    return migration(state)
  }, Promise.resolve(versionedState))
}
