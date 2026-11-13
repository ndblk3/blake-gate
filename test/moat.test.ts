import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertAllowToken,
  assertHireIsolation,
  buildApprovalRequest,
  compilePolicy,
  createMemoryApprovalStore,
  diffPolicies,
  evaluateIntent,
  evaluatePostAction,
  grantApproval,
  inferActionOccurred,
  intentFingerprint,
  materializePolicyWorkspace,
  policyHash,
  runHireIsolationSuite,
  signAllowToken,
  verifyAllowToken,
} from "../dist/index.js";

const secret = "test-signing-secret-moat";

const baseSource = {
  agentId: "agt_1",
  ownerId: "own_1",
  environment: "personal_private" as const,
  enabled: true,
  reviewMode: "autonomous" as const,
  autoMerge: false,
  connectors: [{ id: "github", tier: "write" as const }],
  stops: "",
};

describe("moat: fingerprint + durable approval", () => {
  it("stable fingerprint for same capability surface", () => {
    const a = intentFingerprint({
      type: "git.merge",
      agentId: "agt_1",
      environment: "personal_private",
      connectorId: "github",
      target: "main",
      meta: { repo: "acme/app", branch: "main" },
    });
    const b = intentFingerprint({
      type: "git.merge",
      agentId: "agt_1",
      environment: "personal_private",
      connectorId: "github",
      target: "main",
      meta: { repo: "acme/app", branch: "main" },
    });
    const drift = intentFingerprint({
      type: "git.merge",
      agentId: "agt_1",
      environment: "personal_private",
      connectorId: "github",
      target: "main",
      meta: { repo: "acme/app", branch: "develop" },
    });
    assert.equal(a, b);
    assert.notEqual(a, drift);
    assert.match(a, /^ifp_/);
  });

  it("durable approval upgrades require_approval → allow", () => {
    const policy = compilePolicy(baseSource);
    const intent = {
      type: "git.merge" as const,
      agentId: "agt_1",
      environment: "personal_private" as const,
      connectorId: "github",
      target: "main",
      meta: { repo: "acme/app", branch: "main" },
    };
    const first = evaluateIntent(intent, policy, {
      now: "2026-11-13T12:00:00.000Z",
    });
    assert.equal(first.effect, "require_approval");

    const store = createMemoryApprovalStore();
    grantApproval(store, first.fingerprint, {
      now: "2026-11-13T12:01:00.000Z",
      policyHash: policy.policyHash,
    });

    const second = evaluateIntent(intent, policy, {
      now: "2026-11-13T12:02:00.000Z",
      approvals: store,
    });
    assert.equal(second.effect, "allow");
    assert.ok(second.rules.includes("approval.durable"));
  });

  it("policyHash drift invalidates durable approval", () => {
    const policy = compilePolicy(baseSource);
    const intent = {
      type: "git.merge" as const,
      agentId: "agt_1",
      environment: "personal_private" as const,
      connectorId: "github",
      target: "main",
    };
    const fp = intentFingerprint(intent);
    const store = createMemoryApprovalStore();
    grantApproval(store, fp, {
      policyHash: "pol_old_hash_should_not_match",
    });
    const d = evaluateIntent(intent, policy, {
      now: "2026-11-13T12:00:00.000Z",
      approvals: store,
    });
    assert.equal(d.effect, "require_approval");
  });
});

describe("moat: proof-carrying allow", () => {
  it("signs and verifies allow-token", () => {
    const policy = compilePolicy({ ...baseSource, autoMerge: true });
    const decision = evaluateIntent(
      {
        type: "git.merge",
        agentId: "agt_1",
        environment: "personal_private",
        connectorId: "github",
      },
      policy,
      { now: "2026-11-13T12:00:00.000Z", signingSecret: secret },
    );
    assert.equal(decision.effect, "allow");
    assert.ok(decision.allowToken);
    const ok = verifyAllowToken(decision.allowToken!, policy, secret);
    assert.equal(ok.ok, true);
    assertAllowToken(decision.allowToken, policy, secret);
  });

  it("rejects tampered token", () => {
    const policy = compilePolicy({ ...baseSource, autoMerge: true });
    const decision = evaluateIntent(
      {
        type: "git.merge",
        agentId: "agt_1",
        environment: "personal_private",
        connectorId: "github",
      },
      policy,
      { now: "2026-11-13T12:00:00.000Z" },
    );
    const token = signAllowToken(decision, policy, secret);
    const bad = { ...token, signature: "00".repeat(32) };
    const check = verifyAllowToken(bad, policy, secret);
    assert.equal(check.ok, false);
  });
});

describe("moat: hire isolation suite", () => {
  it("passes Blake Hire Isolation matrix", () => {
    const result = runHireIsolationSuite();
    assert.equal(result.ok, true);
    assertHireIsolation();
  });
});

describe("moat: post-action compliance", () => {
  it("emits violation when merge happened after require_approval", () => {
    const policy = compilePolicy(baseSource);
    const prior = evaluateIntent(
      {
        type: "git.merge",
        agentId: "agt_1",
        environment: "personal_private",
        connectorId: "github",
      },
      policy,
      { now: "2026-11-13T12:00:00.000Z" },
    );
    assert.equal(prior.effect, "require_approval");
    const log = "Merged pull request #12 into main";
    assert.equal(inferActionOccurred("git.merge", log), true);
    const result = evaluatePostAction({
      policy,
      prior,
      evidence: {
        intentType: "git.merge",
        occurred: true,
        summary: log,
      },
    });
    assert.equal(result.ok, false);
    assert.ok(result.violation);
    assert.ok(result.violation!.rules.includes("compliance.post_action"));
  });
});

describe("moat: policy artifact + diff", () => {
  it("compiles with policyHash and diffs changes", () => {
    const a = compilePolicy(baseSource);
    const b = compilePolicy({ ...baseSource, autoMerge: true, version: 2 });
    assert.match(a.policyHash!, /^pol_/);
    assert.notEqual(a.policyHash, b.policyHash);
    const diff = diffPolicies(a, b);
    assert.ok(diff.changes.some((c) => c.path === "autoMerge"));
    assert.equal(policyHash(a), a.policyHash);
  });

  it("materializes history jsonl", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "blake-moat-"));
    try {
      const policy = compilePolicy(baseSource);
      const result = await materializePolicyWorkspace(dir, policy);
      const hist = await readFile(result.historyPath, "utf8");
      assert.ok(hist.includes(policy.policyHash!));
      const raw = JSON.parse(await readFile(result.policyPath, "utf8"));
      assert.equal(raw.policyHash, policy.policyHash);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("moat: ApprovalRequest protocol", () => {
  it("builds channel-agnostic approval request", () => {
    const policy = compilePolicy(baseSource);
    const decision = evaluateIntent(
      {
        type: "git.merge",
        agentId: "agt_1",
        environment: "personal_private",
        connectorId: "github",
      },
      policy,
      { now: "2026-11-13T12:00:00.000Z" },
    );
    const req = buildApprovalRequest({
      decision,
      policy,
      channels: ["webhook", "email"],
      callbackUrl: "https://example.com/approve",
    });
    assert.equal(req.fingerprint, decision.fingerprint);
    assert.equal(req.policyHash, policy.policyHash);
    assert.deepEqual(req.channels, ["webhook", "email"]);
  });
});
