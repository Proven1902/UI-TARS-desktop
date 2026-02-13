#!/usr/bin/env node

import fs from 'node:fs/promises';

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
    report?.targetResult?.allPass === true
  );
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

  const [first, second] = await Promise.all([
    readReport(firstPath),
    readReport(secondPath),
  ]);

  const firstPass = isPassingReport(first);
  const secondPass = isPassingReport(second);
  const gatePass = firstPass && secondPass;

  const summary = {
    version: 'v1',
    checkedAt: new Date().toISOString(),
    reports: {
      first: {
        path: firstPath,
        ok: firstPass,
      },
      second: {
        path: secondPath,
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
