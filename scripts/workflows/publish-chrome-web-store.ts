/* Console output is this script's log in the workflow run. */
/* oxlint-disable no-console, no-await-in-loop */
/**
 * Uploads an extension zip to a Chrome Web Store listing and submits it for
 * review, using the Chrome Web Store API v2.
 *
 * Only one submission can be in review at a time, so if the listing already
 * has one, nothing is uploaded and `published=false` is written to
 * GITHUB_OUTPUT; the next run tries again with whatever is newest then.
 *
 * Run from the repository root with CHROME_WEB_STORE_TOKEN (an access token
 * with the chromewebstore scope), CHROME_PUBLISHER_ID and CHROME_EXTENSION_ID:
 * `bun scripts/workflows/publish-chrome-web-store.ts <zip>`.
 */
import { appendFileSync } from "fs"

const API_URL = "https://chromewebstore.googleapis.com"

const UPLOAD_POLL_INTERVAL_MS = 5_000
const UPLOAD_POLL_ATTEMPTS = 24

export type ItemState =
  | "ITEM_STATE_UNSPECIFIED"
  | "PENDING_REVIEW"
  | "STAGED"
  | "PUBLISHED"
  | "PUBLISHED_TO_TESTERS"
  | "REJECTED"
  | "CANCELLED"

export type UploadState =
  | "UPLOAD_STATE_UNSPECIFIED"
  | "SUCCEEDED"
  | "IN_PROGRESS"
  | "FAILED"
  | "NOT_FOUND"

type ItemRevisionStatus = {
  state?: ItemState
  distributionChannels?: { crxVersion?: string; deployPercentage?: number }[]
}

export type ItemStatus = {
  publishedItemRevisionStatus?: ItemRevisionStatus
  submittedItemRevisionStatus?: ItemRevisionStatus
  lastAsyncUploadState?: UploadState
  takenDown?: boolean
  warned?: boolean
}

/**
 * Returns why a new version can't be submitted to a listing with this status,
 * or undefined if it can.
 */
export function submissionBlocker(status: ItemStatus): string | undefined {
  if (status.takenDown) {
    return "the listing was taken down for a policy violation"
  }
  const submitted = status.submittedItemRevisionStatus
  if (submitted?.state === "PENDING_REVIEW") {
    const version = submitted.distributionChannels?.[0]?.crxVersion
    return `version ${version ?? "(unknown)"} is still in review`
  }
  return undefined
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable ${name}`)
  }
  return value
}

async function storeRequest(
  path: string,
  init: { method?: string; body?: BodyInit; json?: unknown } = {},
): Promise<unknown> {
  const response = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${requiredEnv("CHROME_WEB_STORE_TOKEN")}`,
      ...(init.json === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body: init.json === undefined ? init.body : JSON.stringify(init.json),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(
      `${init.method ?? "GET"} ${path} failed with ${response.status}: ${text}`,
    )
  }
  return text === "" ? {} : JSON.parse(text)
}

function setOutput(name: string, value: string) {
  const outputPath = process.env.GITHUB_OUTPUT
  if (outputPath) appendFileSync(outputPath, `${name}=${value}\n`)
}

async function main() {
  const zipPath = process.argv[2]
  if (!zipPath) throw new Error("Usage: publish-chrome-web-store.ts <zip>")

  const item = `publishers/${requiredEnv("CHROME_PUBLISHER_ID")}/items/${requiredEnv("CHROME_EXTENSION_ID")}`
  const fetchStatus = async () =>
    (await storeRequest(`/v2/${item}:fetchStatus`)) as ItemStatus

  const blocker = submissionBlocker(await fetchStatus())
  if (blocker) {
    console.log(`Not publishing: ${blocker}.`)
    setOutput("published", "false")
    return
  }

  const upload = (await storeRequest(`/upload/v2/${item}:upload`, {
    method: "POST",
    body: Bun.file(zipPath),
  })) as { uploadState?: UploadState; crxVersion?: string }

  let uploadState = upload.uploadState
  for (
    let attempt = 0;
    uploadState === "IN_PROGRESS" && attempt < UPLOAD_POLL_ATTEMPTS;
    attempt += 1
  ) {
    await Bun.sleep(UPLOAD_POLL_INTERVAL_MS)
    uploadState = (await fetchStatus()).lastAsyncUploadState
  }
  if (uploadState !== "SUCCEEDED") {
    throw new Error(`Upload ended as ${uploadState ?? "nothing"}`)
  }
  console.log(`Uploaded version ${upload.crxVersion ?? "(processing)"}.`)

  const submission = (await storeRequest(`/v2/${item}:publish`, {
    method: "POST",
    json: { publishType: "DEFAULT_PUBLISH" },
  })) as {
    state?: ItemState
    warningInfo?: { warnings?: { reason?: string; description?: string }[] }
  }
  submission.warningInfo?.warnings?.forEach(({ reason, description }) =>
    console.log(`Warning: ${reason}: ${description}`),
  )
  console.log(`Submitted; the listing is now ${submission.state}.`)
  setOutput("published", "true")
}

if (import.meta.main) {
  await main()
}
