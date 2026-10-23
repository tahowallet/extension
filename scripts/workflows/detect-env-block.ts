/* Console output is this script's log in the workflow run. */
/* oxlint-disable no-console */
/**
 * Finds the "Testing Env" block in a pull request's description and sets the
 * `block` step output to its allowed lines, for dev builds to add to .env.
 *
 * The PR description is author-controlled, so only lines setting variables
 * with an allowed prefix are kept, and the result is only ever written to
 * .env verbatim, never interpreted by a shell.
 *
 * Run from the repository root: `bun scripts/workflows/detect-env-block.ts`.
 */
import { githubRequest, isRecord, repository, setOutput } from "./github-api"

const ALLOWED_PREFIXES = ["ENABLE_", "USE_", "SHOW_", "SUPPORT_"]

const ENV_BLOCK_PATTERN = /## Testing Env(?:ironment)?\s+```.*\r?\n([^`]+?)```/i

/**
 * Extracts the allowed lines of a PR description's testing env block,
 * reporting how many non-empty lines were dropped for having a disallowed
 * variable name.
 */
export function parseEnvBlock(body: string): {
  block: string
  droppedLines: number
} {
  const lines = (body.match(ENV_BLOCK_PATTERN)?.[1] ?? "")
    .trim()
    .split(/\r?\n/)
    .filter((line) => line !== "")

  const allowedLines = lines.filter((line) => {
    const [name] = line.split("=")
    return ALLOWED_PREFIXES.some((prefix) => name.startsWith(prefix))
  })

  return {
    block: allowedLines.join("\n"),
    droppedLines: lines.length - allowedLines.length,
  }
}

async function pullRequestNumber(): Promise<number | undefined> {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (eventPath === undefined) {
    return undefined
  }

  const event: unknown = await Bun.file(eventPath).json()
  const pullRequest = isRecord(event) ? event.pull_request : undefined
  const number = isRecord(pullRequest) ? pullRequest.number : undefined
  return typeof number === "number" ? number : undefined
}

async function main(): Promise<void> {
  const number = await pullRequestNumber()
  if (number === undefined) {
    console.error("Not a pull request event; no env block to detect.")
    await setOutput("block", "")
    return
  }

  // Fetch the PR rather than reading the event payload, so re-running a
  // build picks up edits to the description.
  const pullRequest = await githubRequest(
    `/repos/${repository()}/pulls/${number}`,
  )
  const body = isRecord(pullRequest) ? pullRequest.body : undefined

  const { block, droppedLines } = parseEnvBlock(
    typeof body === "string" ? body : "",
  )
  if (droppedLines > 0) {
    console.warn(`Filtered ${droppedLines} disallowed env lines.`)
  }
  console.log("Detected env block", block)

  await setOutput("block", block)
}

if (import.meta.main) {
  await main()
}
