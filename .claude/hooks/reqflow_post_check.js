#!/usr/bin/env node
'use strict';

const lib = require('../scripts/reqflow-lib');
const validate = require('../scripts/reqflow-check');

// PostToolUse: validate artifacts when they are written. Advisory only.
function main(raw) {
  const input = lib.readJsonInput(raw);
  if (input.agent_id && input.agent_id !== 'null') return;

  const filePath = input.tool_input && input.tool_input.file_path;
  if (!filePath) return;

  const root = lib.projectRoot(input);
  const config = lib.loadConfig(root);
  const parsed = lib.parseArtifactPath(filePath, config, root);
  if (!parsed) return;
  if (lib.isFinalized(parsed.absoluteFeatureRoot)) return;

  let findings = [];
  if (parsed.artifact === 'prd') findings = validate.checkPrd(filePath, config);
  else if (parsed.artifact === 'analysis') findings = validate.checkAnalysis(filePath);
  else if (parsed.artifact === 'design') findings = validate.checkDesign(filePath);
  else return;

  const issues = findings.filter((f) => f.level !== 'pass');
  if (!issues.length) return;

  lib.print(
    [
      `[RTD 产物自检] ${parsed.feature} · ${parsed.artifactDir}`,
      ...issues.map((f) => `  ${f.level === 'error' ? '❌' : '⚠️'} ${f.message}`),
      '',
      '仅为自动提醒。硬性质量闸门仍由对应 skill 与人工确认负责。',
    ].join('\n')
  );
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => main(raw));
process.stdin.on('error', () => main(raw));
