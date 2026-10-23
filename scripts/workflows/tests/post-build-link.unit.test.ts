import {
  type WorkflowRun,
  headMatches,
  ineligibilityReason,
  pullRequestNumber,
  selectBuildArtifact,
  updatedBody,
} from "../post-build-link"

const run: WorkflowRun = {
  event: "pull_request",
  status: "completed",
  conclusion: "success",
  path: ".github/workflows/build.yml",
  headSha: "581bdcca9c422e3d25a409eef6c210ddab4ceb9b",
  checkSuiteId: 108404058825,
  updatedAt: "2026-10-23T17:19:53Z",
}

describe("ineligibilityReason", () => {
  it("accepts completed pull request builds that weren't cut short", () => {
    expect(ineligibilityReason(run)).toBeUndefined()
    expect(ineligibilityReason({ ...run, conclusion: "failure" })).toBe(
      undefined,
    )
  })

  it("skips cancelled, skipped, and otherwise cut short builds", () => {
    for (const conclusion of [
      "cancelled",
      "skipped",
      "startup_failure",
      "action_required",
      null,
    ]) {
      expect(ineligibilityReason({ ...run, conclusion })).toBeDefined()
    }
  })

  it("skips builds that aren't completed", () => {
    expect(
      ineligibilityReason({ ...run, status: "in_progress", conclusion: null }),
    ).toBeDefined()
  })

  it("skips builds of pushes and tags", () => {
    expect(ineligibilityReason({ ...run, event: "push" })).toBeDefined()
  })

  it("skips runs of other workflows", () => {
    expect(
      ineligibilityReason({ ...run, path: ".github/workflows/other.yml" }),
    ).toBeDefined()
  })
})

describe("selectBuildArtifact", () => {
  const regular = { id: 1, name: "extension-builds-3861" }
  const fork = { id: 2, name: "extension-builds-fork-3861" }

  it("picks the regular build when it's listed first", () => {
    expect(selectBuildArtifact([regular, fork])).toEqual(regular)
  })

  it("picks the regular build when the fork build is listed first", () => {
    expect(selectBuildArtifact([fork, regular])).toEqual(regular)
  })

  it("finds nothing without a regular build", () => {
    expect(selectBuildArtifact([fork])).toBeUndefined()
    expect(selectBuildArtifact([])).toBeUndefined()
  })

  it("ignores names that only start like a build", () => {
    expect(
      selectBuildArtifact([{ id: 3, name: "extension-builds-3861-extra" }]),
    ).toBeUndefined()
  })
})

describe("pullRequestNumber", () => {
  it("reads pull request numbers", () => {
    expect(pullRequestNumber("extension-builds-3861")).toEqual({
      kind: "pull-request",
      number: 3861,
    })
  })

  it("recognizes builds of commits", () => {
    expect(pullRequestNumber("extension-builds-581bdcca9c42")).toEqual({
      kind: "commit",
    })
  })

  it("rejects other names", () => {
    expect(() => pullRequestNumber("extension-builds-fork-3861")).toThrow(
      "Unexpected build artifact name",
    )
  })
})

describe("headMatches", () => {
  it("accepts a pull request whose head is the built commit", () => {
    expect(headMatches(run.headSha, run)).toBe(true)
  })

  it("rejects a pull request whose head is another commit", () => {
    expect(headMatches("1be6c31e9000000000000000000000000000000a", run)).toBe(
      false,
    )
  })
})

describe("updatedBody", () => {
  const artifact = { id: 12518841999, name: "extension-builds-3861" }
  const url =
    "https://github.com/tahowallet/extension/suites/108404058825/artifacts/12518841999"
  const link = `Latest build: [extension-builds-3861](${url}) (as of Fri, 23 Oct 2026 17:19:53 GMT).`

  it("appends a link to a description without one", () => {
    expect(updatedBody("## What", artifact, url, run.updatedAt)).toBe(
      `## What\n\n${link}`,
    )
  })

  it("replaces an existing link", () => {
    expect(
      updatedBody(
        "## What\n\nLatest build: [old](https://example.com) (as of then).",
        artifact,
        url,
        run.updatedAt,
      ),
    ).toBe(`## What\n\n${link}`)
  })

  it("handles an empty description", () => {
    expect(updatedBody("", artifact, url, run.updatedAt)).toBe(`\n\n${link}`)
  })
})
