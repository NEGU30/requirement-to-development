#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const checks = [];

function read(relative) {
  try {
    return fs.readFileSync(path.join(root, relative), 'utf8');
  } catch {
    errors.push(`缺少文件：${relative}`);
    return '';
  }
}

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) errors.push(`${name}${detail ? `：${detail}` : ''}`);
}

const pkg = JSON.parse(read('package.json') || '{}');
const version = pkg.version;
const readme = read('README.md');
const usage = read('.claude/usage-guide.md');
const hooksGuide = read('.claude/hooks/hooks-guide.md');
const session = read('.claude/hooks/reqflow_session_init.js');
const claude = read('.claude/CLAUDE.md');
const pipeline = read('.claude/skills/requirement-pipeline/SKILL.md');
const brainstorming = read('.claude/skills/brainstorming/SKILL.md');
const prd = read('.claude/skills/prd-generator/SKILL.md');
const changelog = read('.claude/CHANGELOG.md');
const config = JSON.parse(read('.claude/reqflow/config.json') || '{}');

check('版本号一致', Boolean(version) && readme.includes(`v${version}`), `package=${version} README 未出现 v${version}`);
check('CHANGELOG 版本一致', changelog.includes(`[${version}]`), `CHANGELOG 未出现 [${version}]`);

const skillDirs = fs
  .readdirSync(path.join(root, '.claude', 'skills'), { withFileTypes: true })
  .filter((d) => d.isDirectory());
check('技能数量 = 8', skillDirs.length === 8, `实际 ${skillDirs.length}`);
for (const dir of skillDirs) {
  check(`${dir.name} 有 SKILL.md`, fs.existsSync(path.join(root, '.claude', 'skills', dir.name, 'SKILL.md')));
}

const agents = fs
  .readdirSync(path.join(root, '.claude', 'agents'))
  .filter((name) => name.endsWith('.md'));
check('专家数量 = 8', agents.length === 8, `实际 ${agents.length}`);
check('usage-guide 写明 8 个技能', usage.includes('8 个技能') || usage.includes('8 个文件夹'), '未同步');
check('README 写明 8 个专家', readme.includes('8 个可派发专家'), '未同步');

const hookFiles = [
  'reqflow_session_init.js',
  'reqflow_flow_inject.js',
  'reqflow_flow_guard.js',
  'reqflow_post_check.js',
  'reqflow_ui_review_remind.js',
];
for (const file of hookFiles) {
  check(`hook 存在：${file}`, fs.existsSync(path.join(root, '.claude', 'hooks', file)));
  check(`hooks-guide 提到 ${file}`, hooksGuide.includes(file));
}

check('session 注入 5 位评审', session.includes('5 位专家'), '仍写旧评审人数');
check('CLAUDE.md 记载 DesignDecisions', claude.includes('DesignDecisions'));
check('pipeline 记载 DesignDecisions', pipeline.includes('DesignDecisions'));
check('brainstorming 要求设计决策落盘', brainstorming.includes('设计决策落盘'));
check('prd-generator 读取设计决策', prd.includes('设计决策'));
check('CLAUDE.md 记载勘误快线', claude.includes('勘误快线'));
check('CLAUDE.md 记载评审分级', claude.includes('评审强度分级'));

const guide = read('.claude/接入指南.md');
check('存在接入指南', guide.length > 1000);
check('接入指南说明 install.js', guide.includes('install.js'));
check('接入指南说明 config.json', guide.includes('config.json'));
check('README 提供一条命令安装', readme.includes('scripts/install.js'));
check('usage-guide 提供一条命令安装', usage.includes('scripts/install.js'));
check('install 脚本存在', fs.existsSync(path.join(root, 'scripts', 'install.js')));
check('package.json 有 install:project', Boolean(pkg.scripts && pkg.scripts['install:project']));

const dirs = (config.paths && config.paths.artifacts) || {};
for (const key of ['analysis', 'design', 'visual', 'prd', 'review', 'logs', 'retro']) {
  check(`config 产物目录：${key}`, Boolean(dirs[key]));
  check(`CLAUDE.md 提到 ${dirs[key]}`, !dirs[key] || claude.includes(dirs[key]));
}

const stale = ['三个评审员', '三位评审', '7 个文件夹', 'rf_*.sh'];
for (const needle of stale) {
  const hits = [];
  for (const file of ['README.md', '.claude/usage-guide.md', '.claude/hooks/hooks-guide.md', '.claude/hooks/reqflow_session_init.js']) {
    if (read(file).includes(needle)) hits.push(file);
  }
  check(`无过期表述：${needle}`, hits.length === 0, hits.join(', '));
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(checks, null, 2));
} else {
  for (const item of checks) {
    console.log(`${item.ok ? '✅' : '❌'} ${item.name}${item.detail && !item.ok ? `（${item.detail}）` : ''}`);
  }
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} 通过`);
}

if (errors.length) process.exitCode = 1;
