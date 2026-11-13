# Integrating blake-policy-agent into another system

You do **not** need Blake UI, Next.js, or Cursor. Ship this package and wrap the contract below.

**Host contract version:** `HOST_CONTRACT_VERSION = "1"`  
Same package for: Cursor CLI · Claude Code · custom workers · GitHub Actions.

## 1. Map your config → `PolicySource` → artifact

| Your field | PolicySource |
|------------|--------------|
| agent id | `agentId` |
| user / org id | `ownerId` |
| live vs hire sandbox | `environment` |
| agent on/off | `enabled` |
| fleet emergency stop | `killSwitch` |
| notify vs autonomous | `reviewMode` |
| can merge PRs alone | `autoMerge` |
| allowed tools + power | `connectors[]` `{ id, tier }` |
| free-text hard stops | `stops` |
| prior artifact hash | `previousHash` (optional) |

```ts
import { compilePolicy, diffPolicies } from "blake-policy-agent";
const policy = compilePolicy(yourMappedSource);
// policy.policyHash / version / compiledAt — versioned artifact
const changes = diffPolicies(previousPolicy, policy); // what changed for this agent
```

## 2. Gate every dangerous tool (before)

```ts
import {
  evaluateIntent,
  createMemoryApprovalStore,
  grantApproval,
  buildApprovalRequest,
  assertAllowToken,
} from "blake-policy-agent";

const approvals = createMemoryApprovalStore(); // or your DB

const decision = evaluateIntent(intent, policy, {
  now: new Date().toISOString(),
  practice: false,
  approvals,
  signingSecret: process.env.BLAKE_POLICY_SECRET, // proof-carrying allow
});

switch (decision.effect) {
  case "allow":
    if (decision.allowToken) {
      assertAllowToken(decision.allowToken, policy, process.env.BLAKE_POLICY_SECRET!);
    }
    await runTool();
    break;
  case "require_approval": {
    const req = buildApprovalRequest({
      decision,
      policy,
      channels: ["webhook", "slack"],
      callbackUrl: "https://your.host/approve",
    });
    await yourDelivery.deliver(req); // thin adapter — not in core
    // after human OK:
    grantApproval(approvals, decision.fingerprint, {
      policyHash: policy.policyHash,
    });
    break;
  }
  case "deny":
    throw new Error(decision.reasons.join(" "));
}
```

**Durable approval:** same fingerprint (`type + target + repo + branch`) + same `policyHash` → auto-allow next time. Drift → ask again. These are **capability tickets**, not chat moderation.

## 3. Audit after (post-action compliance)

```ts
import { evaluatePostAction, inferActionOccurred } from "blake-policy-agent";

const occurred = inferActionOccurred("git.merge", runLog);
const { ok, violation } = evaluatePostAction({
  policy,
  prior: decision,
  evidence: { intentType: "git.merge", occurred, summary: runLog },
});
if (!ok) await alertCompliance(violation);
```

## 4. Materialize into agent cwd

```ts
await materializePolicyWorkspace("/path/to/workspace", policy);
// .blake-policy/policy.json + policy-history.jsonl + gate.mjs
```

```bash
node .blake-policy/gate.mjs '{"type":"git.merge",...}'
# exit 0 allow · 2 require_approval · 1 deny
```

## 5. Hire isolation in CI

```bash
npx blake-policy hire-check
```

```ts
import { assertHireIsolation } from "blake-policy-agent";
assertHireIsolation();
```

## What partners never need

- Blake account UI  
- Cursor API key (unless *they* use Cursor)  
- Our disk layout under `data/owners/`  
- Built-in WhatsApp/Slack bots — use `ApprovalRequest` + your webhook  

They keep their own scheduler, LLM, and GitHub client — **policy is the shared contract**.
