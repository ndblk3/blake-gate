/**
 * Minimal adapter for a non-Blake host.
 *
 * 1. Map YOUR user/agent config → PolicySource
 * 2. compilePolicy
 * 3. Before each dangerous tool call → evaluateIntent
 * 4. Switch on effect
 */
import {
  compilePolicy,
  evaluateIntent,
  createMemoryAuditLog,
  materializePolicyWorkspace,
} from "blake-policy-agent";

// --- your product shapes (example) ---
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

const audit = createMemoryAuditLog();

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
    },
    policy,
    { now: new Date().toISOString() },
    audit,
  );

  if (decision.effect === "allow") return { ok: true, decision };
  if (decision.effect === "require_approval") {
    return {
      ok: false,
      needsHuman: true,
      decision,
      // your app: open PR, Slack the owner, wait for button
    };
  }
  return { ok: false, needsHuman: false, decision };
}

// Optional: drop policy into the agent working directory
await materializePolicyWorkspace("/tmp/my-agent-workspace", policy);

const merge = await beforeTool("merge_pr", { connector: "github", target: "main" });
console.log(merge);
