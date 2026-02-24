/* Reset IndexedDB between tests */
beforeEach(() => {
  global.indexedDB = new IDBFactory()
})

/* Reset IndexedDB between tests */
afterEach(() => {
  global.indexedDB = new IDBFactory()
})

it.flaky = function checkFlaky(label: string, testCase: () => unknown): void {
  it.only(label, () => {
    const results = []
    for (let i = 0; i < 2000; i += 1) {
      results.push(testCase())
    }
    return Promise.all(results)
  })
}

declare namespace jest {
  interface It {
    /**
     * Used for debugging flaky tests
     */
    flaky: (label: string, testCase: () => unknown) => void
  }
}
