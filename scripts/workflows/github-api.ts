/* Console output is this script's log in the workflow run. */
/* oxlint-disable no-console */
/**
 * Minimal GitHub REST helpers for workflow scripts, using the token and
 * repository the Actions runner provides. Scripts run from the repository
 * root with plain bun and no installed dependencies.
 */

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable ${name}`)
  }
  return value
}

export function repository(): string {
  return requiredEnv("GITHUB_REPOSITORY")
}

/**
 * Makes an authenticated request against the GitHub REST API, returning the
 * parsed JSON response, and throwing with the response body on failure.
 * Callers check the response's shape themselves rather than trusting it.
 */
export async function githubRequest(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com"
  const response = await fetch(`${apiUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${requiredEnv("GITHUB_TOKEN")}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })

  if (!response.ok) {
    throw new Error(
      `GitHub API ${init.method ?? "GET"} ${path} failed with ${response.status}: ${await response.text()}`,
    )
  }

  return response.json()
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Sets a step output, using a random heredoc delimiter so multi-line values,
 * or values containing the delimiter, can't spill into other outputs.
 */
export async function setOutput(name: string, value: string): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT
  if (outputPath === undefined) {
    // Running outside Actions, e.g. locally; just show the value.
    console.log(`${name}=${value}`)
    return
  }

  const delimiter = `EOF_${crypto.randomUUID()}`
  const existing = (await Bun.file(outputPath).exists())
    ? await Bun.file(outputPath).text()
    : ""
  await Bun.write(
    outputPath,
    `${existing}${name}<<${delimiter}\n${value}\n${delimiter}\n`,
  )
}
