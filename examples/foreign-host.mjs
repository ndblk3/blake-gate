/**
 * Minimal adapter for a non-Blake host (Cursor CLI / Claude Code / GHA / custom).
 *
 * 1. Map YOUR config → PolicySource → compilePolicy (artifact + policyHash)
 * 2. Before dangerous tools → evaluateIntent (+ durable approvals / allowToken)
 * 3. On require_approval → buildApprovalRequest → your webhook/Slack
 * 4. After the run → evaluatePostAction (prompt vs fact)
 */
import {
  compilePolicy,
  evaluateIntent,
  createMemoryAuditLog,
  createMemoryApprovalStore,
  grantApproval,
  buildApprovalRequest,
  evaluatePostAction,
  inferActionOccurred,
  materializePolicyWorkspace,
} from "blake-gate";

const yourAgent = {
  id: "job-42",
  accountId: "acct-9",
  active: true,
  githubCanMerge: false,
  tools: [{ name: "github", level: "write" }],
  hardLimits: "No force-push. No send.",
};

const policy = compilePolicy({
  agentId: yourAgent.id,
  ownerId: yourAgent.accountId,
  environment: "personal_private",
  enabled: yourAgent.active,
  killSwitch: false,
  reviewMode: "autonomous",
  autoMerge: yourAgent.githubCanMerge,
  connectors: yourAgent.tools.map((t) => ({
    id: t.name,
    tier: t.level === "write" ? "write" : "draft",
  })),
  stops: yourAgent.hardLimits,
});

console.log("policyHash", policy.policyHash);

const audit = createMemoryAuditLog();
const approvals = createMemoryApprovalStore();

async function beforeTool(toolName, args) {
  const type =
    toolName === "merge_pr"
      ? "git.merge"
      : toolName === "push"
        ? "git.push"
        : toolName === "send_email"
          ? "mail.send"
          : null;
  if (!type) return { ok: true };

  const decision = evaluateIntent(
    {
      type,
      agentId: yourAgent.id,
      environment: "personal_private",
      connectorId: args.connector || "github",
      target: args.target,
      meta: { repo: args.repo, branch: args.branch },
    },
    policy,
    {
      now: new Date().toISOString(),
      approvals,
      signingSecret: process.env.BLAKE_POLICY_SECRET,
    },
    audit,
  );

  if (decision.effect === "allow") {
    return { ok: true, decision };
  }
  if (decision.effect === "require_approval") {
    const request = buildApprovalRequest({
      decision,
      policy,
      channels: ["webhook"],
    });
    // your app: deliver request, then on human OK:
    // grantApproval(approvals, decision.fingerprint, { policyHash: policy.policyHash });
    return { ok: false, needsHuman: true, decision, request };
  }
  return { ok: false, needsHuman: false, decision };
}

await materializePolicyWorkspace("/tmp/my-agent-workspace", policy);

const merge = await beforeTool("merge_pr", {
  connector: "github",
  target: "main",
  repo: "acme/app",
  branch: "main",
});
console.log("before", merge);

// Simulate owner approval ticket, then re-check:
if (merge.decision?.fingerprint) {
  grantApproval(approvals, merge.decision.fingerprint, {
    policyHash: policy.policyHash,
  });
  const again = await beforeTool("merge_pr", {
    connector: "github",
    target: "main",
    repo: "acme/app",
    branch: "main",
  });
  console.log("after durable approval", again.decision?.effect, again.decision?.rules);
}

// Post-action: log claims a merge while gate said require_approval
if (merge.decision) {
  const log = "Merged pull request #12 into main";
  const compliance = evaluatePostAction({
    policy,
    prior: merge.decision,
    evidence: {
      intentType: "git.merge",
      occurred: inferActionOccurred("git.merge", log),
      summary: log,
    },
  });
  console.log("post-action", compliance.ok ? "ok" : compliance.violation?.summary);
}
