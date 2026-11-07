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
    if (['strict', 'json', 'final', 'help'].includes(key)) {
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
  node .claude/scripts/reqflow-check.js --prd <PRD file>
  node .claude/scripts/reqflow-check.js --analysis <需求论证 file>
  node .claude/scripts/reqflow-check.js --design <设计决策 file>
  node .claude/scripts/reqflow-check.js --root <featureRoot> [--final]
  Options: --strict (exit 1 on error)  --json

Run from the project root, or set CLAUDE_PROJECT_DIR.`);
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    return null;
  }
}

function headings(text) {
  return [...String(text || '').matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1].trim());
}

function sectionBody(text, headingPattern) {
  const lines = String(text || '').split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^#{2,3}\s+/.test(lines[i]) && headingPattern.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) return '';
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^#{1,3}\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n').trim();
}

function checkPrd(file, config) {
  const findings = [];
  const text = read(file);
  if (text === null) return [{ level: 'error', message: `PRD 不存在或不可读：${file}` }];

  const body = lib.stripFrontmatter(text);
  const charCount = lib.countChars(body);
  const min = config.prd.minChars;
  const max = config.prd.maxChars;
  if (charCount < min) {
    findings.push({ level: 'warn', message: `PRD 字数偏少：${charCount} 字（合格线 ${min}–${max}）` });
  } else if (charCount > max) {
    findings.push({ level: 'warn', message: `PRD 字数偏多：${charCount} 字（合格线 ${min}–${max}）` });
  } else {
    findings.push({ level: 'pass', message: `字数 ${charCount}（合格线 ${min}–${max}）` });
  }

  const h = headings(body);
  for (const name of config.prd.requiredSections || []) {
    const hit = h.some((line) => line.includes(name));
    findings.push({
      level: hit ? 'pass' : 'error',
      message: hit ? `章节存在：${name}` : `缺少章节：${name}`,
    });
  }

  const fidMatches = [...body.matchAll(/\[FID:\s*([^\]_\s]+)_(\d+)\]/g)];
  const byPrefix = new Map();
  for (const match of fidMatches) {
    const [, prefix, number] = match;
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, new Set());
    byPrefix.get(prefix).add(Number(number));
  }
  if (!fidMatches.length) {
    findings.push({ level: 'error', message: '未找到任何 [FID: 前缀_001] 功能标识' });
  } else {
    for (const [prefix, numbers] of byPrefix) {
      if (prefix.toLowerCase() === 'xxx') {
        findings.push({ level: 'error', message: `FID 模板占位未替换：Xxx_${String(Math.min(...numbers)).padStart(3, '0')}` });
        continue;
      }
      const sorted = [...numbers].sort((a, b) => a - b);
      const contiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
      if (sorted[0] !== 1 || !contiguous) {
        findings.push({
          level: 'warn',
          message: `FID 编号不连续：${prefix} 实际为 ${sorted.map((n) => String(n).padStart(3, '0')).join(', ')}`,
        });
      }
    }
    findings.push({ level: 'pass', message: `FID 共 ${fidMatches.length} 处、${byPrefix.size} 组` });
  }

  if (!/[•\s]P[012](?:🔴|🟡|🟢)?/.test(body) && !/P[012]/.test(body)) {
    findings.push({ level: 'warn', message: '未找到 P0/P1/P2 优先级标注' });
  }

  const placeholders = [
    ['待补充', /\[待补充\]/g],
    ['待填写', /\[待填写\]/g],
    ['TODO', /\bTODO\b/gi],
    ['模板占位 xxx', /\[xxx\]/gi],
  ];
  for (const [label, re] of placeholders) {
    const count = (body.match(re) || []).length;
    if (count) findings.push({ level: 'warn', message: `残留${label} ${count} 处` });
  }

  return findings;
}

function checkAnalysis(file) {
  const text = read(file);
  if (text === null) return [{ level: 'error', message: `需求论证不存在或不可读：${file}` }];
  const findings = [{ level: 'pass', message: '需求论证文件存在' }];
  const required = [
    [/^#{2,3}\s+1\.\s*问题背景与反馈原文/, '§1 问题背景与反馈原文'],
    [/^#{2,3}\s+2\.\s*根源动机/, '§2 根源动机'],
    [/^#{2,3}\s+4\.\s*痛点画像/, '§4 痛点画像'],
    [/^#{2,3}\s+8\.\s*放行结论/, '§8 放行结论'],
  ];
  for (const [re, label] of required) {
    const present = /^#{2,3}\s+/.test(text.split(/\r?\n/).find((line) => re.test(line)) || '');
    findings.push({
      level: present ? 'pass' : 'error',
      message: present ? `章节存在：${label}` : `缺少章节：${label}`,
    });
  }
  if (/强制通过/.test(text) && !/未解决|质疑/.test(text)) {
    findings.push({ level: 'warn', message: '标注了“强制通过”，但未见未解决质疑点清单' });
  }
  if (/A·资深自述/.test(text)) {
    findings.push({ level: 'pass', message: '已标注 A·资深自述（评审需重点核查痛点真实性）' });
  }
  return findings;
}

function checkDesign(file) {
  const text = read(file);
  if (text === null) return [{ level: 'error', message: `设计决策文件不存在或不可读：${file}` }];
  const findings = [{ level: 'pass', message: '设计决策文件存在' }];
  const required = [
    [/候选方案/, '候选方案'],
    [/选型结论|选择理由/, '选型结论'],
    [/假设/, '关键假设'],
    [/风险/, '风险'],
  ];
  for (const [re, label] of required) {
    const hit = re.test(text);
    findings.push({
      level: hit ? 'pass' : 'error',
      message: hit ? `包含：${label}` : `缺少：${label}`,
    });
  }
  if (lib.countChars(text) < 80) {
    findings.push({ level: 'warn', message: '设计决策内容过短，可能未记录取舍理由' });
  }
  return findings;
}

function latestIn(dir, extensions) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && extensions.some((ext) => d.name.toLowerCase().endsWith(ext)))
      .map((d) => {
        const file = path.join(dir, d.name);
        return { file, mtimeMs: fs.statSync(file).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.file || null;
  } catch {
    return null;
  }
}

function checkRoot(root, config, final) {
  const findings = [];
  const dirs = config.paths.artifacts;

  const analysisDir = path.join(root, dirs.analysis);
  if (!lib.hasRealFiles(analysisDir, { extensions: ['.md'] })) {
    findings.push({ level: 'error', message: `阶段 0 产物缺失或为空：${dirs.analysis}/` });
  } else {
    findings.push({ level: 'pass', message: `阶段 0 产物存在：${dirs.analysis}/` });
    const file = latestIn(analysisDir, ['.md']);
    if (file) findings.push(...checkAnalysis(file));
  }

  const designDir = path.join(root, dirs.design);
  if (!lib.hasRealFiles(designDir, { extensions: ['.md'] })) {
    findings.push({ level: 'error', message: `阶段 1 设计决策缺失或为空：${dirs.design}/` });
  } else {
    findings.push({ level: 'pass', message: `阶段 1 设计决策存在：${dirs.design}/` });
    findings.push(...checkDesign(latestIn(designDir, ['.md'])));
  }

  const visualDir = path.join(root, dirs.visual);
  if (!lib.hasRealFiles(visualDir, { extensions: ['.html'], minBytes: 200 })) {
    findings.push({ level: final ? 'error' : 'warn', message: `阶段 2 可视化缺失或为空：${dirs.visual}/` });
  } else {
    findings.push({ level: 'pass', message: `阶段 2 可视化存在：${dirs.visual}/` });
  }

  const prdDir = path.join(root, dirs.prd);
  if (!lib.hasRealFiles(prdDir, { extensions: ['.md'] })) {
    findings.push({ level: final ? 'error' : 'warn', message: `阶段 3 PRD 缺失或为空：${dirs.prd}/` });
  } else {
    findings.push({ level: 'pass', message: `阶段 3 PRD 存在：${dirs.prd}/` });
    findings.push(...checkPrd(latestIn(prdDir, ['.md']), config));
  }

  if (final) {
    const reviewDir = path.join(root, dirs.review);
    if (!lib.hasRealFiles(reviewDir, { extensions: ['.md'] })) {
      findings.push({ level: 'error', message: `阶段 4 评审记录缺失或为空：${dirs.review}/` });
    } else {
      findings.push({ level: 'pass', message: `阶段 4 评审记录存在：${dirs.review}/` });
    }
    const state = lib.readState(root);
    if (!state) {
      findings.push({ level: 'error', message: '缺少 RequirementLogs/state.json 流程状态' });
    } else {
      findings.push({ level: 'pass', message: `流程状态：第 ${state.round} 轮 · ${state.currentStage}` });
      if (state.currentStage !== 'finalized') {
        findings.push({
          level: 'error',
          message: `流程未定稿：state.currentStage=${state.currentStage}，应为 finalized`,
        });
      }
      if (state.status !== 'finalized') {
        findings.push({
          level: 'error',
          message: `流程状态未定稿：state.status=${state.status || '缺省'}，应为 finalized`,
        });
      }
    }
    if (!lib.isFinalized(root)) {
      findings.push({ level: 'error', message: '缺少定稿标记 RequirementLogs/.finalized' });
    } else {
      findings.push({ level: 'pass', message: '定稿标记存在：RequirementLogs/.finalized' });
    }
  }

  return findings;
}

function report(findings, opts) {
  if (opts.json) {
    console.log(JSON.stringify(findings, null, 2));
  } else {
    for (const finding of findings) {
      const mark = finding.level === 'pass' ? '✅' : finding.level === 'warn' ? '⚠️' : '❌';
      console.log(`${mark} ${finding.message}`);
    }
  }
  const errors = findings.filter((f) => f.level === 'error').length;
  if (opts.strict && errors) process.exitCode = 1;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }
  const root = lib.projectRoot();
  const config = lib.loadConfig(root);
  let findings = [];

  if (opts.prd && opts.prd !== true) findings = checkPrd(path.resolve(root, String(opts.prd)), config);
  else if (opts.analysis && opts.analysis !== true) findings = checkAnalysis(path.resolve(root, String(opts.analysis)));
  else if (opts.design && opts.design !== true) findings = checkDesign(path.resolve(root, String(opts.design)));
  else if (opts.root && opts.root !== true) {
    findings = checkRoot(path.resolve(root, String(opts.root)), config, Boolean(opts.final));
  } else {
    usage();
    process.exitCode = 1;
    return;
  }
  report(findings, opts);
}

if (require.main === module) {
  main();
}

module.exports = { checkAnalysis, checkDesign, checkPrd, checkRoot };
