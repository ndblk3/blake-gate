import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  compilePolicy,
  createMemoryAuditLog,
  evaluateIntent,
  evaluateSecretAccess,
  materializePolicyWorkspace,
} from "../dist/index.js";

const base = () =>
  compilePolicy({
    agentId: "agt_1",
    ownerId: "own_1",
    environment: "personal_private",
    enabled: true,
    killSwitch: false,
    reviewMode: "autonomous",
    autoMerge: false,
    connectors: [{ id: "github", tier: "write" }],
    stops: "No send, no merge",
  });

describe("blake-policy-agent gate", () => {
  it("denies when kill switch is on", () => {
    const p = compilePolicy({
      agentId: "agt_1",
      ownerId: "own_1",
      killSwitch: true,
      connectors: [{ id: "github", tier: "write" }],
    });
    const d = evaluateIntent(
      {
        type: "run.start",
        agentId: "agt_1",
        environment: "personal_private",
      },
      p,
      { now: "2026-11-13T12:00:00.000Z" },
    );
    assert.equal(d.effect, "deny");
    assert.ok(d.rules.includes("fleet.kill_switch"));
  });

  it("requires approval for merge when autoMerge is off", () => {
    const policy = base();
    const audit = createMemoryAuditLog();
    const d = evaluateIntent(
      {
        type: "git.merge",
        agentId: "agt_1",
        environment: "personal_private",
        connectorId: "github",
        target: "main",
      },
      policy,
      { now: "2026-11-13T12:00:00.000Z" },
      audit,
    );
    assert.equal(d.effect, "require_approval");
    assert.ok(d.rules.includes("git.merge.auto_off"));
    assert.equal(audit.list(1)[0]?.effect, "require_approval");
  });

  it("allows merge when autoMerge is on", () => {
    const policy = compilePolicy({
      agentId: "agt_1",
      ownerId: "own_1",
      autoMerge: true,
      connectors: [{ id: "github", tier: "write" }],
      stops: "",
    });
    const d = evaluateIntent(
      {
        type: "git.merge",
        agentId: "agt_1",
        environment: "personal_private",
        connectorId: "github",
      },
      policy,
      { now: "2026-11-13T12:00:00.000Z" },
    );
    assert.equal(d.effect, "allow");
  });

  it("hard-stops force push", () => {
    const d = evaluateIntent(
      {
        type: "git.force_push",
        agentId: "agt_1",
        environment: "personal_private",
        connectorId: "github",
      },
      base(),
      { now: "2026-11-13T12:00:00.000Z" },
    );
    assert.equal(d.effect, "deny");
    assert.ok(d.rules.includes("git.force_push_hard_stop"));
  });

  it("blocks practice write intents", () => {
    const d = evaluateIntent(
      {
        type: "git.push",
        agentId: "agt_1",
        environment: "personal_private",
        connectorId: "github",
      },
      base(),
      { now: "2026-11-13T12:00:00.000Z", practice: true },
    );
    assert.equal(d.effect, "deny");
    assert.ok(d.rules.includes("practice.no_write"));
  });

  it("isolates hire sandbox from personal secrets", () => {
    const d = evaluateSecretAccess({
      environment: "hire_sandbox",
      scope: "personal",
      connectorId: "github",
    });
    assert.equal(d.allow, false);
    assert.equal(d.rule, "credential.hire_isolation");
  });

  it("denies mail.send when stop says no send", () => {
    const d = evaluateIntent(
      {
        type: "mail.send",
        agentId: "agt_1",
        environment: "personal_private",
        connectorId: "gmail",
      },
      compilePolicy({
        agentId: "agt_1",
        ownerId: "own_1",
        connectors: [{ id: "gmail", tier: "write" }],
        stops: "No send, no merge",
      }),
      { now: "2026-11-13T12:00:00.000Z" },
    );
    assert.equal(d.effect, "deny");
  });

  it("allows practice run.start while agent is off", () => {
    const policy = compilePolicy({
      agentId: "agt_1",
      ownerId: "own_1",
      enabled: false,
      connectors: [{ id: "github", tier: "write" }],
    });
    const live = evaluateIntent(
      {
        type: "run.start",
        agentId: "agt_1",
        environment: "personal_private",
      },
      policy,
      { now: "2026-11-13T12:00:00.000Z" },
    );
    assert.equal(live.effect, "deny");
    const practice = evaluateIntent(
      {
        type: "run.start",
        agentId: "agt_1",
        environment: "personal_private",
      },
      policy,
      { now: "2026-11-13T12:00:00.000Z", practice: true },
    );
    assert.equal(practice.effect, "allow");
  });

  it("materializes policy + gate into a workspace", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "blake-policy-"));
    try {
      const result = await materializePolicyWorkspace(dir, base());
      const raw = await readFile(result.policyPath, "utf8");
      const parsed = JSON.parse(raw) as { agentId: string; autoMerge: boolean };
      assert.equal(parsed.agentId, "agt_1");
      assert.equal(parsed.autoMerge, false);
      const gate = await readFile(result.gateScriptPath, "utf8");
      assert.ok(gate.includes("git.merge"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
