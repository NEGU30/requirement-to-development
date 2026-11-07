#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./reqflow-lib');

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      opts._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === 'help' || key === 'json') {
      opts[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      opts[key] = true;
    } else {
      opts[key] = value;
      i += 1;
    }
  }
  return opts;
}

function usage() {
  console.log(`Usage:
  node .claude/scripts/reqflow-state.js init   --root <featureRoot> --author <name> --module <module> --feature <name> [--flow A|B]
  node .claude/scripts/reqflow-state.js set    --root <featureRoot> --stage <0-6|analysis|brainstorming|visual|prd|review|retro|finalized> [--round N] [--note text]
  node .claude/scripts/reqflow-state.js get    --root <featureRoot> [--field stage]
  node .claude/scripts/reqflow-state.js list
  node .claude/scripts/reqflow-state.js finalize --root <featureRoot>
  node .claude/scripts/reqflow-state.js reopen   --root <featureRoot> [--reason text]

Run from the project root, or set CLAUDE_PROJECT_DIR.`);
}

function project() {
  return lib.projectRoot();
}

function resolveFeatureRoot(opts) {
  if (!opts.root || opts.root === true) {
    throw new Error('缺少 --root <方案根路径>，例如 个人/张三-1001/_通用/日历周视图');
  }
  return path.resolve(project(), String(opts.root));
}

function now() {
  return new Date().toISOString();
}

function displayPath(featureRoot) {
  const root = project();
  const relative = path.relative(root, featureRoot).replace(/\\/g, '/');
  return relative && !relative.startsWith('..') ? relative : featureRoot.replace(/\\/g, '/');
}

function loadOrFail(featureRoot) {
  const state = lib.readState(featureRoot);
  if (!state) {
    throw new Error(`未找到状态文件：${displayPath(featureRoot)}/RequirementLogs/state.json。请先运行 init。`);
  }
  return state;
}

function normalizeStage(config, raw) {
  if (raw === undefined || raw === true) throw new Error('缺少 --stage');
  if (/^[0-6]$/.test(String(raw))) {
    const stage = lib.stageByIndex(config, Number(raw));
    if (stage) return stage;
  }
  const stage = lib.stageByKey(config, String(raw));
  if (!stage) throw new Error(`未知阶段：${raw}`);
  return stage;
}

function init(opts) {
  const featureRoot = resolveFeatureRoot(opts);
  const config = lib.loadConfig(project());
  const existing = lib.readState(featureRoot);
  const timestamp = now();

  const state = existing || {
    schemaVersion: 1,
    createdAt: timestamp,
    round: 1,
    history: [],
  };

  if (opts.author && opts.author !== true) state.author = String(opts.author);
  if (opts.module && opts.module !== true) state.module = String(opts.module);
  if (opts.feature && opts.feature !== true) state.feature = String(opts.feature);
  if (opts.flow && opts.flow !== true) state.flow = String(opts.flow).toUpperCase();
  state.root = displayPath(featureRoot);
  state.currentStage = state.currentStage || 'analysis';
  state.status = state.status || 'active';
  state.updatedAt = timestamp;
  state.history = Array.isArray(state.history) ? state.history : [];
  state.history.push({
    at: timestamp,
    action: existing ? 'reinit' : 'init',
    stage: state.currentStage,
    note: existing ? '重新进入流程，沿用既有方案根' : '流程启动',
  });

  lib.writeState(featureRoot, state);
  console.log(`状态已${existing ? '更新' : '创建'}：${displayPath(featureRoot)}/RequirementLogs/state.json`);
  console.log(`功能：${state.feature || '(未命名)'} · 作者：${state.author || '(未填)'} · 模块：${state.module || '_通用'} · 轮次：${state.round} · 阶段：${state.currentStage}`);
  if (state.status === 'finalized') {
    console.log('注意：该功能已定稿。若要开启新改版/回流，请执行 reopen（删除 .finalized 并轮次 +1）。');
  }
}

function set(opts) {
  const featureRoot = resolveFeatureRoot(opts);
  const config = lib.loadConfig(project());
  const state = loadOrFail(featureRoot);
  const stage = normalizeStage(config, opts.stage);
  const timestamp = now();

  state.currentStage = stage.key;
  if (opts.round !== undefined && opts.round !== true) state.round = Number(opts.round);
  if (stage.key === 'finalized') {
    state.status = 'finalized';
    state.finalizedAt = timestamp;
    fs.mkdirSync(path.join(featureRoot, 'RequirementLogs'), { recursive: true });
    fs.writeFileSync(path.join(featureRoot, 'RequirementLogs', '.finalized'), `${timestamp}\n`, 'utf8');
  } else if (state.status === 'finalized') {
    state.status = 'active';
    state.round = Number(state.round || 1) + 1;
    for (const name of ['.finalized', '.ui-review-reminded']) {
      fs.rmSync(path.join(featureRoot, 'RequirementLogs', name), { force: true });
    }
  }
  state.updatedAt = timestamp;
  state.history.push({
    at: timestamp,
    action: 'stage',
    stage: stage.key,
    note: opts.note && opts.note !== true ? String(opts.note) : '',
  });
  lib.writeState(featureRoot, state);
  console.log(`状态更新：${state.feature || path.basename(featureRoot)} → 阶段 ${stage.index} ${stage.label}（第 ${state.round} 轮）`);
}

function get(opts) {
  const featureRoot = resolveFeatureRoot(opts);
  const config = lib.loadConfig(project());
  const state = loadOrFail(featureRoot);
  if (opts.field && opts.field !== true) {
    const value = state[String(opts.field)];
    if (value === undefined) {
      process.exitCode = 1;
      console.error(`字段不存在：${opts.field}`);
      return;
    }
    console.log(typeof value === 'object' ? JSON.stringify(value) : value);
    return;
  }
  const stage = lib.stageByKey(config, state.currentStage);
  console.log(JSON.stringify({ ...state, stageIndex: stage ? stage.index : null }, null, 2));
}

function list() {
  const config = lib.loadConfig(project());
  const entries = lib.findStateFiles(project(), config);
  if (!entries.length) {
    console.log('无活跃流程状态。');
    return;
  }
  for (const entry of entries) {
    if (entry.legacy) {
      const legacy = lib.parseLegacyStage(entry.file, config);
      console.log(`${displayPath(entry.featureRoot)} · 旧日志 · ${legacy ? legacy.label : '阶段未记录'}`);
      continue;
    }
    const state = lib.readState(entry.featureRoot);
    if (!state) continue;
    const stage = lib.stageByKey(config, state.currentStage);
    console.log(
      `${displayPath(entry.featureRoot)} · 第 ${state.round || '?'} 轮 · ${stage ? stage.label : state.currentStage} · ${state.status || 'active'}`
    );
  }
}

function finalize(opts) {
  opts.stage = 'finalized';
  set(opts);
  console.log('定稿标记已创建。归档仍需线下评审 + 人工审批，本流程不自动归档。');
}

function reopen(opts) {
  const featureRoot = resolveFeatureRoot(opts);
  const config = lib.loadConfig(project());
  const state = loadOrFail(featureRoot);
  const timestamp = now();
  const marker = path.join(featureRoot, 'RequirementLogs', '.finalized');
  const uiMarker = path.join(featureRoot, 'RequirementLogs', '.ui-review-reminded');
  for (const file of [marker, uiMarker]) {
    try {
      fs.rmSync(file, { force: true });
    } catch {
      // Ignore missing markers.
    }
  }
  state.status = 'active';
  state.currentStage = 'brainstorming';
  state.round = Number(state.round || 1) + 1;
  state.updatedAt = timestamp;
  state.history.push({
    at: timestamp,
    action: 'reopen',
    stage: 'brainstorming',
    note: opts.reason && opts.reason !== true ? String(opts.reason) : '重新激活/回流',
  });
  lib.writeState(featureRoot, state);
  const stage = lib.stageByKey(config, 'brainstorming');
  console.log(`流程已重开：${state.feature || path.basename(featureRoot)} → 第 ${state.round} 轮 · ${stage.label}`);
  console.log('已删除 .finalized 与 UI 审查提醒标记。');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const command = opts._[0];
  try {
    switch (command) {
      case 'init':
        init(opts);
        break;
      case 'set':
        set(opts);
        break;
      case 'get':
        get(opts);
        break;
      case 'list':
        list();
        break;
      case 'finalize':
        finalize(opts);
        break;
      case 'reopen':
        reopen(opts);
        break;
      default:
        usage();
        process.exitCode = command ? 1 : 0;
    }
  } catch (error) {
    console.error(`reqflow-state: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
