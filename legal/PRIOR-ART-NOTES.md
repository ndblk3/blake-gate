# Prior-art notes (preliminary) — agent policy / tool authorization

**Prepared:** 2026-11-14  
**Scope:** quick landscape for counsel — **not** a clearance opinion.

## High-relevance patents / applications (flag first)

| Ref | Title / gist | Overlap risk | Differentiation angle for Blake |
|-----|--------------|--------------|----------------------------------|
| **US 12,688,261** (issued ~2026-07-21) | Authorizing tool invocation by autonomous AI agent using fidelity + integrity signals; generates machine-verifiable **delegation artifact** with least-privilege constraints | **High** — agent tool gate + verifiable artifact before invoke | Blake emphasizes **intent fingerprint durable tickets**, **policy content-hash binding**, HMAC allowToken verified by **runner/CI fail-closed**, **post-action** deny/require vs occurred, **hire secret matrix** — not fidelity/integrity behavioral signals |
| **US 2026/0244749** | Hardened OS-level AI agent automation; approval token bound to action descriptor + **pre-execution state hash** (screenshot/a11y/DOM); tamper-evident provenance | Medium — approval tokens + pre-exec hash | Blake targets **repo/mail/connector intents**, not OS input-event/perception layer |
| Verdict Systems provisional (public marketing) | Atomic-action policy gatekeeping + cryptographic evidence sealing; hierarchical policy tree | Medium — marketing overlap in “gate before action” | Need counsel to pull actual claims; Blake’s durable fingerprint×policyHash + post-action loop + hire CI suite |

Links captured at prep time:

- https://patents.justia.com/patent/12688261  
- https://patentsgazette.uspto.gov/week29/OG/html/1548-3/US12688261-20260721.html  
- https://patents.justia.com/patent/20260244749  
- https://verdict.systems/patents  

## Non-patent literature / products (search keywords)

Use these queries in Google Patents / USPTO / Espacenet:

```
autonomous agent tool authorization delegation artifact
intent fingerprint capability ticket policy hash
proof carrying allow token HMAC agent runner
require_approval durable approval policy drift
post-action compliance agent side-effect violation
hire sandbox secret isolation agent environment
OPA agent tool gate LLM
Cursor agent permissions policy
```

Product / OSS classes to chart:

- LLM guardrail frameworks (NeMo Guardrails, LlamaFirewall-class, prompt firewalls)
- Agent permission UIs (ChatGPT / Claude / Cursor tool approvals)
- Policy engines (OPA/Gatekeeper, Cedar, AWS IAM)
- GitHub Rulesets / CODEOWNERS / required reviews (partial functional overlap on merge, different mechanism)
- Capability-based security / macaroons / biscuits (token shape prior art — distinguish agent intent + policy artifact loop)

## Suggested attorney tasks

1. Full claim chart vs US 12,688,261 independent claims.  
2. FTO memo if enforcing while shipping Apache-2.0 npm package.  
3. Decide provisional breadth: method + system + CRM; consider continuation strategy given crowded 2026 agent-auth filings.
