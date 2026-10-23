export {}

declare module "bun:test" {
  // bun implements jest.mock at runtime (hoisted above imports like Jest's),
  // but bun-types doesn't declare it.
  namespace jest {
    function mock(moduleName: string, factory?: () => unknown): void
  }
}
