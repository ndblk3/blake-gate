# Provisional specification outline (paste/expand into filing PDF)

**Title:** SYSTEMS AND METHODS FOR INTENT-FINGERPRINTED PROOF-CARRYING AUTHORIZATION OF AUTONOMOUS AGENT SIDE-EFFECTS

**Field:** This disclosure relates to computer security and autonomous software agents, and more particularly to authorizing side-effects proposed by language-model agents using a policy runtime outside the model.

**Background:** [summarize problem from INVENTION-DISCLOSURE §2; cite need beyond prompt guardrails]

**Summary:** [copy §3 solution overview]

**Brief description of drawings:** Figures 1–5 as in FIGURES.md

**Detailed description:**

1. Policy compilation and policyHash (canonical fields, versioning, diffs).  
2. Intent data structure and typed intent catalog.  
3. Fingerprint algorithm and durable approval store semantics.  
4. Gate evaluation producing allow/deny/require_approval with rule ids.  
5. Allow token construction, verification, fail-closed runner integration.  
6. ApprovalRequest materialization and host delivery adapters.  
7. Post-action compliance and log inference.  
8. Multi-environment secret isolation and CI assertion suite.  
9. Cross-host contract and example hosts (CLI agents, CI).  
10. Alternatives and advantages.

**Include enabling detail:** algorithms equivalent to `intentFingerprint`, `signAllowToken`/`verifyAllowToken`, durable approval `stillValid` policyHash check, and `evaluatePostAction` branching — sufficient for a PHOSITA to implement without undue experimentation.

**Claims:** optional in provisional; if included, start from CLAIM-CANDIDATES.md (counsel rewrite).

**Abstract (~150 words):** A runtime receives a structured agent intent and a compiled policy artifact identified by a content hash. The runtime computes an intent fingerprint used as a capability ticket, evaluates the intent to allow, deny, or require approval, and when allowing, issues a cryptographically authenticated allow token bound to the fingerprint and policy hash. Tool runners verify the token before side-effects and fail closed otherwise. Durable approvals are keyed by fingerprint and invalidated when the policy hash drifts. After execution, evidence that a side-effect occurred despite a prior deny or require-approval decision produces a violation record. Environment-scoped secret access is enforced via a testable isolation matrix including a hire-sandbox class.
