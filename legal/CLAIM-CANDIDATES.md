# Draft claim candidates (US utility) — blake-gate

**Status:** brainstorming for counsel · **not** final claims · expect heavy rewrite for §101 / prior art  
**Goal:** emphasize combination that differs from fidelity/integrity-signal patents and OS-UI automation patents.

---

## Independent claim A — Method (pre-gate + proof + verify)

1. A computer-implemented method for authorizing a side-effect requested by an autonomous agent, comprising:

   (a) obtaining a compiled policy artifact comprising enforceable fields and a content hash of those fields (`policyHash`);

   (b) receiving an agent intent data structure comprising at least an intent type, an agent identifier, an execution environment identifier, and a target identifier;

   (c) computing an intent fingerprint from a canonical serialization of selected fields of the intent, the fingerprint identifying a capability ticket independent of natural-language chat history;

   (d) evaluating the intent against the compiled policy to produce a gate decision selected from allow, deny, and require_approval, the decision including one or more rule identifiers;

   (e) when the gate decision is allow, generating a cryptographically authenticated allow token whose authenticated payload includes at least the intent fingerprint, the policyHash, and the rule identifiers; and

   (f) before performing a corresponding side-effect, verifying the allow token against a current policyHash and refusing the side-effect when verification fails or when no allow token is presented.

---

## Independent claim B — Durable approval bound to policy hash

2. A computer-implemented method comprising:

   (a) computing an intent fingerprint for an agent intent as in claim 1(c);

   (b) when evaluation yields require_approval, storing a durable approval record keyed by the fingerprint and associated with a policyHash of the policy then in force;

   (c) on a subsequent intent having the same fingerprint, treating the durable approval as satisfying the approval requirement only if a current policyHash matches the policyHash stored with the approval; and

   (d) invalidating or ignoring the durable approval when the current policyHash differs, thereby requiring a new approval after policy drift.

---

## Independent claim C — Post-action compliance loop

3. A computer-implemented method comprising:

   (a) recording a prior gate decision for an agent intent, the prior decision being deny or require_approval;

   (b) after an attempted or purported side-effect, obtaining evidence indicating whether the side-effect occurred;

   (c) when the evidence indicates the side-effect occurred while the prior gate decision was deny or require_approval, emitting a machine-readable violation event binding at least the intent fingerprint, the policyHash, the prior expected effect, and the evidence; and

   (d) optionally inferring occurrence from structured or unstructured execution logs using intent-type-specific patterns.

---

## Independent claim D — Hire / multi-environment secret isolation

4. A computer-implemented method comprising:

   (a) labeling an agent execution with an environment class selected from at least personal, organization, and hire-sandbox;

   (b) receiving a secret-read intent specifying a secret scope;

   (c) denying or allowing the secret-read according to a predetermined isolation matrix over environment class × secret scope such that hire-sandbox cannot read personal or organization secrets; and

   (d) executing an automated test suite that asserts the isolation matrix in continuous integration.

---

## Independent claim E — System

5. A system comprising one or more processors and memory storing instructions that, when executed, cause the system to perform the method of any of claims 1–4, including a policy compiler, an intent gate, an allow-token signer/verifier callable from a runner or CI job, and an approval store.

---

## Useful dependents (attach liberally)

- Intent types include at least one of: git.merge, git.push, mail.send, chat.send, outbound.publish, secret.read.  
- Fingerprint inputs further include repository full name and branch.  
- Allow token uses HMAC with a host secret and timing-safe comparison.  
- Allow token includes expiration; verifier rejects expired tokens.  
- ApprovalRequest is materialized for webhook/email/Slack without embedding delivery in the gate core.  
- Policy artifact supports previousHash and structured field diffs.  
- Practice/sandbox mode denies live write intents.  
- Cross-host adapter contract version identifier shared by CLI agents and CI.

---

## Differentiation cues for counsel (not claim text)

| Nearby art | Push claims toward |
|------------|-------------------|
| US 12,688,261 (fidelity/integrity signals + delegation artifact) | Structured **intent catalog** outside model; **fingerprint durable tickets**; **policyHash-bound** approval + token; **fail-closed runner verify**; less reliance on behavioral fidelity signals |
| US 2026/0244749 (OS UI automation + screenshot pre-hash) | Connector/side-effect intents (git/mail), not OS input-event workflows / DOM screenshots |
| Generic OPA / IAM | Agent intent fingerprint + proof token for tool runners + post-action violation when deny was expected |

Counsel should run a full search and draft around surviving combination, not any single bullet.
