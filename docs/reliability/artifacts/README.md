# Reliability Artifacts Guide

This directory stores baseline/KPI and rollback evidence artifacts.

## Canonical scenario IDs

Use these IDs consistently in raw runs (`scenarioId`):

- `open_cursor`
- `open_settings`
- `focus_existing_browser_window`
- `recover_from_intentional_timeout`

## Generate KPI report from raw runs

```bash
node scripts/reliability/compute-kpi-report.mjs \
  --raw docs/reliability/artifacts/<timestamp>-raw-runs.ndjson \
  --out docs/reliability/artifacts/<timestamp>-report.json \
  --runId <run-id> \
  --repo <owner/repo> \
  --runType gate \
  --minSampleCount 200 \
  --branch main \
  --commit <commit-sha> \
  --provider <provider-name> \
  --model <model-name>
```

## Check two-run KPI gate

```bash
node scripts/reliability/check-kpi-gate.mjs \
  --first docs/reliability/artifacts/<run-1>.report.json \
  --second docs/reliability/artifacts/<run-2>.report.json
```

Exit code `0` means both reports passed and the gate is green.

The gate checker rejects:

- duplicated `--first/--second` report path
- duplicated `scope.runId` values
- mismatched build/model provenance fields across reports (`environment.git.*`, `environment.model.*`)
- reports without full coverage pass
