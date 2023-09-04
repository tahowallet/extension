// @ts-check
/* Allow console output for debug information in Actions output. */
/* eslint-disable no-console */

/**
 * @param {object} ctx Context
 * @param {InstanceType<import("@actions/github/lib/utils")["GitHub"]>} ctx.github
 * @param {import("@actions/github")["context"]} ctx.context
 * @returns {Promise<string>}
 */
module.exports = async function detectEnvBlock({ github, context }) {
  const {
    status,
    data: { body },
  } = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue?.number,
  })

  if (
    status !== 200 ||
    body === null ||
    body === undefined ||
    typeof body !== "string"
  ) {
    console.error(
      "Failed to look up PR from number",
      context.issue?.number,
      "; status code was ",
      status,
      ". ",
    )
    return ""
  }

  const envBlockMatch =
    body.match(/## Testing Env(?:ironment)?\s+```.*\r?\n([^`]+?)```/i)?.[1] ??
    ""
  const envLines = envBlockMatch.trim().split(/\r?\n/)

  const validEnvLines = envLines
    .map((envVar) => envVar.split("="))
    .filter(
      ([varName]) =>
        varName.startsWith("ENABLE_") ||
        varName.startsWith("USE_") ||
        varName.startsWith("SHOW_") ||
        varName.startsWith("SUPPORT_"),
    )
    .map((varPair) => varPair.join("="))

  const validEnvBlock = validEnvLines.join("\n")

  if (envLines.length !== validEnvLines.length) {
    console.warn(
      `Filtered ${
        validEnvLines.length - envLines.length
      } disallowed env lines.`,
    )
  }
  console.log("Detected env block", validEnvBlock)

  return validEnvBlock ?? ""
}
