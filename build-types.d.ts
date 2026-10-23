// Bun.build's `check` option type-checks the entry points and everything they
// import, and fails the build on errors. bun-types doesn't declare it yet.
export {}

declare module "bun" {
  interface BuildConfigBase {
    check?: boolean
  }
}
