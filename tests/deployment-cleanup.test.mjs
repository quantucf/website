import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

const loadCommonJs = createRequire(import.meta.url);
const cleanup = loadCommonJs("../.github/scripts/cleanup-deployments.cjs");
const { createProductionPlan, isManagedDeployment, shouldDeletePreview } =
  cleanup;

function deployment(id, environment, createdAt, creator = "vercel[bot]") {
  return {
    id,
    environment,
    created_at: createdAt,
    creator: { login: creator },
  };
}

test("matches only Vercel deployments in the requested environment", () => {
  assert.equal(
    isManagedDeployment(
      deployment(1, "Preview", "2026-01-01T00:00:00Z"),
      "Preview",
    ),
    true,
  );
  assert.equal(
    isManagedDeployment(
      deployment(2, "Production", "2026-01-01T00:00:00Z"),
      "Preview",
    ),
    false,
  );
  assert.equal(
    isManagedDeployment(
      deployment(3, "Preview", "2026-01-01T00:00:00Z", "other[bot]"),
      "Preview",
    ),
    false,
  );
});

test("deletes previews only when every associated pull request is closed", () => {
  assert.equal(shouldDeletePreview([], undefined), false);
  assert.equal(
    shouldDeletePreview([{ number: 3, state: "closed" }], undefined),
    true,
  );
  assert.equal(
    shouldDeletePreview(
      [
        { number: 3, state: "closed" },
        { number: 4, state: "open" },
      ],
      undefined,
    ),
    false,
  );
  assert.equal(shouldDeletePreview([{ number: 4, state: "closed" }], 3), false);
});

test("keeps the successful Production deployment that triggered cleanup", () => {
  const preferred = deployment(2, "Production", "2026-01-02T00:00:00Z");
  const plan = createProductionPlan(
    [
      {
        deployment: deployment(3, "Production", "2026-01-03T00:00:00Z"),
        state: "in_progress",
      },
      { deployment: preferred, state: "success" },
      {
        deployment: deployment(1, "Production", "2026-01-01T00:00:00Z"),
        state: "success",
      },
    ],
    preferred.id,
  );

  assert.equal(plan.keep.id, preferred.id);
  assert.deepEqual(
    plan.delete.map(({ id }) => id),
    [1],
  );
});

test("keeps the newest successful Production deployment during reconciliation", () => {
  const plan = createProductionPlan([
    {
      deployment: deployment(3, "Production", "2026-01-03T00:00:00Z"),
      state: "failure",
    },
    {
      deployment: deployment(2, "Production", "2026-01-02T00:00:00Z"),
      state: "success",
    },
    {
      deployment: deployment(1, "Production", "2026-01-01T00:00:00Z"),
      state: "success",
    },
  ]);

  assert.equal(plan.keep.id, 2);
  assert.deepEqual(
    plan.delete.map(({ id }) => id),
    [3, 1],
  );
});

test("does not delete Production records without a successful keeper", () => {
  const plan = createProductionPlan([
    {
      deployment: deployment(2, "Production", "2026-01-02T00:00:00Z"),
      state: "in_progress",
    },
    {
      deployment: deployment(1, "Production", "2026-01-01T00:00:00Z"),
      state: "failure",
    },
  ]);

  assert.equal(plan.keep, undefined);
  assert.deepEqual(plan.delete, []);
});

test("reconciles closed previews and old Production records", async () => {
  const previewClosed = {
    ...deployment(11, "Preview", "2026-01-01T00:00:00Z"),
    sha: "closed",
  };
  const previewOpen = {
    ...deployment(12, "Preview", "2026-01-02T00:00:00Z"),
    sha: "open",
  };
  const productionOld = deployment(21, "Production", "2026-01-01T00:00:00Z");
  const productionCurrent = deployment(
    22,
    "Production",
    "2026-01-02T00:00:00Z",
  );
  const deleted = [];
  const retired = [];
  const repositories = {
    listDeployments() {},
    listDeploymentStatuses() {},
    listPullRequestsAssociatedWithCommit() {},
    createDeploymentStatus: async ({ deployment_id: deploymentId }) => {
      retired.push(deploymentId);
    },
    deleteDeployment: async ({ deployment_id: deploymentId }) => {
      deleted.push(deploymentId);
    },
  };
  const github = {
    rest: { repos: repositories },
    paginate: async (method, parameters) => {
      if (method === repositories.listDeployments) {
        return parameters.environment === "Preview"
          ? [previewClosed, previewOpen]
          : [productionOld, productionCurrent];
      }

      if (method === repositories.listPullRequestsAssociatedWithCommit) {
        return parameters.commit_sha === "closed"
          ? [{ number: 3, state: "closed" }]
          : [{ number: 4, state: "open" }];
      }

      throw new Error("Unexpected pagination request");
    },
  };
  repositories.listDeploymentStatuses = async () => ({
    data: [{ state: "success" }],
  });
  const core = {
    info() {},
    warning() {},
  };

  await cleanup({
    github,
    core,
    context: {
      eventName: "schedule",
      payload: {},
      repo: { owner: "quantucf", repo: "website" },
    },
  });

  assert.deepEqual(retired, [previewClosed.id, productionOld.id]);
  assert.deepEqual(deleted, [previewClosed.id, productionOld.id]);
});

test("uses trusted workflow context with least-privilege deployment access", async () => {
  const workflow = await readFile(
    ".github/workflows/deployment-cleanup.yml",
    "utf8",
  );

  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /deployment_status:/);
  assert.match(workflow, /deployments:\s*write/);
  assert.match(workflow, /pull-requests:\s*read/);
  assert.match(
    workflow,
    /ref:\s*\$\{\{\s*github\.event\.repository\.default_branch\s*\}\}/,
  );
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.doesNotMatch(workflow, /github\.event\.pull_request\.head/);
});
