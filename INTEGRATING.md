# Integrating blake-policy-agent into another system

You do **not** need Blake UI, Next.js, or Cursor. Ship this package (npm / tarball / git submodule) and wrap three calls.

## 1. Map your config → `PolicySource`

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

```ts
import { compilePolicy } from "blake-policy-agent";
const policy = compilePolicy(yourMappedSource);
```

## 2. Gate every dangerous tool

Before merge / push / send / secret read:

```ts
import { evaluateIntent } from "blake-policy-agent";

const decision = evaluateIntent(intent, policy, {
  now: new Date().toISOString(),
  practice: false,
  ownerApproved: false, // true after human click
});

switch (decision.effect) {
  case "allow":
    await runTool();
    break;
  case "require_approval":
    await askHuman(decision); // Slack / WhatsApp / email / in-app
    break;
  case "deny":
    throw new Error(decision.reasons.join(" "));
}
```

## 3. Optional: drop files into the agent cwd

```ts
import { materializePolicyWorkspace } from "blake-policy-agent";
await materializePolicyWorkspace("/path/to/workspace", policy);
// → .blake-policy/policy.json + gate.mjs
```

Foreign runners with only Node can call:

```bash
node .blake-policy/gate.mjs '{"type":"git.merge",...}'
# exit 0 allow · 2 require_approval · 1 deny
```

## CLI without importing JS

```bash
npx blake-policy compile --in source.json --out policy.json
npx blake-policy evaluate --policy policy.json --intent intent.json
npx blake-policy materialize --policy policy.json --dir ./workspace
```

See `examples/foreign-host.mjs`, `examples/source.sample.json`, `examples/intent.sample.json`.

## What partners never need

- Blake account UI
- Cursor API key (unless *they* use Cursor)
- Our disk layout under `data/owners/`

They keep their own scheduler, LLM, and GitHub client — **policy is the shared contract**.
