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

  const actor = context.payload.workflow_run?.actor?.login
  const triggeringActor =
    context.payload.workflow_run?.triggering_actor?.login ?? actor

  async function hasWriteAccess(username) {
    try {
      const { data } = await github.rest.repos.getCollaboratorPermissionLevel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        username,
      })
      return ["admin", "write"].includes(data.permission)
    } catch {
      return false
    }
  }

  if (actor !== undefined) {
    const allowed =
      (await hasWriteAccess(actor)) ||
      (triggeringActor !== actor && (await hasWriteAccess(triggeringActor)))

    if (!allowed) {
      console.log(
        `Actor ${actor} / triggering actor ${triggeringActor} lacks write access. Skipping comment.`,
      )
      return
    }
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

  const baseUrl = context.payload?.repository?.html_url
  const artifactUrl = `${baseUrl}/suites/${checkSuiteId}/artifacts/${matchArtifact.id}`

  console.log(
    `Detected artifact ${matchArtifact.name} at ${artifactUrl}, posting...`,
  )

  const MARKER = "<!-- extension-build-link -->"
  const commentBody = `${MARKER}\n**Latest build:** [${matchArtifact.name}](${artifactUrl}) (as of ${new Date(workflowUpdatedAt).toUTCString()}).`

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: Number(prNumber),
  })

  const existing = comments.find((c) => c.body?.includes(MARKER))

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body: commentBody,
    })
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: Number(prNumber),
      body: commentBody,
    })
  }
}
