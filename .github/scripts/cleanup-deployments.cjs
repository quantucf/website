/* global module */

const PROVIDER_LOGIN = "vercel[bot]";
const PREVIEW_ENVIRONMENT = "Preview";
const PRODUCTION_ENVIRONMENT = "Production";
const TERMINAL_STATES = new Set(["error", "failure", "inactive", "success"]);

function isManagedDeployment(deployment, environment) {
  return (
    deployment.environment === environment &&
    deployment.creator?.login === PROVIDER_LOGIN
  );
}

function shouldDeletePreview(associatedPullRequests, pullRequestNumber) {
  if (associatedPullRequests.length === 0) {
    return false;
  }

  if (
    pullRequestNumber !== undefined &&
    !associatedPullRequests.some(
      (pullRequest) => pullRequest.number === pullRequestNumber,
    )
  ) {
    return false;
  }

  return associatedPullRequests.every(
    (pullRequest) => pullRequest.state === "closed",
  );
}

function createProductionPlan(records, preferredKeeperId) {
  const managedRecords = records
    .filter(({ deployment }) =>
      isManagedDeployment(deployment, PRODUCTION_ENVIRONMENT),
    )
    .sort(
      (left, right) =>
        new Date(right.deployment.created_at).getTime() -
        new Date(left.deployment.created_at).getTime(),
    );

  const preferredKeeper = managedRecords.find(
    ({ deployment, state }) =>
      deployment.id === preferredKeeperId && state === "success",
  );
  const keeper =
    preferredKeeper ?? managedRecords.find(({ state }) => state === "success");

  if (!keeper) {
    return { delete: [], keep: undefined };
  }

  return {
    keep: keeper.deployment,
    delete: managedRecords
      .filter(
        ({ deployment, state }) =>
          deployment.id !== keeper.deployment.id && TERMINAL_STATES.has(state),
      )
      .map(({ deployment }) => deployment),
  };
}

async function listDeployments(github, context, environment) {
  return github.paginate(github.rest.repos.listDeployments, {
    ...context.repo,
    environment,
    per_page: 100,
  });
}

async function getLatestState(github, context, deploymentId) {
  const statuses = await github.rest.repos.listDeploymentStatuses({
    ...context.repo,
    deployment_id: deploymentId,
    per_page: 1,
  });

  return statuses.data[0]?.state;
}

async function retireDeployment(github, context, core, deployment, state) {
  try {
    if (state !== "inactive") {
      await github.rest.repos.createDeploymentStatus({
        ...context.repo,
        deployment_id: deployment.id,
        state: "inactive",
        auto_inactive: false,
        description: "Removed by deployment cleanup",
      });
    }

    await github.rest.repos.deleteDeployment({
      ...context.repo,
      deployment_id: deployment.id,
    });
    core.info(`Deleted ${deployment.environment} deployment ${deployment.id}.`);
  } catch (error) {
    if (error.status === 404) {
      core.info(`Deployment ${deployment.id} was already deleted.`);
      return;
    }

    throw error;
  }
}

async function cleanupPreviews({ github, context, core, pullRequestNumber }) {
  const deployments = await listDeployments(
    github,
    context,
    PREVIEW_ENVIRONMENT,
  );

  for (const deployment of deployments) {
    if (!isManagedDeployment(deployment, PREVIEW_ENVIRONMENT)) {
      continue;
    }

    const state = await getLatestState(github, context, deployment.id);
    if (!TERMINAL_STATES.has(state)) {
      core.info(
        `Keeping Preview deployment ${deployment.id} in state ${state ?? "unknown"}.`,
      );
      continue;
    }

    const associatedPullRequests = await github.paginate(
      github.rest.repos.listPullRequestsAssociatedWithCommit,
      {
        ...context.repo,
        commit_sha: deployment.sha,
        per_page: 100,
      },
    );

    if (shouldDeletePreview(associatedPullRequests, pullRequestNumber)) {
      await retireDeployment(github, context, core, deployment, state);
    }
  }
}

async function cleanupProduction({ github, context, core, preferredKeeperId }) {
  const deployments = await listDeployments(
    github,
    context,
    PRODUCTION_ENVIRONMENT,
  );
  const records = [];

  for (const deployment of deployments) {
    if (!isManagedDeployment(deployment, PRODUCTION_ENVIRONMENT)) {
      continue;
    }

    records.push({
      deployment,
      state: await getLatestState(github, context, deployment.id),
    });
  }

  const plan = createProductionPlan(records, preferredKeeperId);
  if (!plan.keep) {
    core.warning(
      "No successful Production deployment exists; nothing was deleted.",
    );
    return;
  }

  core.info(`Keeping Production deployment ${plan.keep.id}.`);
  for (const deployment of plan.delete) {
    const record = records.find(
      ({ deployment: candidate }) => candidate.id === deployment.id,
    );
    await retireDeployment(github, context, core, deployment, record?.state);
  }
}

async function run({ github, context, core }) {
  const eventName = context.eventName;

  if (eventName === "pull_request_target") {
    await cleanupPreviews({
      github,
      context,
      core,
      pullRequestNumber: context.payload.pull_request.number,
    });
    return;
  }

  if (eventName === "deployment_status") {
    const environment = context.payload.deployment.environment;

    if (environment === PREVIEW_ENVIRONMENT) {
      await cleanupPreviews({ github, context, core });
      return;
    }

    if (environment === PRODUCTION_ENVIRONMENT) {
      await cleanupProduction({
        github,
        context,
        core,
        preferredKeeperId: context.payload.deployment.id,
      });
    }
    return;
  }

  await cleanupPreviews({ github, context, core });
  await cleanupProduction({ github, context, core });
}

module.exports = run;
module.exports.createProductionPlan = createProductionPlan;
module.exports.isManagedDeployment = isManagedDeployment;
module.exports.shouldDeletePreview = shouldDeletePreview;
