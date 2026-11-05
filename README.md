# 需求推演至开发

一套面向产品需求的协作流程，运行在 Claude Code 中：从需求分析、方案推演、可视化确认，到 PRD、评审、复盘，最后衔接到开发交接。

当前版本：v0.0.1

## 流程

```
需求分析 → 推演 → 可视化 → PRD → 评审 → 复盘 → 开发交接
```

每个阶段都有对应的技能与产物要求，前一阶段的产出是后一阶段的输入。

## 包含内容

| 模块 | 说明 |
|---|---|
| `.claude/skills/` | 8 个技能：流程总控、需求分析、推演、可视化、PRD 生成、评审、复盘、UI 规范审查（选配） |
| `.claude/agents/` | 8 个可派发专家：5 位评审专家 + 3 位生产/审查专家 |
| `.claude/hooks/` | 4 个流程守护脚本：会话注入、阶段提醒、写前检查、UI 审查提醒 |
| `.claude/CLAUDE.md` | 项目级约束模板：流程入口、阶段顺序、产物落盘规则 |
| `team/` | 团队共享区：规约、项目背景、定稿归档 |

## 目录结构

```
requirement-to-development/
├── .claude/
│   ├── CLAUDE.md                 # 项目级约束模板
│   ├── usage-guide.md            # 安装与使用说明
│   ├── CHANGELOG.md              # 版本记录
│   ├── agents/                   # 8 个专家定义
│   ├── hooks/                    # 流程守护 hooks
│   ├── project-context/          # 项目背景说明与放置位置
│   └── skills/                   # 8 个技能
└── team/
    ├── conventions/              # 协作规约、模块清单
    ├── finalized-proposals/      # 评审通过后的定稿归档
    └── project-context/          # 项目背景（共享只读）
```

## 安装

需要 Claude Code。

1. 将 `.claude/skills/` 下的技能目录复制到目标项目的 `.claude/skills/`
2. 将 `.claude/agents/` 复制到目标项目的 `.claude/agents/`
3. 将 `.claude/CLAUDE.md` 的内容追加到目标项目的 `.claude/CLAUDE.md`
4. 按 `.claude/hooks/hooks-guide.md` 安装 hooks（推荐）
5. 在目标项目创建 `team/` 下的三个目录，并放入项目背景与协作规约

完整步骤、hooks 配置与平台说明见 [`.claude/usage-guide.md`](.claude/usage-guide.md)。

## 使用

安装后，在 Claude Code 中直接描述需求，流程会自动启动：

- 新需求 / 功能构想 / 设计变更 → `requirement-pipeline`
- 模糊问题或痛点 → 先走需求分析阶段
- 评审、复盘、UI 规范审查按阶段自动衔接

各阶段的详细规则见 `.claude/skills/` 下对应技能。

## 版本记录

见 [`.claude/CHANGELOG.md`](.claude/CHANGELOG.md)。
