import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers"

// Teaches bun's `expect` about jest-dom's matchers, which ui/setupBun.env.ts
// registers at runtime via expect.extend.
declare module "bun:test" {
  interface Matchers<T> extends TestingLibraryMatchers<unknown, T> {}
}
