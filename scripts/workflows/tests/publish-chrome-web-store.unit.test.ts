import { submissionBlocker } from "../publish-chrome-web-store"

describe("submissionBlocker", () => {
  it("allows a submission when nothing is in review", () => {
    expect(submissionBlocker({})).toBeUndefined()
    expect(
      submissionBlocker({
        publishedItemRevisionStatus: { state: "PUBLISHED" },
        submittedItemRevisionStatus: { state: "REJECTED" },
      }),
    ).toBeUndefined()
  })

  it("blocks while a version is in review", () => {
    expect(
      submissionBlocker({
        submittedItemRevisionStatus: {
          state: "PENDING_REVIEW",
          distributionChannels: [{ crxVersion: "0.66.0.12" }],
        },
      }),
    ).toBe("version 0.66.0.12 is still in review")
  })

  it("blocks taken-down listings", () => {
    expect(submissionBlocker({ takenDown: true })).toBe(
      "the listing was taken down for a policy violation",
    )
  })
})
