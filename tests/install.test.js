'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rtd-install-'));

function run(target, extra = []) {
  return spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'install.js'), '--target', target, ...extra],
    {cwd: root, encoding: 'utf8'}
  );
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, content, 'utf8');
}

function makeTarget(name) {
  const target = path.join(TMP, name);
  fs.mkdirSync(target, {recursive: true});
  return target;
}

test.after(() => {
  fs.rmSync(TMP, {recursive: true, force: true});
});

test('installer copies assets, merges CLAUDE.md and settings idempotently', () => {
  const target = makeTarget('project-a');
  write(path.join(target, '.claude', 'CLAUDE.md'), '# 项目原有约束\n\n不要删我。\n');
  write(
    path.join(target, '.claude', 'settings.json'),
    JSON.stringify(
      {
        permissions: {allow: ['Bash(npm test)']},
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {type: 'command', command: 'echo custom'},
                {type: 'command', command: 'node .claude/hooks/reqflow_flow_guard.js'},
              ],
            },
          ],
        },
      },
      null,
      2
    )
  );

  let result = run(target);
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);

  assert.ok(fs.existsSync(path.join(target, '.claude', 'skills', 'requirement-pipeline', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(target, '.claude', 'agents', 'prd-writer.md')));
  assert.ok(fs.existsSync(path.join(target, '.claude', 'scripts', 'reqflow-state.js')));
  assert.ok(fs.existsSync(path.join(target, '.claude', 'reqflow', 'config.json')));
  assert.ok(fs.existsSync(path.join(target, '.claude', '接入指南.md')));
  assert.ok(fs.existsSync(path.join(target, 'team', 'project-context', 'README.md')));

  const claude = read(path.join(target, '.claude', 'CLAUDE.md'));
  assert.match(claude, /不要删我/);
  assert.match(claude, /<!-- RTD:START -->/);
  assert.match(claude, /<!-- RTD:END -->/);
  assert.strictEqual((claude.match(/<!-- RTD:START -->/g) || []).length, 1);

  const settings = JSON.parse(read(path.join(target, '.claude', 'settings.json')));
  assert.deepStrictEqual(settings.permissions, {allow: ['Bash(npm test)']});
  assert.match(settings.hooks.PreToolUse[0].hooks[0].command, /echo custom/);
  const allCommands = Object.values(settings.hooks)
    .flat()
    .flatMap((entry) => entry.hooks)
    .map((h) => h.command);
  assert.strictEqual(allCommands.filter((c) => c.includes('reqflow_session_init.js')).length, 1);
  assert.strictEqual(allCommands.filter((c) => c.includes('reqflow_flow_guard.js')).length, 1);
  assert.strictEqual(allCommands.filter((c) => c.includes('reqflow_post_check.js')).length, 1);

  const settingsBackup = fs
    .readdirSync(path.join(target, '.claude'))
    .filter((name) => name.startsWith('settings.json.rtd-backup-'));
  assert.ok(settingsBackup.length >= 1);
  const claudeBackup = fs
    .readdirSync(path.join(target, '.claude'))
    .filter((name) => name.startsWith('CLAUDE.md.rtd-backup-'));
  assert.ok(claudeBackup.length >= 1);

  // Second install must not duplicate the CLAUDE block or RTD hooks.
  result = run(target);
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  const claude2 = read(path.join(target, '.claude', 'CLAUDE.md'));
  assert.strictEqual((claude2.match(/<!-- RTD:START -->/g) || []).length, 1);
  const settings2 = JSON.parse(read(path.join(target, '.claude', 'settings.json')));
  const commands2 = Object.values(settings2.hooks)
    .flat()
    .flatMap((entry) => entry.hooks)
    .map((h) => h.command);
  assert.strictEqual(commands2.filter((c) => c.includes('reqflow_session_init.js')).length, 1);
  assert.strictEqual(commands2.filter((c) => c.includes('reqflow_flow_guard.js')).length, 1);
  assert.strictEqual(commands2.filter((c) => c.includes('echo custom')).length, 1);
});

test('installer dry-run writes nothing', () => {
  const target = makeTarget('project-b');
  const result = run(target, ['--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  assert.ok(!fs.existsSync(path.join(target, '.claude')));
  assert.ok(!fs.existsSync(path.join(target, 'team')));
  assert.match(result.stdout, /dry-run/);
});

test('installer skips invalid settings.json with a clear message', () => {
  const target = makeTarget('project-c');
  write(path.join(target, '.claude', 'settings.json'), '{not json');
  const result = run(target);
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /settings\.json：settings\.json 不是合法 JSON/);
  assert.strictEqual(read(path.join(target, '.claude', 'settings.json')), '{not json');
});

test('installer can skip CLAUDE.md, settings and team', () => {
  const target = makeTarget('project-d');
  const result = run(target, ['--no-claude-md', '--no-settings', '--no-team']);
  assert.strictEqual(result.status, 0, result.stderr + result.stdout);
  assert.ok(fs.existsSync(path.join(target, '.claude', 'skills', 'requirement-pipeline', 'SKILL.md')));
  assert.ok(!fs.existsSync(path.join(target, '.claude', 'CLAUDE.md')));
  assert.ok(!fs.existsSync(path.join(target, '.claude', 'settings.json')));
  assert.ok(!fs.existsSync(path.join(target, 'team')));
});
