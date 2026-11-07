# 需求推演至开发

一套面向产品需求的协作流程，运行在 Claude Code 中：从需求分析、方案推演、可视化确认，到 PRD、评审、复盘，最后衔接到开发交接。

当前版本：v1.0.0

## 流程

```
需求分析 → 推演（设计决策落盘）→ 可视化 → PRD → 评审（5 位专家）→ 复盘 → 开发交接
```

每个阶段都有对应技能与产物要求，前一阶段产出是后一阶段输入。阶段不可跳；语义修改必须回阶段 1，仅错别字/格式可走用户授权的勘误快线。

## 包含内容

| 模块 | 说明 |
|---|---|
| `.claude/skills/` | 8 个技能：流程总控、需求分析、推演、可视化、PRD 生成、评审、复盘、UI 规范审查（选配） |
| `.claude/agents/` | 8 个可派发专家：5 位评审 + 3 位生产/审查 |
| `.claude/hooks/` | 5 个流程守护 hook（Node）：会话注入、阶段提醒、写前检查、产物自检、UI 审查提醒 |
| `.claude/scripts/` | 状态 CLI + 产物校验 CLI |
| `.claude/reqflow/config.json` | 路径 / 阶段 / 评审人数 / 闸门的唯一机器源 |
| `.claude/CLAUDE.md` | 项目级约束模板：入口、阶段、回流、勘误快线、评审分级、产物落盘 |
| `team/` | 团队共享区：规约、项目背景、定稿归档 |

## 目录结构

```
requirement-to-development/
├── .claude/
│   ├── CLAUDE.md
│   ├── usage-guide.md
│   ├── CHANGELOG.md
│   ├── reqflow/config.json
│   ├── scripts/                  # reqflow-state / reqflow-check / reqflow-lib
│   ├── hooks/                    # 5 个 .js + 兼容 .sh
│   ├── agents/                   # 8 个专家
│   ├── project-context/
│   └── skills/                   # 8 个技能
├── team/
│   ├── conventions/
│   ├── finalized-proposals/
│   └── project-context/
├── scripts/                      # install.js / build-plugin.js / sync-check.js
├── tests/
└── package.json
```

## 安装

需要 Claude Code + Node.js ≥ 18。

**一条命令接入现有项目（推荐）**：

```bash
node scripts/install.js --target "E:/work/你的项目"
```

自动复制 skills/agents/hooks/scripts/config、合并 `CLAUDE.md`（标记块，可重复执行）、合并 `settings.json` hooks（保留项目已有 hook）、创建 `team/` 模板。先预览：

```bash
node scripts/install.js --target "E:/work/你的项目" --dry-run
```

**插件方式**：

```bash
npm run build:plugin
```

把 `dist/` 作为本地 marketplace 添加，即可安装。仍需将根 `CLAUDE.md` 合并到目标项目 `.claude/CLAUDE.md`。

**手动复制方式**：见 [`.claude/usage-guide.md`](.claude/usage-guide.md)。

完整配置说明、每项作用、验证、升级、卸载、排障见 [`.claude/接入指南.md`](.claude/接入指南.md)。

## 使用

安装后直接描述需求，流程自动启动：

- 新需求 / 功能构想 / 设计变更 → `requirement-pipeline`
- 模糊问题或痛点 → 先进需求分析阶段
- 评审、复盘、UI 规范审查按阶段衔接

状态与校验：

```bash
node .claude/scripts/reqflow-state.js list
node .claude/scripts/reqflow-check.js --root "个人/..."
```

## 开发

```bash
npm test              # 状态、校验、5 个 hook
npm run sync:check    # 版本/技能数/评审人数/文档一致性
npm run build:plugin  # 生成 dist 插件包
```

## 版本记录

见 [`.claude/CHANGELOG.md`](.claude/CHANGELOG.md)。
