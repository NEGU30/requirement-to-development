#!/usr/bin/env node
'use strict';

const lib = require('../scripts/reqflow-lib');

const STAGE_LABEL = { visual: '阶段 2 可视化产物', prd: '阶段 3 PRD 产物' };

function main(raw) {
  const input = lib.readJsonInput(raw);
  if (input.agent_id && input.agent_id !== 'null') return;

  const filePath = input.tool_input && input.tool_input.file_path;
  if (!filePath) return;

  const root = lib.projectRoot(input);
  const config = lib.loadConfig(root);
  const parsed = lib.parseArtifactPath(filePath, config, root);
  if (!parsed || !STAGE_LABEL[parsed.artifact]) return;

  const featureRoot = parsed.absoluteFeatureRoot;
  if (lib.isFinalized(featureRoot)) return;

  const dirs = config.paths.artifacts;
  const warnings = [];
  const analysisOk = lib.artifactHasContent(featureRoot, dirs.analysis, {
    extensions: ['.md'],
    minBytes: 60,
  });
  const designOk = lib.artifactHasContent(featureRoot, dirs.design, {
    extensions: ['.md'],
    minBytes: 60,
  });
  const visualOk = lib.artifactHasContent(featureRoot, dirs.visual, {
    extensions: ['.html'],
    minBytes: 200,
  });

  if (parsed.artifact === 'visual') {
    if (!analysisOk) warnings.push(`阶段 0 需求论证缺失或为空：${dirs.analysis}/`);
  }

  if (parsed.artifact === 'prd') {
    if (!analysisOk) warnings.push(`阶段 0 需求论证缺失或为空：${dirs.analysis}/`);
    if (!designOk) warnings.push(`阶段 1 设计决策缺失或为空：${dirs.design}/`);
    if (!visualOk) warnings.push(`阶段 2 可视化 HTML 缺失或为空：${dirs.visual}/`);
  }

  const state = lib.readState(featureRoot);
  if (state) {
    const current = lib.stageByKey(config, state.currentStage);
    const currentIndex = current ? current.index : -1;
    const targetIndex = parsed.artifact === 'visual' ? 2 : 3;
    if (currentIndex >= 0 && currentIndex < targetIndex) {
      warnings.push(
        `state.json 显示当前仍在阶段 ${currentIndex} ${current.label}，尚未推进到${STAGE_LABEL[parsed.artifact]}`
      );
    }
  }

  if (!warnings.length) return;

  lib.print(
    [
      `[RTD 流程守护·提醒] 即将写入${STAGE_LABEL[parsed.artifact]}（功能：${parsed.feature}），但前置可能未完成：`,
      ...warnings.map((w) => `  - ${w}`),
      '',
      '这是提醒，不是拦截，写入会正常进行。请 AI 判断：',
      '  - 新功能尚未走前置流程 → 先回 requirement-pipeline；',
      '  - 补录/维护/路径写法不一致 → 可忽略；',
      '  - 若为错别字/格式修正 → 走勘误快线并记入流程日志。',
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
