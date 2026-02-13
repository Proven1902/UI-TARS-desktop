# Release Readiness Checklist (Reliability Migration)

Use this checklist to decide if the migration plan is fully complete.

## A. Traceability

- [x] All plan slices `PR-00..PR-17` mapped in `docs/reliability/migration-traceability-matrix.md`
- [x] Any numbering drift between plan PR IDs and GitHub PR numbers documented
- [x] Any embedded slices (for example `PR-10a`) explicitly called out

## B. Baseline + KPI evidence

- [x] Baseline harness protocol exists (`docs/reliability/baseline-harness-runbook.md`)
- [x] Baseline artifact report exists using required metrics
- [x] Two consecutive KPI gate reports exist and pass thresholds
- [x] Raw run data linked for every report

## C. Phase DoD evidence

- [ ] P0 regression evidence attached
- [ ] P1 deterministic tool path evidence attached
- [ ] P2 taxonomy/retry/recovery evidence attached
- [ ] P3 confidence/loop-breaker/observability evidence attached

## D. Rollback rehearsal evidence

- [ ] Rehearsal completed for active reliability flags:
  - [ ] `ffToolRegistry`
  - [ ] `ffInvokeGate`
  - [ ] `ffToolFirstRouting`
  - [ ] `ffConfidenceLayer`
  - [ ] `ffLoopGuardrails`
- [ ] Fallback behavior validated for new sessions
- [ ] Rollback logs/artifacts stored and linked

## E. Global sign-off

- [ ] No P0/P1 regressions in smoke/e2e suite
- [x] Operations docs updated (contracts, flags, runbooks)
- [ ] Final approval note includes commit/PR references and report links

## F. Current closure snapshot (2026-02-13)

- Merged closure PRs: `#20`, `#21`, `#22`
- Ops/sign-off runbook: `docs/reliability/operations-signoff-runbook.md`
- New measured KPI evidence set:
  - baseline: `docs/reliability/artifacts/2026-02-13-baseline-run-002.report.json`
  - gate: `docs/reliability/artifacts/2026-02-13-gate-run-003.report.json`, `docs/reliability/artifacts/2026-02-13-gate-run-004.report.json`
  - two-run gate output: `docs/reliability/artifacts/2026-02-13-gate-run-003-004.gate.json`
- Still required for final readiness: full rollback rehearsal evidence + no-regression smoke/e2e evidence + final approval note
