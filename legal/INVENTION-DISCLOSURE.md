# Invention Disclosure — Policy Enforcement Runtime for Autonomous Agents

**Working title:** Systems and methods for intent-fingerprinted, proof-carrying policy gating of autonomous agent side-effects  
**Code name / embodiment:** `blake-gate` (npm / Apache-2.0)  
**Prepared:** 2026-11-14  
**Related product:** Blake (bl4k3.com) — host that compiles policy and runs agents  
**Status:** Confidential attorney work product draft (once shared under privilege)  
**Disclaimer:** Not a patent application. Not legal advice.

---

## 1. Inventors / ownership (fill before filing)

| Field | Value |
|-------|-------|
| Inventor legal name(s) | _TBD_ |
| Citizenship / residence | _TBD_ |
| Employer / assignee | _TBD (e.g. individual / Blake entity)_ |
| Contribution summary | Conception + reduction to practice of gate, fingerprint, allow-token, hire isolation, post-action compliance |

---

## 2. Problem

Autonomous AI agents propose tool calls (merge PR, send email, read secrets, publish). Today most “guardrails” are:

1. **Prompt / model-side** — the LLM is asked to obey rules; it can still emit a tool call.
2. **Chat moderation** — human says “ok” in a thread; there is no machine-checkable ticket for the exact capability.
3. **Coarse IAM** — API keys grant broad write; no per-intent, per-policy-version proof for CI/runner.

Failures this invention targets:

- Model claims compliance while a side-effect executes without a verified allow decision.
- Human approval for “merge main” is reused after **policy drift** (auto-merge flipped, connectors changed).
- Hire/sandbox agents can reach personal/org secrets.
- Only pre-checks exist; logs later show the action happened anyway (**prompt ≠ fact**).

---

## 3. Solution overview (technical)

A **host-independent policy runtime** sits **outside the LLM**:

1. Host compiles owner settings → **versioned policy artifact** with content `policyHash`.
2. Agent/runtime emits a structured **intent** (typed action + agentId + environment + connector + target + meta).
3. Runtime computes a stable **intent fingerprint** (capability ticket id).
4. Runtime evaluates → `allow` | `deny` | `require_approval` with rule ids + reasons.
5. On `allow` with a signing secret → emit **HMAC proof-carrying `allowToken`** bound to fingerprint + policyHash + rules.
6. Runner / CI / tool adapter **fail-closed**: refuse side-effect unless `assertAllowToken` succeeds.
7. Durable approvals stored by fingerprint and **invalidated when policyHash drifts**.
8. After tool execution (or log inference), **post-action compliance** compares prior gate effect vs evidence that the side-effect occurred → violation event.
9. **Hire isolation** is a testable secret-scope matrix (`personal_private` / `org_private` / `hire_sandbox`), runnable in CI.

The LLM never “is” the policy. The model proposes; the runtime decides; the executor verifies proof.

---

## 4. Key inventive elements (claim-oriented)

### A. Intent fingerprint as durable capability ticket

- Canonical fields: `type | agentId | environment | connectorId | target | repo | branch` (normalized).
- SHA-256 → short id (`ifp_…`).
- Same fingerprint + matching `policyHash` → durable approval upgrades `require_approval` → `allow`.
- Any field drift or policyHash drift → new ticket / ask again.

### B. Proof-carrying allow token verified before side-effect

- Canonical JSON payload: effect, fingerprint, policyHash, sorted rules, at, expiresAt.
- HMAC-SHA256 with host secret; timing-safe verify.
- `assertAllowToken` throws closed if missing/invalid/expired/hash mismatch — **even if the model “decided”**.

### C. Policy as hashed artifact (not prompt text)

- Canonical serialization of enforceable fields → `pol_…` hash.
- Version / previousHash / diffPolicies for audit.
- Approvals and tokens bind to hash so policy edits invalidate prior grants.

### D. Dual gate: pre-action + post-action compliance

- Pre: `evaluateIntent`.
- Post: `evaluatePostAction` — if prior was deny/require_approval but evidence.occurred → ViolationEvent.
- Optional log heuristics (`inferActionOccurred`) for merge/push/send patterns.

### E. Environment-scoped secret isolation with CI suite

- Matrix of environment × secret scope allow/deny.
- `assertHireIsolation()` / `blake-gate hire-check` as compliance test, not UI chrome.

### F. Cross-host contract

- Same package for Cursor CLI, Claude Code, custom workers, GitHub Actions (`HOST_CONTRACT_VERSION`).
- Delivery of ApprovalRequest is thin adapters; core stays runtime.

---

## 5. Best mode / embodiment (software)

Reference implementation: public package `blake-gate` ≥ 0.2.x

| Module | Role |
|--------|------|
| `compile.ts` / `artifact.ts` | PolicySource → CompiledPolicy + policyHash |
| `fingerprint.ts` | intentFingerprint |
| `gate.ts` | evaluateIntent |
| `proof.ts` | signAllowToken / verifyAllowToken / assertAllowToken |
| `approvals.ts` | durable ApprovalStore |
| `compliance.ts` | evaluatePostAction |
| `hire-isolation.ts` / `credentials.ts` | secret matrix |
| `approval-request.ts` | ApprovalRequest materialization |
| `cli.ts` | compile / evaluate / verify-token / hire-check |

Host example: Blake (`bl4k3.com`) maps agent settings → PolicySource, gates git merge / outbound via the package.

---

## 6. Alternatives considered (for attorney)

- Prompt-only policies — rejected (non-enforceable).
- Session-wide “human unlocked agent” — rejected (over-broad; no per-intent ticket).
- OPA/Rego general policy engines — related art; this system specializes agent intents + durable fingerprint tickets + proof tokens for side-effect runners + post-action evidence loop + hire secret matrix.
- Pure IAM scopes on GitHub tokens — complementary but does not bind a specific merge intent to a policy version proof.

---

## 7. Advantages

- Machine-verifiable allow independent of model honesty.
- Policy drift automatically revokes capability tickets.
- CI can verify tokens without trusting chat history.
- Detects bypass when action occurs after deny/require_approval.
- Hire marketplace isolation is objectively testable.

---

## 8. Public disclosure / on-sale

See `DISCLOSURE-TIMELINE.md`. First enabling public release **2026-11-13** (git + npm). File provisional ASAP.

---

## 9. Figures to prepare (for provisional PDF)

1. System diagram: LLM → Intent → Policy Runtime → Decision → Runner (verify token) → Side-effect → Post-action audit.  
2. Sequence: require_approval → ApprovalRequest → grant(fingerprint, policyHash) → later allow with same fingerprint.  
3. Token verify fail-closed path.  
4. Hire isolation matrix table.  
5. PolicyHash invalidation of durable approval.

---

## 10. Source pointers (non-exhaustive)

- Fingerprint: `src/fingerprint.ts`
- Gate: `src/gate.ts`
- Proof: `src/proof.ts`
- Approvals: `src/approvals.ts`
- Compliance: `src/compliance.ts`
- Hire: `src/hire-isolation.ts`
- Types: `src/types.ts`
- Integrate: `INTEGRATING.md`, `README.md`
