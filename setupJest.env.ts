/* Reset IndexedDB between tests */
beforeEach(() => {
  global.indexedDB = new IDBFactory()
})

/* Reset IndexedDB between tests */
afterEach(() => {
  global.indexedDB = new IDBFactory()
})

it.flaky = function checkFlaky(label: string, testCase: () => unknown): void {
  // eslint-disable-next-line no-only-tests/no-only-tests
  it.only(label, () => {
    const results = []
    for (let i = 0; i < 2000; i += 1) {
      results.push(testCase())
    }
    return Promise.all(results)
  })
}

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars
declare namespace jest {
  interface It {
    /**
     * Used for debugging flaky tests
     */
    flaky: (label: string, testCase: () => unknown) => void
  }
}
