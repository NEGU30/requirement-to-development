'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const lib = require(path.join(root, '.claude', 'scripts', 'reqflow-lib.js'));
const validate = require(path.join(root, '.claude', 'scripts', 'reqflow-check.js'));

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rtd-test-'));
const featureRel = '个人/张三-1001/_通用/日历周视图';
const featureRoot = path.join(TMP, ...featureRel.split('/'));

function run(script, args, input) {
  return spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: TMP,
    env: { ...process.env, CLAUDE_PROJECT_DIR: TMP },
    input: input === undefined ? '' : JSON.stringify(input),
    encoding: 'utf8',
  });
}

function write(rel, content) {
  const file = path.join(featureRoot, ...rel.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

function prdText(extraChars = 1600) {
  const body = `---
文档类型: 需求文档
功能名称: 日历周视图
版本: v1.0
---

## 📊 0. 需求与产品概述
根源动机：减少日程冲突。用户反馈原文：找不到本周安排。
痛点：频繁确认、易冲突。

## 💡 1. 设计方案与取舍
| 方案 | 说明 |
|---|---|
| A | 周视图 |
| B | 日视图 |

- [FID: Cal_001] 周视图聚合，P0🔴，选 A 弃 B，因为跨天查看更高效。
- [FID: Cal_002] 冲突提示，P1🟡。

## ⚠️ 2. 假设的反馈与风险
- 假设：用户每周查看 ≥ 3 次。推翻条件：后台数据显示低于 1 次。
- 风险：数据加载慢。

## ⚙️ 3. 功能设计与分期规划
- [FID: Cal_001] P0🔴，解决策划找不到本周安排的问题。
- [FID: Cal_002] P1🟡，解决冲突提醒。

## 📱 4. 跨端交互差异
仅 Windows 端，无跨端差异。

## 📈 5. 数据埋点（业务意图 · 可选）
事件：周视图打开。

## 📝 6. 更新记录
| 版本 | 日期 | 改了什么 | 改动原因 |
|---|---|---|---|
| v1.0 | 2026-11-08 | 初版 | 新需求 |

${'补充说明。'.repeat(Math.ceil(extraChars / 5))}
`;
  return body;
}

test.after(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

test('path parsing handles Windows, Chinese and non-RTD paths', () => {
  const config = lib.loadConfig(root);
  const parsed = lib.parseArtifactPath(
    'E:\\ZcProject\\个人\\张三-1001\\_通用\\日历周视图\\PRD\\01_日历周视图_需求文档.md',
    config,
    root
  );
  assert.ok(parsed);
  assert.strictEqual(parsed.feature, '日历周视图');
  assert.strictEqual(parsed.artifact, 'prd');
  assert.ok(parsed.featureRoot.endsWith('个人/张三-1001/_通用/日历周视图'));

  const outside = lib.parseArtifactPath('E:/ZcProject/docs/PRD/a.md', config, root);
  assert.strictEqual(outside, null);

  const relative = lib.parseArtifactPath('个人/张三-1001/_通用/日历周视图/PRD/a.md', config, root);
  assert.ok(relative);
  assert.strictEqual(relative.featureRoot, '个人/张三-1001/_通用/日历周视图');
});

test('state init / set / finalize / reopen', () => {
  let result = run('.claude/scripts/reqflow-state.js', [
    'init',
    '--root',
    featureRel,
    '--author',
    '张三-1001',
    '--module',
    '_通用',
    '--feature',
    '日历周视图',
    '--flow',
    'B',
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
  const statePath = path.join(featureRoot, 'RequirementLogs', 'state.json');
  assert.ok(fs.existsSync(statePath));
  assert.strictEqual(JSON.parse(fs.readFileSync(statePath, 'utf8')).currentStage, 'analysis');

  result = run('.claude/scripts/reqflow-state.js', [
    'set',
    '--root',
    featureRel,
    '--stage',
    '2',
    '--note',
    '可视化通过',
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(JSON.parse(fs.readFileSync(statePath, 'utf8')).currentStage, 'visual');

  result = run('.claude/scripts/reqflow-state.js', ['finalize', '--root', featureRel]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(featureRoot, 'RequirementLogs', '.finalized')));
  assert.strictEqual(JSON.parse(fs.readFileSync(statePath, 'utf8')).status, 'finalized');

  result = run('.claude/scripts/reqflow-state.js', ['reopen', '--root', featureRel, '--reason', '评审回流']);
  assert.strictEqual(result.status, 0, result.stderr);
  const reopened = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.strictEqual(reopened.status, 'active');
  assert.strictEqual(reopened.round, 2);
  assert.strictEqual(reopened.currentStage, 'brainstorming');
  assert.ok(!fs.existsSync(path.join(featureRoot, 'RequirementLogs', '.finalized')));
});

test('PRD validation catches structure, length, FID gaps and placeholders', () => {
  const config = lib.loadConfig(root);
  const prdFile = write('PRD/01_日历周视图_需求文档.md', prdText());
  const okFindings = validate.checkPrd(prdFile, config);
  assert.ok(!okFindings.some((f) => f.level === 'error'), JSON.stringify(okFindings));

  const shortFile = write('PRD/02_短_需求文档.md', prdText(10));
  assert.ok(validate.checkPrd(shortFile, config).some((f) => f.message.includes('字数偏少')));

  const gapFile = write(
    'PRD/03_断号_需求文档.md',
    prdText().replaceAll('[FID: Cal_002]', '[FID: Cal_003]')
  );
  assert.ok(validate.checkPrd(gapFile, config).some((f) => f.message.includes('FID 编号不连续')));

  const placeholderFile = write(
    'PRD/04_占位_需求文档.md',
    prdText().replaceAll('[FID: Cal_001]', '[FID: Xxx_001]')
  );
  assert.ok(validate.checkPrd(placeholderFile, config).some((f) => f.message.includes('模板占位')));
});

test('design and analysis validation require core sections', () => {
  const design = write(
    'DesignDecisions/设计决策_日历周视图.md',
    '## 2. 候选方案\nA/B\n## 3. 选型结论\n选 A，因为跨天查看。\n## 5. 关键假设与风险\n假设周查看 3 次；风险加载慢。'
  );
  assert.ok(!validate.checkDesign(design).some((f) => f.level === 'error'));

  const analysis = write(
    'RequirementAnalysis/需求论证_日历周视图.md',
    '## 1. 问题背景与反馈原文\n找不到本周安排。\n## 2. 根源动机\n减少冲突。\n## 4. 痛点画像\n频繁确认。\n## 8. 放行结论\n通过。'
  );
  assert.ok(!validate.checkAnalysis(analysis).some((f) => f.level === 'error'));
});

test('session hook is compact and states 5 reviewers', () => {
  const result = run('.claude/hooks/reqflow_session_init.js', []);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /5 位专家/);
  assert.match(result.stdout, /state\.json/);
  assert.ok(result.stdout.length < 3000, `session 注入过长: ${result.stdout.length}`);
});

test('flow inject reads state.json and reports current stage', () => {
  const result = run('.claude/hooks/reqflow_flow_inject.js', [], { cwd: TMP });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /日历周视图/);
  assert.match(result.stdout, /需求推演/);
});

test('guard warns when PRD prerequisites are missing', () => {
  const prdFile = write('PRD/05_缺失前置_需求文档.md', prdText());
  const result = run('.claude/hooks/reqflow_flow_guard.js', [], {
    cwd: TMP,
    tool_input: { file_path: prdFile },
  });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /RTD 流程守护/);
  assert.match(result.stdout, /阶段 1 设计决策|阶段 2 可视化/);
});

test('guard treats empty prerequisite directories as missing', () => {
  const other = path.join(TMP, '个人', '李四-1002', '_通用', '空目录功能');
  fs.mkdirSync(path.join(other, 'RequirementAnalysis'), { recursive: true });
  fs.mkdirSync(path.join(other, 'DesignDecisions'), { recursive: true });
  const prdFile = path.join(other, 'PRD', '01_空目录功能_需求文档.md');
  fs.mkdirSync(path.dirname(prdFile), { recursive: true });
  fs.writeFileSync(prdFile, prdText(), 'utf8');

  const result = run('.claude/hooks/reqflow_flow_guard.js', [], {
    cwd: TMP,
    tool_input: { file_path: prdFile },
  });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /需求论证缺失或为空/);
  assert.match(result.stdout, /设计决策缺失或为空/);
});

test('ui review reminder re-arms after HTML changes only', () => {
  const html = write('VisualMockups/01_日历周视图_可视化方案.html', '<html><body>v1</body></html>' + 'x'.repeat(300));
  let result = run('.claude/hooks/reqflow_ui_review_remind.js', [], {
    cwd: TMP,
    tool_input: { file_path: html },
  });
  assert.match(result.stdout, /ui-spec-review/);

  result = run('.claude/hooks/reqflow_ui_review_remind.js', [], {
    cwd: TMP,
    tool_input: { file_path: html },
  });
  assert.strictEqual(result.stdout.trim(), '');

  fs.writeFileSync(html, '<html><body>v2 changed</body></html>' + 'y'.repeat(300), 'utf8');
  result = run('.claude/hooks/reqflow_ui_review_remind.js', [], {
    cwd: TMP,
    tool_input: { file_path: html },
  });
  assert.match(result.stdout, /ui-spec-review/);
});

test('post check reports PRD issues without blocking', () => {
  const shortFile = write('PRD/06_短_需求文档.md', '## 📊 0. 需求与产品概述\n太短');
  const result = run('.claude/hooks/reqflow_post_check.js', [], {
    cwd: TMP,
    tool_input: { file_path: shortFile },
  });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /RTD 产物自检/);
  assert.match(result.stdout, /字数偏少|缺少章节/);
  fs.rmSync(shortFile, { force: true });
});

test('final gate requires finalized state and marker', () => {
  write('ReviewLogs/01_日历周视图_需求评审记录.md', '## 评审结论\n五位评审专家均通过，无待处理问题项。');
  let result = run('.claude/scripts/reqflow-check.js', ['--root', featureRel, '--final', '--strict']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /流程未定稿|缺少定稿标记/);

  result = run('.claude/scripts/reqflow-state.js', ['finalize', '--root', featureRel]);
  assert.strictEqual(result.status, 0, result.stderr);

  result = run('.claude/scripts/reqflow-check.js', ['--root', featureRel, '--final', '--strict']);
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /定稿标记存在/);
});

