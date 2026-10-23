/* Console output is this script's log in the workflow run. */
/* oxlint-disable no-console */
/**
 * Adds or updates a "Latest build" link in a pull request's description,
 * pointing at the extension build artifact of a completed Build run.
 *
 * This runs from the default branch with a token that can edit pull requests,
 * for builds of pull requests that may come from forks. It only ever reads
 * the run's and artifacts' metadata through the API; artifact contents are
 * never downloaded, let alone trusted or executed.
 *
 * Run from the repository root, with the run id in WORKFLOW_RUN_ID:
 * `bun scripts/workflows/post-build-link.ts [--dry-run]`. With --dry-run, the
 * updated description is printed instead of saved.
 */
import { githubRequest, isRecord, repository } from "./github-api"

export type WorkflowRun = {
  event: string
  status: string
  conclusion: string | null
  path: string
  headSha: string
  checkSuiteId: number
  updatedAt: string
}

export type Artifact = { id: number; name: string }

const BUILD_WORKFLOW_PATH = ".github/workflows/build.yml"

// Runs that finished without being cut short. Failed runs are included, since
// the build artifact is uploaded before the tests that are likelier to fail.
const LINKABLE_CONCLUSIONS = ["success", "failure", "timed_out"]

/**
 * Returns why a workflow run shouldn't get a build link, or undefined if it
 * should: it must be a completed, uncancelled Build run for a pull request.
 */
export function ineligibilityReason(run: WorkflowRun): string | undefined {
  if (run.path !== BUILD_WORKFLOW_PATH) {
    return `run is for ${run.path}, not ${BUILD_WORKFLOW_PATH}`
  }
  if (run.event !== "pull_request") {
    return `run was triggered by ${run.event}, not a pull request`
  }
  if (run.status !== "completed") {
    return `run is ${run.status}, not completed`
  }
  if (
    run.conclusion === null ||
    !LINKABLE_CONCLUSIONS.includes(run.conclusion)
  ) {
    return `run concluded as ${run.conclusion ?? "nothing"}`
  }
  return undefined
}

/**
 * Picks the regular extension build artifact. Builds upload both the regular
 * bundle (extension-builds-<PR or commit>) and a mainnet fork bundle
 * (extension-builds-fork-<PR or commit>), and the API doesn't list them in a
 * stable order, so the regular bundle's name is matched exactly.
 */
export function selectBuildArtifact(
  artifacts: Artifact[],
): Artifact | undefined {
  return artifacts.find((artifact) =>
    /^extension-builds-[0-9a-f]+$/.test(artifact.name),
  )
}

/**
 * Reads the pull request number from a build artifact's name. Builds of
 * commits rather than pull requests are named for the commit's hash instead,
 * and have no pull request.
 */
export function pullRequestNumber(
  artifactName: string,
): { kind: "pull-request"; number: number } | { kind: "commit" } {
  const suffix = artifactName.match(/^extension-builds-([0-9a-f]+)$/)?.[1]
  if (suffix === undefined) {
    throw new Error(`Unexpected build artifact name ${artifactName}`)
  }
  return /^[0-9]+$/.test(suffix)
    ? { kind: "pull-request", number: Number(suffix) }
    : { kind: "commit" }
}

/**
 * Checks that a pull request's head is the commit the run built. The artifact
 * name, and so the pull request number, comes from the pull request's own
 * workflow file, so without this a pull request could point another one's
 * build link at itself. A pull request that has since moved on is skipped
 * too, as its own newer build will link itself.
 */
export function headMatches(
  pullRequestHeadSha: string,
  run: WorkflowRun,
): boolean {
  return pullRequestHeadSha === run.headSha
}

/**
 * Replaces any existing "Latest build" line at the end of a pull request
 * description with a link to the given artifact.
 */
export function updatedBody(
  body: string,
  artifact: Artifact,
  artifactUrl: string,
  updatedAt: string,
): string {
  return `${body.replace(/\s+Latest build: [^\n]*/, "")}\n\nLatest build: [${
    artifact.name
  }](${artifactUrl}) (as of ${new Date(updatedAt).toUTCString()}).`
}

function parseWorkflowRun(data: unknown): WorkflowRun {
  if (
    isRecord(data) &&
    typeof data.event === "string" &&
    typeof data.status === "string" &&
    (typeof data.conclusion === "string" || data.conclusion === null) &&
    typeof data.path === "string" &&
    typeof data.head_sha === "string" &&
    typeof data.check_suite_id === "number" &&
    typeof data.updated_at === "string"
  ) {
    return {
      event: data.event,
      status: data.status,
      conclusion: data.conclusion,
      path: data.path,
      headSha: data.head_sha,
      checkSuiteId: data.check_suite_id,
      updatedAt: data.updated_at,
    }
  }
  throw new Error(`Unexpected workflow run response: ${JSON.stringify(data)}`)
}

function parseArtifacts(data: unknown): Artifact[] {
  const artifacts = isRecord(data) ? data.artifacts : undefined
  if (!Array.isArray(artifacts)) {
    throw new Error(`Unexpected artifacts response: ${JSON.stringify(data)}`)
  }
  return artifacts.flatMap((artifact: unknown) =>
    isRecord(artifact) &&
    typeof artifact.id === "number" &&
    typeof artifact.name === "string"
      ? [{ id: artifact.id, name: artifact.name }]
      : [],
  )
}

function parsePullRequest(data: unknown): { body: string; headSha: string } {
  const head = isRecord(data) ? data.head : undefined
  const headSha = isRecord(head) ? head.sha : undefined
  const body = isRecord(data) ? data.body : undefined
  if (typeof headSha !== "string") {
    throw new Error(`Unexpected pull request response: ${JSON.stringify(data)}`)
  }
  return { body: typeof body === "string" ? body : "", headSha }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run")

  const runId = process.env.WORKFLOW_RUN_ID ?? ""
  if (!/^[0-9]+$/.test(runId)) {
    throw new Error(`Invalid workflow run id "${runId}"`)
  }

  const repo = repository()
  const run = parseWorkflowRun(
    await githubRequest(`/repos/${repo}/actions/runs/${runId}`),
  )

  const reason = ineligibilityReason(run)
  if (reason !== undefined) {
    console.log(`Skipping build link: ${reason}.`)
    return
  }

  const artifacts = parseArtifacts(
    await githubRequest(`/repos/${repo}/actions/runs/${runId}/artifacts`),
  )
  const artifact = selectBuildArtifact(artifacts)
  if (artifact === undefined) {
    // The build itself can fail before uploading anything.
    console.log(
      `Skipping build link: no build artifact among ${JSON.stringify(artifacts)}.`,
    )
    return
  }

  const pullRequest = pullRequestNumber(artifact.name)
  if (pullRequest.kind === "commit") {
    console.log("Skipping build link: the build was for a commit, not a PR.")
    return
  }

  const pullRequestPath = `/repos/${repo}/pulls/${pullRequest.number}`
  const { body, headSha } = parsePullRequest(
    await githubRequest(pullRequestPath),
  )
  if (!headMatches(headSha, run)) {
    console.log(
      `Skipping build link: PR #${pullRequest.number}'s head ${headSha} isn't the built commit ${run.headSha}.`,
    )
    return
  }

  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com"
  const artifactUrl = `${serverUrl}/${repo}/suites/${run.checkSuiteId}/artifacts/${artifact.id}`
  const newBody = updatedBody(body, artifact, artifactUrl, run.updatedAt)

  if (dryRun) {
    console.log(
      `Dry run: would link PR #${pullRequest.number} to ${artifact.name} at ${artifactUrl}, giving the description:\n${newBody}`,
    )
    return
  }

  console.log(
    `Linking PR #${pullRequest.number} to ${artifact.name} at ${artifactUrl}.`,
  )
  await githubRequest(pullRequestPath, {
    method: "PATCH",
    body: { body: newBody },
  })
}

if (import.meta.main) {
  await main()
}
