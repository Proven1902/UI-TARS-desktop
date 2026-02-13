# Baseline Harness Runbook

This runbook defines the baseline/KPI measurement protocol for the reliability migration plan.

References:

- `docs/reliability/plan-closure-backlog.md`
- `docs/reliability/migration-traceability-matrix.md`

## 1. Fixed environment

- Platform: Windows desktop runner.
- Displays: run both single-monitor and multi-monitor samples.
- Build: record exact git commit, branch, app version, and model/provider config.
- Feature flags: record all reliability flags for each run:
  - `ffToolRegistry`
  - `ffInvokeGate`
  - `ffToolFirstRouting`
  - `ffConfidenceLayer`
  - `ffLoopGuardrails`

## 2. Scenario pack

Run each scenario with deterministic setup and consistent prompts.

- `open_cursor` (open Cursor)
- `open_settings` (open Settings)
- `focus_existing_browser_window`
- `recover_from_intentional_timeout`

For baseline and KPI gates, target total volume of 200 runs across the scenario pack.

## 3. Required metrics

Collect and report these metrics per run set:

- open-app first-attempt success rate
- wrong-click rate
- max-loop termination rate
- auth hard-failure rate

## 4. Data capture protocol

For every run, persist at minimum:

- `runId`, timestamp, `scenarioId` (must use canonical IDs from section 2)
- session id
- final status (`completed`, `blocked`, `error`, etc.)
- first-attempt success boolean for open-app scenarios
- wrong-click boolean/count
- max-loop termination boolean
- auth hard-failure boolean
- active feature flags and provider/model settings

Store artifacts in `docs/reliability/artifacts/` using timestamped file names.

## 5. Output artifacts

For each measurement batch produce:

1. Raw runs file (JSON or NDJSON)
2. Aggregated report JSON (see template file)
3. Short markdown summary with conclusions and known caveats

### KPI automation commands

```bash
node scripts/reliability/compute-kpi-report.mjs \
  --raw docs/reliability/artifacts/<timestamp>-raw-runs.ndjson \
  --out docs/reliability/artifacts/<timestamp>-report.json \
  --runId <run-id> \
  --runType gate \
  --minSampleCount 200 \
  --branch main \
  --commit <commit-sha> \
  --provider <provider-name> \
  --model <model-name>
```

```bash
node scripts/reliability/check-kpi-gate.mjs \
  --first docs/reliability/artifacts/<run-1>.report.json \
  --second docs/reliability/artifacts/<run-2>.report.json
```

The report must fail coverage when either condition is not met:

- sample count is below target (`200` by default)
- one or more canonical scenarios are missing from the batch

## 6. Acceptance thresholds

Use these plan thresholds for readiness evaluation:

- wrong-click rate < 1%
- open-app first-attempt success >= 95%
- two consecutive runs meeting targets

## 7. Rollback rehearsal linkage

Each KPI run should state whether rollback rehearsal has been executed for the same build/flags and link to evidence.
