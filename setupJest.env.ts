/* Reset IndexedDB between tests */
beforeEach(() => {
  global.indexedDB = new IDBFactory()
})

/* Reset IndexedDB between tests */
afterEach(() => {
  global.indexedDB = new IDBFactory()
})
