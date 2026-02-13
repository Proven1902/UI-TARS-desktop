#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

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

const readReport = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

const isPassingReport = (report) => {
  return (
    report?.executionStatus?.state === 'executed' &&
    report?.targetResult?.coveragePass === true &&
    report?.targetResult?.allPass === true
  );
};

const getRunId = (report) => {
  if (typeof report?.scope?.runId === 'string' && report.scope.runId.trim()) {
    return report.scope.runId;
  }

  return null;
};

const main = async () => {
  const args = parseArgs();
  const firstPath = args.first;
  const secondPath = args.second;

  if (!firstPath || !secondPath) {
    throw new Error(
      'Usage: node scripts/reliability/check-kpi-gate.mjs --first <run1.report.json> --second <run2.report.json>',
    );
  }

  const firstResolvedPath = path.resolve(firstPath);
  const secondResolvedPath = path.resolve(secondPath);
  if (firstResolvedPath === secondResolvedPath) {
    throw new Error('KPI gate requires two distinct report files');
  }

  const [first, second] = await Promise.all([
    readReport(firstPath),
    readReport(secondPath),
  ]);

  const firstRunId = getRunId(first);
  const secondRunId = getRunId(second);
  if (!firstRunId || !secondRunId) {
    throw new Error('Each KPI report must include a non-empty scope.runId');
  }

  if (firstRunId === secondRunId) {
    throw new Error(
      `KPI gate requires different runId values (both were '${firstRunId}')`,
    );
  }

  const firstPass = isPassingReport(first);
  const secondPass = isPassingReport(second);
  const gatePass = firstPass && secondPass;

  const summary = {
    version: 'v1',
    checkedAt: new Date().toISOString(),
    reports: {
      first: {
        path: firstPath,
        runId: firstRunId,
        ok: firstPass,
      },
      second: {
        path: secondPath,
        runId: secondRunId,
        ok: secondPass,
      },
    },
    gatePass,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (!gatePass) {
    process.exit(1);
  }
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
