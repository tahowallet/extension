import "fake-indexeddb/auto"
import PreferenceService from ".."

describe.only("Foo", () => {
  it("should pass", () => {
    const preferenceService = PreferenceService.create()
  })
})
