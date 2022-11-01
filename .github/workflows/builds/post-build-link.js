/* Allow console output for debug information in Actions output. */
/* eslint-disable no-console */
module.exports = async function postBuildLink({ github, context }) {
  const workflowRunId =
    context.payload?.workflow_run?.id ?? context.inputs?.workflow_run_id

  const {
    status: workflowLookupStatus,
    data: { check_suite_id: checkSuiteId, updated_at: workflowUpdatedAt },
  } = await github.rest.actions.getWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: workflowRunId,
  })

  if (workflowLookupStatus !== 200) {
    console.warn(
      "Failed to fetch workflow :( Status",
      workflowLookupStatus,
      "."
    )
    return
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
    console.error(
      "Failed to fetch workflow artifacts :( Status",
      artifactLookupStatus,
      "."
    )
    return
  }

  const matchArtifact = allArtifacts.filter((artifact) => {
    return artifact.name.startsWith("extension-builds-")
  })[0]

  if (matchArtifact === undefined || matchArtifact === null) {
    console.error(
      "Failed to find extension artifact :( Artifacts were",
      JSON.strignify(allArtifacts)
    )
    return
  }

  const prNumber = matchArtifact.name.match(/extension-builds-(.*)/)?.[1]

  if (prNumber === undefined) {
    console.error(
      `Could not extract PR number from extension artifact filename (${matchArtifact.name}) :(`
    )
    return
  }

  const {
    status: pullLookupStatus,
    data: { body },
  } = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
  })

  if (pullLookupStatus !== 200) {
    console.error("Failed to fetch PR body :( Status", pullLookupStatus, ".")
    return
  }

  const baseUrl = context.payload.repository.html_url
  const artifactUrl = `${baseUrl}/suites/${checkSuiteId}/artifacts/${matchArtifact.id}`

  console.log(
    `Detected artifact ${matchArtifact.name} at ${artifactUrl}, posting...`
  )

  const updatedBody = `${body.replace(
    /\s+Latest build: [^\n]*/,
    ""
  )}\n\nLatest build: [${matchArtifact.name}](${artifactUrl}) (as of ${new Date(
    workflowUpdatedAt
  ).toUTCString()}).`

  await github.rest.pulls.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
    body: updatedBody,
  })
}
