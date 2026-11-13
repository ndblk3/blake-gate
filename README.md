# blake-policy-agent

Policy enforcement runtime for autonomous agents.

The model proposes **intents**. This package decides **allow / deny / require_approval** — outside the LLM — and can write a local gate into any workspace.

**Docs (Blake):** [bl4k3.com/policy](https://bl4k3.com/policy)  
**Repo:** [github.com/ndblk3/blake-policy-agent](https://github.com/ndblk3/blake-policy-agent)  
**License:** Apache-2.0

## Install

```bash
npm install blake-policy-agent
```

```bash
npm test   # build + unit tests
```

## Quick start (any host)

```ts
import {
  compilePolicy,
  evaluateIntent,
  materializePolicyWorkspace,
} from "blake-policy-agent";

const policy = compilePolicy({
  agentId: "your-agent-id",
  ownerId: "your-user-id",
  environment: "personal_private", // or hire_sandbox / org_private
  enabled: true,
  killSwitch: false,
  reviewMode: "autonomous",
  autoMerge: false,
  connectors: [{ id: "github", tier: "write" }],
  stops: "No send. No force-push.",
});

await materializePolicyWorkspace("/path/to/workspace", policy);

const decision = evaluateIntent(
  {
    type: "git.merge",
    agentId: "your-agent-id",
    environment: "personal_private",
    connectorId: "github",
  },
  policy,
  { now: new Date().toISOString() },
);

if (decision.effect === "require_approval") {
  // open PR + notify the owner
}
if (decision.effect === "deny") {
  throw new Error(decision.reasons.join(" "));
}
```

See [`examples/foreign-host.mjs`](./examples/foreign-host.mjs) and [`INTEGRATING.md`](./INTEGRATING.md).

## CLI

```bash
npx blake-policy compile --in source.json --out policy.json
npx blake-policy evaluate --policy policy.json --intent intent.json
npx blake-policy materialize --policy policy.json --dir ./workspace

# evaluate exit: 0 allow · 2 require_approval · 1 deny
```

After `materialize`, runners with only Node can:

```bash
node .blake-policy/gate.mjs '{"type":"git.merge","agentId":"…","environment":"personal_private","connectorId":"github"}'
```

## Environments & secrets

| Runtime env | May read |
|-------------|----------|
| `personal_private` | personal secrets |
| `org_private` | org secrets (not personal) |
| `hire_sandbox` | hire-brokered only |

Hire never sees personal keys (`evaluateSecretAccess`).

## Intent catalog

`run.start` · `secret.read` · `git.push` · `git.force_push` · `git.open_pr` · `git.merge` · `mail.send` · `chat.send` · `outbound.publish`

## What partners never need

Blake account UI · Cursor API key (unless *they* use Cursor) · Blake disk layout.

They keep their own scheduler, LLM, and GitHub client — **policy is the shared contract**.
