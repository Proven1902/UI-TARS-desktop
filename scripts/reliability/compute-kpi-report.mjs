#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const CANONICAL_SCENARIO_IDS = new Set([
  'open_cursor',
  'open_settings',
  'focus_existing_browser_window',
  'recover_from_intentional_timeout',
]);

const OPEN_APP_SCENARIO_IDS = new Set(['open_cursor', 'open_settings']);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (!key.startsWith('--') || value == null || value.startsWith('--')) {
      continue;
    }
    result[key.slice(2)] = value;
    index += 1;
  }

  return result;
};

const toBooleanOrNull = (value) => {
  if (value === true || value === false) {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  return null;
};

const safeRate = (numerator, denominator) => {
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return Number((numerator / denominator).toFixed(6));
};

const ensureRow = (row, rowIndex) => {
  const requiredStringFields = [
    'runId',
    'timestamp',
    'scenarioId',
    'sessionId',
    'finalStatus',
  ];

  for (const field of requiredStringFields) {
    if (typeof row[field] !== 'string' || row[field].trim().length === 0) {
      throw new Error(
        `Invalid raw-run row ${rowIndex + 1}: missing non-empty '${field}'`,
      );
    }
  }

  if (!CANONICAL_SCENARIO_IDS.has(row.scenarioId)) {
    throw new Error(
      `Invalid raw-run row ${rowIndex + 1}: unknown scenarioId '${row.scenarioId}'`,
    );
  }
};

const readRawRuns = async (rawPath) => {
  const content = await fs.readFile(rawPath, 'utf8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, index) => {
    const row = JSON.parse(line);
    ensureRow(row, index);
    return row;
  });
};

const main = async () => {
  const args = parseArgs();
  const rawPath = args.raw;
  const outputPath = args.out;

  if (!rawPath || !outputPath) {
    throw new Error(
      'Usage: node scripts/reliability/compute-kpi-report.mjs --raw <raw.ndjson> --out <report.json> [--commit <sha>] [--provider <name>] [--model <name>] [--runType <baseline|gate>]',
    );
  }

  const rows = await readRawRuns(rawPath);

  const openAppRows = rows.filter((row) => OPEN_APP_SCENARIO_IDS.has(row.scenarioId));
  const openAppKnown = openAppRows.filter(
    (row) => typeof row.openAppFirstAttemptSuccess === 'boolean',
  );
  const openAppSuccessCount = openAppKnown.filter(
    (row) => row.openAppFirstAttemptSuccess === true,
  ).length;

  const wrongClickKnown = rows
    .map((row) => toBooleanOrNull(row.wrongClick))
    .filter((value) => value !== null);
  const wrongClickCount = wrongClickKnown.filter((value) => value === true).length;

  const maxLoopKnown = rows
    .map((row) => toBooleanOrNull(row.maxLoopTermination))
    .filter((value) => value !== null);
  const maxLoopCount = maxLoopKnown.filter((value) => value === true).length;

  const authHardFailureKnown = rows
    .map((row) => toBooleanOrNull(row.authHardFailure))
    .filter((value) => value !== null);
  const authHardFailureCount = authHardFailureKnown.filter(
    (value) => value === true,
  ).length;

  const openAppFirstAttemptSuccessRate = safeRate(
    openAppSuccessCount,
    openAppKnown.length,
  );
  const wrongClickRate = safeRate(wrongClickCount, wrongClickKnown.length);
  const maxLoopTerminationRate = safeRate(maxLoopCount, maxLoopKnown.length);
  const authHardFailureRate = safeRate(
    authHardFailureCount,
    authHardFailureKnown.length,
  );

  const openAppPass =
    openAppFirstAttemptSuccessRate !== null && openAppFirstAttemptSuccessRate >= 0.95;
  const wrongClickPass = wrongClickRate !== null && wrongClickRate < 0.01;
  const allPass = openAppPass && wrongClickPass;

  const scenarioCounts = rows.reduce((accumulator, row) => {
    accumulator[row.scenarioId] = (accumulator[row.scenarioId] || 0) + 1;
    return accumulator;
  }, {});

  const report = {
    reportVersion: 'v1',
    generatedAt: new Date().toISOString(),
    scope: {
      runType: args.runType || 'baseline',
      sampleCount: rows.length,
      scenarios: [...CANONICAL_SCENARIO_IDS],
      scenarioCounts,
    },
    environment: {
      platform: args.platform || process.platform,
      git: {
        repo: 'Proven1902/UI-TARS-desktop',
        branch: args.branch || 'main',
        commit: args.commit || 'unknown',
      },
      model: {
        provider: args.provider || 'unknown',
        name: args.model || 'unknown',
      },
    },
    metrics: {
      openAppFirstAttemptSuccessRate,
      wrongClickRate,
      maxLoopTerminationRate,
      authHardFailureRate,
    },
    targets: {
      openAppFirstAttemptSuccessRate: '>=0.95',
      wrongClickRate: '<0.01',
    },
    targetResult: {
      openAppFirstAttemptSuccessRatePass: openAppPass,
      wrongClickRatePass: wrongClickPass,
      allPass,
    },
    executionStatus: {
      state: 'executed',
      rawRunsPath: rawPath,
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `KPI report generated: ${outputPath} (allPass=${report.targetResult.allPass})\n`,
  );
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
