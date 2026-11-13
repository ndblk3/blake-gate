import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { policyHash } from "./artifact.js";
/**
 * Drop a machine-readable policy + local gate script into a workspace.
 * Any runner (Cursor, Claude Code, custom worker, GitHub Actions) can call
 * the script before dangerous actions — same contract, cross-host.
 */
export async function materializePolicyWorkspace(workspaceDir, policy) {
    const dir = path.join(workspaceDir, ".blake-policy");
    await mkdir(dir, { recursive: true });
    const policyPath = path.join(dir, "policy.json");
    const readmePath = path.join(dir, "README.md");
    const gateScriptPath = path.join(dir, "gate.mjs");
    const historyPath = path.join(dir, "policy-history.jsonl");
    const artifact = {
        ...policy,
        policyHash: policy.policyHash ?? policyHash(policy),
    };
    await writeFile(policyPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    await appendFile(historyPath, `${JSON.stringify({
        at: artifact.compiledAt ?? new Date().toISOString(),
        version: artifact.version ?? 1,
        policyHash: artifact.policyHash,
        previousHash: artifact.previousHash ?? null,
        autoMerge: artifact.autoMerge,
        reviewMode: artifact.reviewMode,
        environment: artifact.environment,
    })}\n`, "utf8");
    await writeFile(readmePath, [
        "# blake-policy (local copy)",
        "",
        "Policy as artifact — not a prompt. Host compiles; runners verify.",
        "",
        "- `policy.json` — compiled rules + `policyHash` / version.",
        "- `policy-history.jsonl` — what changed for this agent over time.",
        "- `gate.mjs` — evaluate an intent (exit 0 allow · 2 approval · 1 deny).",
        "",
        "Proof-carrying allow: set `BLAKE_POLICY_SECRET` and require `allowToken`",
        "before merge/send in your runner.",
        "",
        "Example:",
        "",
        "```bash",
        'node .blake-policy/gate.mjs \'{"type":"git.merge","agentId":"…","environment":"personal_private","connectorId":"github"}\'',
        "```",
        "",
    ].join("\n"), "utf8");
    await writeFile(gateScriptPath, `${GATE_SCRIPT}\n`, "utf8");
    return { dir, policyPath, readmePath, gateScriptPath, historyPath };
}
/** Minimal inline gate for workspaces without node_modules linkage. */
const GATE_SCRIPT = String.raw `#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const policy = JSON.parse(readFileSync(join(__dirname, "policy.json"), "utf8"));

const intentRaw = process.argv[2];
if (!intentRaw) {
  console.error("Usage: node gate.mjs '<intent-json>'");
  process.exit(1);
}
const intent = JSON.parse(intentRaw);
const now = new Date().toISOString();
const practice = process.env.BLAKE_PRACTICE === "1";
const ownerApproved = process.env.BLAKE_OWNER_APPROVED === "1";

const WRITE = new Set([
  "git.push","git.force_push","git.open_pr","git.merge",
  "mail.send","chat.send","outbound.publish",
]);

function fingerprint(i) {
  const repo = String(i.meta?.repo ?? i.meta?.repoFullName ?? "");
  const branch = String(i.meta?.branch ?? "");
  const parts = [i.type, i.agentId, i.environment, i.connectorId ?? "", i.target ?? "", repo, branch]
    .map((p) => String(p).trim().toLowerCase());
  return "ifp_" + createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}

function decide() {
  const reasons = [];
  const rules = [];
  if (policy.killSwitch) return out("deny", ["Emergency stop is on."], ["fleet.kill_switch"]);
  if (policy.enabled === false) return out("deny", ["Agent is off."], ["agent.disabled"]);
  if (intent.agentId !== policy.agentId) return out("deny", ["agentId mismatch"], ["agent.id_mismatch"]);
  if (intent.environment && intent.environment !== policy.environment) {
    return out("deny", ["environment mismatch"], ["env.mismatch"]);
  }
  if (intent.type === "git.force_push") {
    return out("deny", ["Force-push hard stop"], ["git.force_push_hard_stop"]);
  }
  if (practice && WRITE.has(intent.type)) {
    return out("deny", ["Practice cannot write"], ["practice.no_write"]);
  }
  if (intent.type === "git.merge") {
    if (!policy.autoMerge) {
      if (ownerApproved) return out("allow", ["Owner approved"], ["git.merge.owner_approved"]);
      return out("require_approval", ["Auto merge off"], ["git.merge.auto_off"]);
    }
  }
  if (policy.reviewMode === "notify" && WRITE.has(intent.type) && intent.type !== "git.merge" && !ownerApproved) {
    return out("require_approval", ["Notify mode"], ["review.notify"]);
  }
  const stops = Array.isArray(policy.stopRules) ? policy.stopRules : [];
  for (const rule of stops) {
    const r = String(rule).toLowerCase();
    if (intent.type === "mail.send" && /no send|do not send|don't send/.test(r)) {
      return out("deny", ["Stop: " + rule], ["owner.stop_rule"]);
    }
    if (intent.type === "git.merge" && policy.autoMerge && /no merge|do not merge/.test(r)) {
      return out("deny", ["Stop: " + rule], ["owner.stop_rule"]);
    }
  }
  return out("allow", ["Policy allows"], ["default.allow"]);
}

function out(effect, reasons, rules) {
  return {
    effect,
    reasons,
    rules,
    at: now,
    intent,
    fingerprint: fingerprint(intent),
    policyHash: policy.policyHash || null,
  };
}

const decision = decide();
console.log(JSON.stringify(decision, null, 2));
if (decision.effect === "allow") process.exit(0);
if (decision.effect === "require_approval") process.exit(2);
process.exit(1);
`;
//# sourceMappingURL=workspace.js.map