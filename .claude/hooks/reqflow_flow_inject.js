#!/usr/bin/env node
'use strict';

const path = require('path');
const lib = require('../scripts/reqflow-lib');

const NEXT = {
  analysis: 'requirement-analysis',
  brainstorming: 'brainstorming',
  visual: 'visual-companion',
  prd: 'prd-generator',
  review: 'requirement-review',
  retro: 'retrospective',
  finalized: '流程已定稿',
};

const ARTIFACT = {
  analysis: 'RequirementAnalysis/',
  brainstorming: 'DesignDecisions/',
  visual: 'VisualMockups/',
  prd: 'PRD/',
  review: 'ReviewLogs/',
  retro: 'Retrospectives/',
};

function main(raw) {
  const input = lib.readJsonInput(raw);
  const root = lib.projectRoot(input);
  const config = lib.loadConfig(root);
  const entries = lib.findStateFiles(root, config);
  if (!entries.length) return;

  const latest = entries[0];
  if (lib.isFinalized(latest.featureRoot)) return;

  const feature = path.basename(latest.featureRoot);
  if (latest.legacy) {
    const legacy = lib.parseLegacyStage(latest.file, config);
    if (!legacy) {
      lib.print(`[RTD] 活跃需求：${feature} · 阶段未记录（旧流程日志）。建议运行 reqflow-state.js init 迁移状态。`);
      return;
    }
    lib.print(`[RTD] 活跃需求：${feature} · ${legacy.label}（旧流程日志，轮次未知）。`);
    return;
  }

  const state = lib.readState(latest.featureRoot);
  if (!state) return;
  if (state.status === 'finalized') return;

  const stage = lib.stageByKey(config, state.currentStage);
  const label = stage ? stage.label : state.currentStage;
  const index = stage ? stage.index : '?';
  const next = NEXT[state.currentStage] || '按总控调度';
  const artifact = ARTIFACT[state.currentStage];

  lib.print(
    `[RTD] 活跃需求：${feature} · 第 ${state.round || '?'} 轮 · 阶段 ${index} ${label} · 下一步：${next}` +
      (artifact ? ` · 产物目录：${artifact}` : '')
  );
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => main(raw));
process.stdin.on('error', () => main(raw));
