# US provisional filing checklist — blake-gate

## Do this week

- [ ] Confirm inventor legal name(s) and assignee entity (if any)
- [ ] Confirm first disclosure date (**2026-11-13** per git/npm) — see `DISCLOSURE-TIMELINE.md`
- [ ] Engage US patent attorney (software / cybersecurity preferred)
- [ ] Send `ATTORNEY-BRIEF.txt` + zip of `/legal` + pointer to repo tag/`0.2.1`
- [ ] Decide: file provisional **before** any additional detailed blog/demo that expands enabling disclosure abroad
- [ ] Budget: provisional often ~\$3–8k with counsel; DIY Patent Center possible but riskier under Alice + crowded art

## Provisional contents (minimum quality bar)

- [ ] Written description enabling the fingerprint → gate → allowToken → verify path
- [ ] At least figures 1–3 from invention disclosure §9
- [ ] Explicit mention of policyHash-bound durable approvals
- [ ] Explicit mention of post-action violation when deny/require_approval but occurred
- [ ] Hire isolation matrix
- [ ] Pseudocode or flow equivalent to `evaluateIntent` / `assertAllowToken` / `evaluatePostAction` (source excerpts OK if consistent with public Apache code)

## USPTO logistics

- [ ] Create USPTO.gov / Patent Center account
- [ ] Entity status: micro / small / large
- [ ] File provisional application (coversheet + spec + drawings + fee)
- [ ] Calendar **conversion deadline = filing date + 12 months**
- [ ] Also calendar **grace period vs first public disclosure (~2027-11-12)** if provisional slips

## Parallel non-patent protections (do regardless)

- [ ] Keep inventorship / assignment docs signed
- [ ] Trademark: BLAKE / bl4k3 (separate)
- [ ] Trade secret: signing secrets, private host keys (never in repo)
- [ ] Apache-2.0 strategy memo with counsel (patent grant / defensive termination)

## What you cannot skip

Filing **requires** a human with inventor identity and payment. This repo pack prepares the substance; it does not submit the application.
