#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('../scripts/reqflow-lib');

// PostToolUse: remind once per HTML revision, not once per feature forever.
function main(raw) {
  const input = lib.readJsonInput(raw);
  if (input.agent_id && input.agent_id !== 'null') return;

  const filePath = input.tool_input && input.tool_input.file_path;
  if (!filePath) return;

  const root = lib.projectRoot(input);
  const config = lib.loadConfig(root);
  const parsed = lib.parseArtifactPath(filePath, config, root);
  if (!parsed || parsed.artifact !== 'visual') return;
  if (!parsed.normalized.toLowerCase().endsWith('.html')) return;
  if (lib.isFinalized(parsed.absoluteFeatureRoot)) return;

  const marker = path.join(parsed.absoluteFeatureRoot, config.paths.artifacts.logs, '.ui-review-reminded');
  const fingerprint = lib.statFingerprint(filePath);
  let previous = '';
  try {
    previous = fs.readFileSync(marker, 'utf8').trim();
  } catch {
    // First revision.
  }
  if (previous === fingerprint) return;

  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, fingerprint + '\n', 'utf8');

  lib.print(
    [
      '[RTD 选配工具] 可视化 HTML 已生成或修改。用户确认通过后，可调用 ui-spec-review 审查 UI 规范（按钮/颜色/圆角/弹窗/蒙版/投影）。',
      '需先放置项目规范：team/conventions/UI设计规范参考.md。',
      '每次 HTML 内容变化只提醒一次；回流重开时会自动重置。',
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
