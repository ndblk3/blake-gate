# Figure descriptions for provisional drawings

Export these to PDF/PNG for Patent Center. Mermaid can be rendered via any Mermaid live editor.

## Figure 1 — System context

```mermaid
flowchart LR
  LLM[Autonomous agent / LLM] -->|structured Intent| Gate[Policy runtime]
  Host[Host compiler] -->|CompiledPolicy + policyHash| Gate
  Gate -->|allow + allowToken| Runner[Tool runner / CI]
  Gate -->|require_approval| Appr[Approval delivery]
  Appr -->|grant fingerprint+policyHash| Store[Approval store]
  Store --> Gate
  Runner -->|assertAllowToken| Side[Side-effect: merge/send/…]
  Side -->|evidence| Post[Post-action compliance]
  Gate -->|prior decision| Post
  Post -->|violation?| Audit[Audit / violations]
```

## Figure 2 — Durable approval + policy drift

```mermaid
sequenceDiagram
  participant A as Agent
  participant G as Gate
  participant H as Human
  participant S as Approval store
  participant R as Runner
  A->>G: intent git.merge repo/branch
  G->>G: fingerprint fp1
  G-->>A: require_approval
  H->>S: grant(fp1, policyHash=H1)
  A->>G: same intent later
  G->>S: has(fp1, policyHash=H1)?
  S-->>G: yes
  G-->>R: allow + allowToken(fp1,H1)
  Note over Host,S: Owner edits policy → H2
  A->>G: same intent
  G->>S: has(fp1, policyHash=H2)?
  S-->>G: no (hash drift)
  G-->>A: require_approval again
```

## Figure 3 — Fail-closed verify

```mermaid
flowchart TD
  Start[Side-effect requested] --> Tok{allowToken present?}
  Tok -->|no| Block[Refuse: BLAKE_POLICY_NO_TOKEN]
  Tok -->|yes| Ver[verify HMAC + policyHash + expiry + fingerprint]
  Ver -->|fail| Block2[Refuse: BLAKE_POLICY_BAD_TOKEN]
  Ver -->|ok| Go[Perform merge/send/push]
```

## Figure 4 — Hire isolation matrix

| Environment \\ Scope | personal | org | hire |
|---------------------|----------|-----|------|
| personal_private | allow | — | deny |
| org_private | deny | allow | — |
| hire_sandbox | deny | deny | allow |

(Exact cells per `HIRE_ISOLATION_CASES` in source.)

## Figure 5 — Post-action compliance

```mermaid
flowchart LR
  Prior[Prior gate: deny or require_approval] --> Ev{evidence.occurred?}
  Ev -->|no| OK[ok]
  Ev -->|yes| Vio[ViolationEvent: fingerprint + policyHash + expectedEffect]
```
