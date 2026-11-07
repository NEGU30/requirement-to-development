# 需求推演至开发 — 使用说明

一套从需求分析到开发交接的协作流程，运行在 Claude Code 中。

当前版本：v1.0.0

## 快速安装

### 方式 A：一条命令接入现有项目（推荐）

```bash
node scripts/install.js --target "E:/work/你的项目"
```

先预览：

```bash
node scripts/install.js --target "E:/work/你的项目" --dry-run
```

安装器自动完成：复制 skills/agents/hooks/scripts/config、合并 `CLAUDE.md`（标记块，可重复执行）、合并 `settings.json` hooks（保留项目已有 hook）、创建 `team/` 模板。

> 每项配置的作用、验证、升级、卸载、排障见 [接入指南](接入指南.md)。

### 方式 B：插件安装

```bash
npm run build:plugin
```

产物在 `dist/`，标准 Claude Code 插件 + 本地 marketplace：

```
dist/
├── .claude-plugin/marketplace.json   # 本地 marketplace 清单
└── requirement-to-development/
    ├── .claude-plugin/plugin.json
    ├── skills/                     # 8 个技能
    ├── agents/                     # 8 个专家
    ├── hooks/hooks.json            # 5 个 hook
    ├── hooks/*.js
    ├── scripts/reqflow-*.js        # 状态 / 校验 CLI
    ├── reqflow/config.json         # 路径、阶段、闸门配置
    ├── templates/                  # team / project-context 模板
    ├── CLAUDE.md
    └── docs/
```

把 `dist/` 作为本地 marketplace 添加，即可安装 `requirement-to-development`。安装后 hooks 自动注册。**仍需把 `CLAUDE.md` 合并到目标项目 `.claude/CLAUDE.md`**，并把 `templates/` 内容放入目标项目。

### 方式 C：手动复制到目标项目

#### 第 1 步：复制 skills

把 `.claude/skills/` 下 **8 个文件夹**整体复制到目标项目 `.claude/skills/`：

```
目标项目/.claude/skills/
├── requirement-pipeline/   ← 总控
├── requirement-analysis/   ← 阶段 0：需求分析
├── brainstorming/          ← 阶段 1：推演（产出设计决策）
├── visual-companion/       ← 阶段 2：可视化
├── prd-generator/          ← 阶段 3：PRD
├── requirement-review/     ← 阶段 4：评审（5 位专家）
├── retrospective/          ← 阶段 5：复盘
└── ui-spec-review/         ← 选配：UI 规范审查
```

同时复制 `.claude/agents/` 下 8 个专家：

```
completeness-logic-reviewer.md   风险/体验/优先级/格式评审 ×4
risk-reviewer.md
ux-reviewer.md
priority-reviewer.md
format-style-reviewer.md
ui-spec-reviewer.md               UI 规范审查（只读）
ui-designer-html.md               线框原型制作（可写）
prd-writer.md                     PRD 输出（可写）
```

五位评审专家在阶段 4 由 `requirement-review` 并行派发（隔离上下文、只读、独立评审）；三个生产/审查专家分别在可视化、PRD 撰写与 UI 规范审查环节派发。派发时机与纪律详见 `.claude/CLAUDE.md`「专家 Agent（派发）」。

#### 第 2 步：合并 CLAUDE.md

`.claude/CLAUDE.md` 是项目级“宪法”，AI 进入项目就遵守——约束力强于 skill 和 hook。把它合并到目标项目：

- 已有 `.claude/CLAUDE.md`：**追加到末尾**（保留原约束）
- 没有：直接复制

内容包括：流程入口、阶段不跳步、评审回流、勘误快线、评审分级、产物落盘、状态文件。

#### 第 3 步：安装 hooks（推荐）

复制：

```bash
cp .claude/hooks/reqflow_*.js      目标项目/.claude/hooks/
cp .claude/scripts/reqflow-*.js    目标项目/.claude/scripts/
cp .claude/reqflow/config.json     目标项目/.claude/reqflow/
```

在目标项目 `.claude/settings.json` 的 `hooks` 字段追加：

```json
{
  "hooks": {
    "SessionStart": [{ "matcher": "", "hooks": [{ "type": "command", "command": "node .claude/hooks/reqflow_session_init.js" }] }],
    "UserPromptSubmit": [{ "matcher": "", "hooks": [{ "type": "command", "command": "node .claude/hooks/reqflow_flow_inject.js" }] }],
    "PreToolUse": [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "node .claude/hooks/reqflow_flow_guard.js" }] }],
    "PostToolUse": [{ "matcher": "Write|Edit", "hooks": [
      { "type": "command", "command": "node .claude/hooks/reqflow_post_check.js" },
      { "type": "command", "command": "node .claude/hooks/reqflow_ui_review_remind.js" }
    ] }]
  }
}
```

> 详细说明、平台兼容、旧 `.sh` 配置迁移见 [`hooks/hooks-guide.md`](hooks/hooks-guide.md)。

安装后效果：

- 每会话注入**精简**流程摘要（约 400 字，不再全量灌入）
- 有活跃流程时，每轮注入当前阶段、轮次、下一步 skill
- 写 PRD 前检查阶段 0/1/2 产物是否真实非空
- 写 PRD 后自动检查字数、章节、FID、占位符
- HTML 每次修改后提醒 UI 规范审查
- 没在做需求时静默，零干扰；已定稿功能不提醒

> hook 是提醒模式，不做硬拦截。需求流程由人主导，文件状态对不上流程真实状态，硬拦会误判。

#### 第 4 步：准备项目背景

把 `project-context/` 内容复制到目标项目 `team/project-context/`，**换成你项目的背景文档**：

```
目标项目/team/project-context/
├── README.md
└── [你项目的背景文档，可单可多]
```

背景可单可多（项目概要 / 模块说明 / 架构图……），AI 会读整个文件夹；文件名随意。

#### 第 5 步：目录与状态

首次启动流程时，`requirement-pipeline` 会确认作者、模块、功能名（路径三要素）+ 流程选择（A/B），然后自动：

- 创建 `team/{project-context,conventions,finalized-proposals}/`
- 写 `个人/{作者}/{模块}/[功能名]/RequirementLogs/state.json`
- 后续各阶段产物落到方案根对应子目录

> 目录是自动建的，内容是人填的：项目背景放 `team/project-context/`，模块清单/协作公约放 `team/conventions/`。

---

## 安装后验证

新开一个 Claude Code 会话，输入一个需求，例如：

> “我想给待办模块加一个看板视图”

如果 AI 开始按照推演流程逐步提问（一次一个问题），说明安装成功。

再验证状态：

```bash
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js list
```

应能看到活跃功能的轮次与阶段。

---

## 如何使用

**不需要手动调用 Skill。** 用自然语言描述需求，AI 会自动启动流程。

流程中你只需在以下时刻确认：

| 阶段 | 你需要做什么 |
|------|-------------|
| 需求分析 | 回答诘问，举证论证需求值得做（或承认是假设） |
| 推演 | 回答问题、选择方案、说明选型理由、确认设计 |
| 可视化 | 用浏览器（推荐 Chrome）打开 HTML 查看，回复通过或修改 |
| PRD 生成 | 审核抽查 3 处高风险内容，回复 [认可] 或 [改] |
| 评审 | 逐条回复“处理”或“接受” |
| 复盘 | 查看复盘报告，回顾踩坑教训 |

### 阶段 1 新增产物：设计决策

`brainstorming` 获批后必须落盘：

```
个人/{作者}/{模块}/[功能名]/DesignDecisions/设计决策_[功能名].md
```

记录候选方案、用户选型理由、AI 推荐理由、为什么不选其他、砍掉的需求、关键假设与风险。PRD §1 必须引用它，评审和复盘也用它追溯“为什么选 A”。

### 可视化阶段

可视化产物是**离线自包含 HTML**，浏览器打开即可交互。内容至少覆盖一项、最多四类：业务流程图、UI 线框图、用户操作流程、页面流转图。

两种来源：

- **AI 生成**（默认）：按设计方案生成
- **用户提供外部 HTML**：直接复制到 `VisualMockups/`，不重新生成

UI 规范审查（选配）：可视化确认通过后，可调用 `ui-spec-review`。需先把项目规范放到 `team/conventions/UI设计规范参考.md`。

精确标注“改哪个元素”：打开 HTML → 右下角 📐 → 开启标注 → 选元素 → 写改动 → 导出清单 → 贴给 AI。

> 标注器内嵌在每个生成的 HTML 里，Edge / Chrome / Firefox 通用。只有标注**外部网页**时才用书签版 `skills/visual-companion/partial-annotation-bookmarklet.html`。

### 状态与校验命令

```bash
# 状态
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js list
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js get --root "个人/..." --field currentStage

# 校验
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-check.js --prd "个人/.../PRD/01_xxx_需求文档.md"
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-check.js --root "个人/..."
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-check.js --root "个人/..." --final --strict
```

插件安装时脚本不在项目内，用：

```bash
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js" ...
```

### 勘误快线

仅错别字、标点、格式、链接、文件名笔误，且不改变语义：

1. 用户明确授权
2. 修改前在流程日志记录“改了什么、为什么属于勘误”
3. 原地修正

涉及需求内容、边界、优先级、交互、假设、风险 → 退出快线，回阶段 1。

### 评审分级

- **L1 全量**（默认）：首轮 / 跨模块 / P0 → 5 位专家全量
- **L2 增量**：回流第 2 轮起 → 5 位专家只审 diff + 受影响章节 + 回归影响
- **L3 轻量**：仅格式/文案/单 FID 局部 → 3 位专家，需用户明确授权

降档必须记入评审日志，AI 不得自行降档。

---

## 文件夹内容

```
requirement-to-development/
├── .claude/
│   ├── CLAUDE.md                    ← 项目级约束模板
│   ├── usage-guide.md               ← 本文件
│   ├── 接入指南.md                   ← 完整配置说明 / 验证 / 升级 / 排障
│   ├── CHANGELOG.md                 ← 公开发布记录
│   ├── CHANGELOG.internal.md        ← 本地内部迭代史（gitignore）
│   ├── reqflow/config.json          ← 路径/阶段/闸门唯一机器源
│   ├── scripts/
│   │   ├── reqflow-lib.js
│   │   ├── reqflow-state.js         ← 状态 CLI
│   │   └── reqflow-check.js         ← 产物校验 CLI
│   ├── hooks/
│   │   ├── hooks-guide.md
│   │   ├── reqflow_session_init.js
│   │   ├── reqflow_flow_inject.js
│   │   ├── reqflow_flow_guard.js
│   │   ├── reqflow_post_check.js
│   │   ├── reqflow_ui_review_remind.js
│   │   └── reqflow_*.sh             ← 旧配置兼容包装
│   ├── skills/                      ← 8 个技能
│   ├── agents/                      ← 8 个专家
│   └── project-context/README.md
├── team/                            ← 团队共享区模板
├── scripts/build-plugin.js          ← 插件构建
├── scripts/install.js               ← 一键接入目标项目
├── scripts/sync-check.js            ← 文档/版本一致性检查
├── tests/reqflow.test.js
├── tests/install.test.js
├── package.json
└── dist/                            ← 构建产物（gitignore）
```

## 开发与验证

```bash
npm test              # Node 测试：状态、校验、5 个 hook
npm run sync:check    # 版本/技能数/评审人数/文档一致性
npm run build:plugin  # 生成 dist 插件包
```

> `docs/模板示例/` 不在本仓库中；如需参考样本，从历史版本恢复或按对应 skill 模板生成。
