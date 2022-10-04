/* Reset IndexedDB between tests */
afterEach(() => {
  global.indexedDB = new IDBFactory()
})
