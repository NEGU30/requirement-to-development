#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distRoot = path.join(root, 'dist');
const out = path.join(distRoot, 'requirement-to-development');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function rm(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.replace(/\r\n/g, '\n'), 'utf8');
}

rm(out);
fs.mkdirSync(out, { recursive: true });

copy(path.join(root, '.claude', 'skills'), path.join(out, 'skills'));
copy(path.join(root, '.claude', 'agents'), path.join(out, 'agents'));
copy(path.join(root, '.claude', 'scripts'), path.join(out, 'scripts'));
copy(path.join(root, '.claude', 'reqflow'), path.join(out, 'reqflow'));
copy(path.join(root, '.claude', 'project-context'), path.join(out, 'templates', 'project-context'));
copy(path.join(root, 'team'), path.join(out, 'templates', 'team'));

fs.mkdirSync(path.join(out, 'hooks'), { recursive: true });
for (const name of fs.readdirSync(path.join(root, '.claude', 'hooks'))) {
  if (name.endsWith('.js')) {
    copy(path.join(root, '.claude', 'hooks', name), path.join(out, 'hooks', name));
  }
}

copy(path.join(root, '.claude', 'CLAUDE.md'), path.join(out, 'CLAUDE.md'));
copy(path.join(root, '.claude', 'usage-guide.md'), path.join(out, 'docs', 'usage-guide.md'));
copy(path.join(root, '.claude', '接入指南.md'), path.join(out, 'docs', '接入指南.md'));
copy(path.join(root, '.claude', 'hooks', 'hooks-guide.md'), path.join(out, 'docs', 'hooks-guide.md'));

const hooks = {
  hooks: {
    SessionStart: [
      {
        matcher: '',
        hooks: [
          {
            type: 'command',
            command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/reqflow_session_init.js"',
          },
        ],
      },
    ],
    UserPromptSubmit: [
      {
        matcher: '',
        hooks: [
          {
            type: 'command',
            command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/reqflow_flow_inject.js"',
          },
        ],
      },
    ],
    PreToolUse: [
      {
        matcher: 'Write|Edit',
        hooks: [
          {
            type: 'command',
            command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/reqflow_flow_guard.js"',
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: 'Write|Edit',
        hooks: [
          {
            type: 'command',
            command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/reqflow_post_check.js"',
          },
          {
            type: 'command',
            command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/reqflow_ui_review_remind.js"',
          },
        ],
      },
    ],
  },
};

write(path.join(out, 'hooks', 'hooks.json'), JSON.stringify(hooks, null, 2) + '\n');

const plugin = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  author: { name: 'RTD maintainers' },
  license: pkg.license,
  keywords: ['requirement', 'prd', 'product', 'workflow', 'claude-code'],
};

write(path.join(out, '.claude-plugin', 'plugin.json'), JSON.stringify(plugin, null, 2) + '\n');

const marketplace = {
  name: 'rtd-marketplace',
  owner: { name: 'RTD maintainers' },
  plugins: [
    {
      name: pkg.name,
      source: './requirement-to-development',
      description: pkg.description,
      version: pkg.version,
    },
  ],
};
write(
  path.join(distRoot, '.claude-plugin', 'marketplace.json'),
  JSON.stringify(marketplace, null, 2) + '\n'
);
write(
  path.join(out, 'package.json'),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      private: true,
      description: pkg.description,
      engines: pkg.engines,
    },
    null,
    2
  ) + '\n'
);

write(
  path.join(out, 'INSTALL.md'),
  `# 安装

## 1. 作为插件

本目录是标准 Claude Code 插件结构。将整个 \`requirement-to-development/\` 放入插件目录，或加入本地 marketplace 后安装。

\`\`\`
.claude-plugin/plugin.json   # 插件清单
skills/                     # 8 个技能
agents/                     # 8 个专家
hooks/hooks.json            # 5 个 hook
hooks/*.js                  # hook 实现
scripts/reqflow-*.js        # 状态/校验 CLI
reqflow/config.json         # 路径与闸门配置
\`\`\`

插件安装后 hooks 自动注册。**仍需把根目录 \`CLAUDE.md\` 合并到目标项目 \`.claude/CLAUDE.md\`**（项目宪法不能被插件替代）。

## 2. 准备共享区

\`\`\`bash
cp -r templates/team 目标项目/team
cp -r templates/project-context/* 目标项目/team/project-context/
\`\`\`

## 3. 状态 CLI 路径

传统安装：\`.claude/scripts/reqflow-state.js\`。
插件安装：\`\${CLAUDE_PLUGIN_ROOT}/scripts/reqflow-state.js\`。

文档中的命令写作：

\`\`\`bash
node "\${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js" ...
\`\`\`

未设置插件环境变量时自动回退到项目内 \`.claude/scripts/\`。
`
);

console.log(`Plugin built: ${path.relative(root, out)}`);
console.log(`Version: ${pkg.version}`);
