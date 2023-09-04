// @ts-check
/* Allow console output for debug information in Actions output. */
/* eslint-disable no-console */

/**
 * @param {object} ctx Context
 * @param {InstanceType<import("@actions/github/lib/utils")["GitHub"]>} ctx.github
 * @param {import("@actions/github")["context"]} ctx.context
 * @returns {Promise<void>}
 */
module.exports = async function postBuildLink({ github, context }) {
  // @ts-expect-error this is available on manual workflow runs
  const manualWorkFlowId = context?.inputs?.workflow_run_id

  const workflowRunId = Number(
    context.payload?.workflow_run?.id ?? manualWorkFlowId,
  )

  if (Number.isNaN(workflowRunId)) {
    throw new Error("Failed to get workflow run id")
  }

  const {
    status: workflowLookupStatus,
    data: { check_suite_id: checkSuiteId, updated_at: workflowUpdatedAt },
  } = await github.rest.actions.getWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: workflowRunId,
  })

  if (workflowLookupStatus !== 200) {
    throw new Error(
      `Failed to fetch workflow :( Status ${workflowLookupStatus}.`,
    )
  }

  const {
    status: artifactLookupStatus,
    data: { artifacts: allArtifacts },
  } = await github.rest.actions.listWorkflowRunArtifacts({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: workflowRunId,
  })

  if (artifactLookupStatus !== 200) {
    throw new Error(
      `Failed to fetch workflow artifacts :( Status ${artifactLookupStatus}.`,
    )
  }

  const matchArtifact = allArtifacts.filter((artifact) =>
    artifact.name.startsWith("extension-builds-"),
  )[0]

  if (matchArtifact === undefined || matchArtifact === null) {
    throw new Error(
      `Failed to find extension artifact :( Artifacts were ${JSON.stringify(
        allArtifacts,
      )}`,
    )
  }

  const prNumber = matchArtifact.name.match(/extension-builds-(.*)/)?.[1]

  if (prNumber === undefined) {
    throw new Error(
      `Could not extract PR number from extension artifact filename (${matchArtifact.name}) :(`,
    )
  } else if (prNumber.match(/^[a-f0-9]+$/) && !prNumber.match(/^[0-9]+$/)) {
    console.log(
      "Workflow was for a merge commit rather than a PR, skipping build link.",
    )
    return
  } else if (!prNumber.match(/^[0-9]+$/)) {
    throw new Error(
      `Could not extract PR number from extension artifact filename (${matchArtifact.name}) :(`,
    )
  }

  const {
    status: pullLookupStatus,
    data: { body },
  } = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: Number(prNumber),
  })

  if (pullLookupStatus !== 200) {
    throw new Error(`Failed to fetch PR body :( Status ${pullLookupStatus}.`)
  }

  const baseUrl = context.payload?.repository?.html_url
  const artifactUrl = `${baseUrl}/suites/${checkSuiteId}/artifacts/${matchArtifact.id}`

  console.log(
    `Detected artifact ${matchArtifact.name} at ${artifactUrl}, posting...`,
  )

  const updatedBody = `${(body ?? "").replace(
    /\s+Latest build: [^\n]*/,
    "",
  )}\n\nLatest build: [${matchArtifact.name}](${artifactUrl}) (as of ${new Date(
    workflowUpdatedAt,
  ).toUTCString()}).`

  await github.rest.pulls.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: Number(prNumber),
    body: updatedBody,
  })
}
