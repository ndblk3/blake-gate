# Public disclosure timeline — blake-gate

**Prepared:** 2026-11-14 (UTC)  
**Jurisdiction of interest:** United States  
**Caveat:** US inventors often have a **one-year grace period** from their own first public disclosure to file. Confirm inventorship, entity status, and foreign-filing strategy with counsel. Many foreign jurisdictions are absolute novelty (no grace period).

## Documented first public acts

| When (UTC) | Event | Evidence |
|------------|-------|----------|
| 2026-11-13 | Initial public git commit | `3c00ffc` — “Initial public release of blake-gate.” |
| 2026-11-13T17:30:27Z | npm package created | `npm view blake-gate time.created` |
| 2026-11-13T17:38:39Z | npm `0.1.0` | `npm view blake-gate time` |
| 2026-11-13T18:01:10Z | npm `0.2.0` (moat layer) | fingerprints, allow-tokens, hire suite, post-compliance |
| 2026-11-13T18:03:11Z | npm `0.2.1` (current at prep) | `0.2.1` |
| 2026-11-13 | Public repo | https://github.com/ndblk3/blake-gate |
| Ongoing | Product docs | https://bl4k3.com/guard |
| License | Apache-2.0 | Includes patent license grant language — discuss with counsel |

## Working provisional deadline (US grace)

If **2026-11-13** is accepted as first enabling public disclosure:

- **Target provisional filing:** immediately (days/weeks, not months)
- **Hard calendar reminder:** file utility / claim priority **before 2026-11-13** (+1 year) — treat as **2027-11-12** end of day US counsel timezone until confirmed

## Pre-disclosure private work

Record (for attorney) any earlier **non-public** conception / reduction to practice:

- [ ] Private commits / local dates before 2026-11-13
- [ ] Internal demos under NDA
- [ ] Notebooks / design docs with timestamps
- [ ] Inventor legal name(s) and contribution split

## Open-source implication (one line)

Publishing under Apache-2.0 does **not** by itself prevent filing, but the license’s patent grant and defensive termination clauses affect enforcement strategy — flag to counsel before relying on a patent for exclusivity while keeping the package public.
