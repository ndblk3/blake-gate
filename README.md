# blake-policy-agent

Policy enforcement runtime for autonomous agents. Part of **blake-guard**.

The model proposes **intents**. This package decides **allow / deny / require_approval** — outside the LLM — with:

1. **Intent fingerprints + durable approval** — capability tickets, not chat moderation  
2. **Proof-carrying allow** — signed `allowToken`; runner/CI verifies before merge/send  
3. **Hire / dual-env isolation** — testable compliance suite (`blake-policy hire-check`)  
4. **Spawn / replicate gates** — `agent.spawn` · `agent.replicate` default **deny** (uncontrolled replication = 0)  
5. **Post-action compliance** — gate before, audit after; prompt ≠ fact → violation  
6. **Policy as artifact** — versioned `policy.json` + hash + diffs  
7. **Cross-host contract** — Cursor CLI · Claude Code · custom workers · GitHub Actions  
8. **ApprovalRequest** — thin delivery adapters (webhook / email / Slack); core stays runtime  

**Docs:** [bl4k3.com/policy-agent](https://bl4k3.com/policy-agent) · **Suite:** [blake-guard](https://bl4k3.com/guard) · [space-access](https://bl4k3.com/space-access) · [compliance-log](https://bl4k3.com/compliance-log)  
**Repo:** [github.com/ndblk3/blake-policy-agent](https://github.com/ndblk3/blake-policy-agent)  
**License:** Apache-2.0 · **npm:** `blake-policy-agent@0.3.0`

## Patent prep (US)

Attorney-ready drafts (not a filing): [`legal/`](./legal/) — invention disclosure, claim candidates, disclosure timeline (first public **2026-11-13**), prior-art notes, USPTO checklist.

## Install

```bash
npm install blake-policy-agent
```

## Quick start

```ts
import {
  compilePolicy,
  evaluateIntent,
  createMemoryApprovalStore,
  grantApproval,
  signAllowToken,
  assertAllowToken,
  evaluatePostAction,
  buildApprovalRequest,
  materializePolicyWorkspace,
} from "blake-policy-agent";

const policy = compilePolicy({
  agentId: "your-agent-id",
  ownerId: "your-user-id",
  environment: "personal_private", // or hire_sandbox / org_private
  autoMerge: false,
  connectors: [{ id: "github", tier: "write" }],
  stops: "No force-push.",
});
// policy.policyHash is set — treat it as an artifact, not a prompt.

const approvals = createMemoryApprovalStore();
const decision = evaluateIntent(
  {
    type: "git.merge",
    agentId: "your-agent-id",
    environment: "personal_private",
    connectorId: "github",
    target: "main",
    meta: { repo: "acme/app", branch: "main" },
  },
  policy,
  {
    now: new Date().toISOString(),
    approvals,
    signingSecret: process.env.BLAKE_POLICY_SECRET,
  },
);

if (decision.effect === "require_approval") {
  const req = buildApprovalRequest({ decision, policy, channels: ["webhook"] });
  // host delivers req → on approve:
  grantApproval(approvals, decision.fingerprint, {
    policyHash: policy.policyHash,
  });
}

if (decision.effect === "allow" && decision.allowToken) {
  assertAllowToken(decision.allowToken, policy, process.env.BLAKE_POLICY_SECRET!);
  // only then merge / send
}

await materializePolicyWorkspace("/path/to/workspace", policy);
```

See [`INTEGRATING.md`](./INTEGRATING.md) and `examples/`.

## CLI

```bash
npx blake-policy compile --in source.json --out policy.json
npx blake-policy evaluate --policy policy.json --intent intent.json [--secret …]
npx blake-policy materialize --policy policy.json --dir ./workspace
npx blake-policy fingerprint --intent intent.json
npx blake-policy diff --before a.json --after b.json
npx blake-policy hire-check
npx blake-policy verify-token --policy p.json --token t.json --secret …
```

## Environments & secrets

| Runtime env | May read |
|-------------|----------|
| `personal_private` | personal secrets |
| `org_private` | org secrets (not personal) |
| `hire_sandbox` | hire-brokered only |

`assertHireIsolation()` / `blake-policy hire-check` — CI matrix, not UI.

## Intent catalog

`run.start` · `secret.read` · `git.push` · `git.force_push` · `git.open_pr` · `git.merge` · `mail.send` · `chat.send` · `outbound.publish`
