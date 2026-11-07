#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '..');
const CLAUDE_START = '<!-- RTD:START -->';
const CLAUDE_END = '<!-- RTD:END -->';

function usage() {
  console.log(`RTD 项目接入安装器

用法：
  node scripts/install.js --target <目标项目路径> [选项]

选项：
  --dry-run          只显示将做什么，不写文件
  --no-claude-md     不合并 .claude/CLAUDE.md
  --no-settings      不修改 .claude/settings.json
  --no-team          不创建 team/ 模板
  --force-team       覆盖 team/ 下已有文件（默认只补缺失文件）
  --help             显示帮助

示例：
  node scripts/install.js --target ../my-project
  node scripts/install.js --target "E:/work/我的项目" --dry-run
`);
}

function parseArgs(argv) {
  const opts = {_: []};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      opts._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (['dry-run', 'help', 'no-claude-md', 'no-settings', 'no-team', 'force-team'].includes(key)) {
      opts[key] = true;
    } else {
      opts[key] = argv[i + 1];
      i += 1;
    }
  }
  return opts;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function exists(file) {
  try {
    fs.accessSync(file);
    return true;
  } catch {
    return false;
  }
}

function backup(file, dryRun) {
  if (!exists(file)) return null;
  const target = `${file}.rtd-backup-${timestamp()}`;
  if (!dryRun) fs.copyFileSync(file, target);
  return target;
}

function copyTree(from, to, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const overwrite = options.overwrite !== false;
  if (!exists(from)) return [];

  const copied = [];
  const entries = fs.readdirSync(from, {withFileTypes: true});
  if (!dryRun) fs.mkdirSync(to, {recursive: true});

  for (const entry of entries) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copied.push(...copyTree(src, dst, options));
      continue;
    }
    if (!overwrite && exists(dst)) continue;
    copied.push(dst);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(dst), {recursive: true});
      fs.copyFileSync(src, dst);
    }
  }
  return copied;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, content.replace(/\r\n/g, '\n'), 'utf8');
}

function mergeClaude(target, dryRun) {
  const sourceFile = path.join(SOURCE, '.claude', 'CLAUDE.md');
  const targetFile = path.join(target, '.claude', 'CLAUDE.md');
  if (!exists(sourceFile)) return {skipped: true};
  const block = `${CLAUDE_START}\n${read(sourceFile).trim()}\n${CLAUDE_END}`;

  if (!exists(targetFile)) {
    write(targetFile, `${block}\n`, dryRun);
    return {action: 'created', file: targetFile};
  }

  const current = read(targetFile);
  const start = current.indexOf(CLAUDE_START);
  const end = current.indexOf(CLAUDE_END);
  if (start !== -1 && end !== -1 && end > start) {
    const before = current.slice(0, start);
    const after = current.slice(end + CLAUDE_END.length);
    const next = `${before}${block}${after}`;
    if (next === current) return {action: 'unchanged', file: targetFile};
    const bak = backup(targetFile, dryRun);
    write(targetFile, next, dryRun);
    return {action: 'updated', file: targetFile, backup: bak};
  }

  const bak = backup(targetFile, dryRun);
  const prefix = current.endsWith('\n') ? current : `${current}\n`;
  write(targetFile, `${prefix}\n${block}\n`, dryRun);
  return {action: 'appended', file: targetFile, backup: bak};
}

const RTD_HOOKS = {
  SessionStart: [
    {
      matcher: '',
      hooks: [{type: 'command', command: 'node .claude/hooks/reqflow_session_init.js'}],
    },
  ],
  UserPromptSubmit: [
    {
      matcher: '',
      hooks: [{type: 'command', command: 'node .claude/hooks/reqflow_flow_inject.js'}],
    },
  ],
  PreToolUse: [
    {
      matcher: 'Write|Edit',
      hooks: [{type: 'command', command: 'node .claude/hooks/reqflow_flow_guard.js'}],
    },
  ],
  PostToolUse: [
    {
      matcher: 'Write|Edit',
      hooks: [
        {type: 'command', command: 'node .claude/hooks/reqflow_post_check.js'},
        {type: 'command', command: 'node .claude/hooks/reqflow_ui_review_remind.js'},
      ],
    },
  ],
};

function stripRtdHooks(entries) {
  return entries
    .map((entry) => {
      if (!entry || !Array.isArray(entry.hooks)) return entry;
      const hooks = entry.hooks.filter((h) => !String(h.command || '').includes('reqflow_'));
      if (!hooks.length) return null;
      return {...entry, hooks};
    })
    .filter(Boolean);
}

function mergeSettings(target, dryRun) {
  const file = path.join(target, '.claude', 'settings.json');
  let settings = {};
  if (exists(file)) {
    try {
      settings = JSON.parse(read(file));
    } catch (error) {
      return {error: `settings.json 不是合法 JSON，已跳过：${error.message}`};
    }
  }

  settings.hooks = settings.hooks || {};
  for (const [event, entries] of Object.entries(RTD_HOOKS)) {
    const existing = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [];
    const cleaned = stripRtdHooks(existing);
    settings.hooks[event] = [...cleaned, ...entries.map((entry) => JSON.parse(JSON.stringify(entry)))];
  }

  const next = `${JSON.stringify(settings, null, 2)}\n`;
  const prev = exists(file) ? read(file) : null;
  if (prev === next) return {action: 'unchanged', file};
  const bak = backup(file, dryRun);
  write(file, next, dryRun);
  return {action: prev === null ? 'created' : 'updated', file, backup: bak};
}

function ensureTeam(target, dryRun, forceTeam) {
  const created = [];
  const dirs = ['project-context', 'conventions', 'finalized-proposals'];
  for (const dir of dirs) {
    const dst = path.join(target, 'team', dir);
    if (!exists(dst)) {
      if (!dryRun) fs.mkdirSync(dst, {recursive: true});
      created.push(dst);
    }
  }

  const sourceTeam = path.join(SOURCE, 'team');
  if (exists(sourceTeam)) {
    created.push(...copyTree(sourceTeam, path.join(target, 'team'), {dryRun, overwrite: forceTeam}));
  }
  const sourceContext = path.join(SOURCE, '.claude', 'project-context');
  if (exists(sourceContext)) {
    created.push(...copyTree(sourceContext, path.join(target, 'team', 'project-context'), {dryRun, overwrite: forceTeam}));
  }
  return created;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }
  if (!opts.target || opts.target === true) {
    usage();
    process.exitCode = 1;
    return;
  }

  const target = path.resolve(String(opts.target));
  const dryRun = Boolean(opts['dry-run']);
  if (target === SOURCE) {
    console.error('目标项目不能是 RTD 源仓库本身。');
    process.exitCode = 1;
    return;
  }
  if (!exists(target)) {
    console.error(`目标项目不存在：${target}`);
    process.exitCode = 1;
    return;
  }

  console.log(`源：${SOURCE}`);
  console.log(`目标：${target}${dryRun ? '（dry-run，不写文件）' : ''}`);
  console.log('');

  const skills = copyTree(path.join(SOURCE, '.claude', 'skills'), path.join(target, '.claude', 'skills'), {dryRun});
  const agents = copyTree(path.join(SOURCE, '.claude', 'agents'), path.join(target, '.claude', 'agents'), {dryRun});
  const hooks = copyTree(path.join(SOURCE, '.claude', 'hooks'), path.join(target, '.claude', 'hooks'), {
    dryRun,
    overwrite: true,
  });
  const scripts = copyTree(path.join(SOURCE, '.claude', 'scripts'), path.join(target, '.claude', 'scripts'), {
    dryRun,
    overwrite: true,
  });
  const reqflow = copyTree(path.join(SOURCE, '.claude', 'reqflow'), path.join(target, '.claude', 'reqflow'), {
    dryRun,
    overwrite: true,
  });

  let guideCopied = false;
  for (const doc of ['接入指南.md', 'usage-guide.md']) {
    const guideSource = path.join(SOURCE, '.claude', doc);
    if (!exists(guideSource)) continue;
    const guideTarget = path.join(target, '.claude', doc);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(guideTarget), {recursive: true});
      fs.copyFileSync(guideSource, guideTarget);
    }
    guideCopied = true;
  }

  // 只复制 .js hook；.sh 为旧配置兼容，不强制写入新项目
  const hookFiles = hooks.filter((file) => file.endsWith('.js'));

  const skillSource = path.join(SOURCE, '.claude', 'skills');
  const skillCount = exists(skillSource)
    ? fs.readdirSync(skillSource, {withFileTypes: true}).filter((d) => d.isDirectory()).length
    : 0;
  console.log(`技能：${skillCount} 个目录（${skills.length} 个文件）`);
  console.log(`专家：${agents.length} 个文件`);
  console.log(`hooks：${hookFiles.length} 个 .js`);
  console.log(`脚本：${scripts.length} 个`);
  console.log(`配置：${reqflow.length} 个`);
  if (guideCopied) console.log('文档：.claude/接入指南.md、.claude/usage-guide.md');

  if (!opts['no-claude-md']) {
    const result = mergeClaude(target, dryRun);
    if (result.error) console.log(`CLAUDE.md：${result.error}`);
    else console.log(`CLAUDE.md：${result.action}${result.backup ? `（备份 ${path.basename(result.backup)}）` : ''}`);
  }

  if (!opts['no-settings']) {
    const result = mergeSettings(target, dryRun);
    if (result.error) console.log(`settings.json：${result.error}`);
    else console.log(`settings.json：${result.action}${result.backup ? `（备份 ${path.basename(result.backup)}）` : ''}`);
  }

  if (!opts['no-team']) {
    const team = ensureTeam(target, dryRun, Boolean(opts['force-team']));
    console.log(`team/：${team.length} 个文件/目录${opts['force-team'] ? '（覆盖模式）' : '（仅补缺失）'}`);
  }

  console.log('');
  console.log('下一步：');
  console.log('1. 往 team/project-context/ 放项目背景文档（产品定位、模块、用户场景）。');
  console.log('2. 往 team/conventions/模块清单.md 填七大模块；没有就先放空模板。');
  console.log('3. 可选：放 team/conventions/UI设计规范参考.md，启用 ui-spec-review。');
  console.log('4. 打开 Claude Code，说一个需求，流程会自动启动。');
  console.log('');
  console.log('验证：node .claude/scripts/reqflow-state.js list');
  if (dryRun) console.log('\n这是 dry-run。去掉 --dry-run 才会真正写入。');
}

main();
