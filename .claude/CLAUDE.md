# 需求推演至开发 — 项目级约束（模板）

> 本文件是需求推演至开发流程的项目级约束模板。安装时需把本文件内容**追加**到目标项目的 `.claude/CLAUDE.md`（若已存在）或作为其内容（若不存在）。
>
> 定位：这是项目"宪法"级硬约束（常驻生效）。流程细节（阶段定义/闸门/日志模板）由 SessionStart hook 每会话注入摘要 + 各 skill 提供，不在本文件重复。

## 强制流程入口

- 任何**新需求 / 功能构想 / 设计变更**，以及**尚在探索、尚未成型的模糊问题或痛点**（如"帮我想想怎么解决""这块能不能优化""有个想法想聊聊"），必须首先调用 `requirement-pipeline` skill 进入需求流程。
- **不允许**直接跳到子 skill、直接写 PRD、或绕过流程出方案。
- 排障类需求（运行时报错）走 `systematic-debugging`（若项目已配置），不在此流程范围内。

## 阶段顺序不可跳

需求必须按顺序经过各阶段，**不允许跳步**：

```
阶段0 需求分析 → 阶段1 推演 → 阶段2 可视化 → 阶段3 PRD → 阶段4 评审 → 阶段5 复盘
```

- AI 不得以"改动小""不影响逻辑""不涉及架构"等理由自行跳过强制步骤。
- 跳步的唯一合法来源是**用户明确授权**。

## 状态记录（每阶段必做）

流程启动时初始化，阶段推进 / 回流 / 定稿时更新：

```bash
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js init --root "个人/{作者}/{模块}/[功能名]" --author "{作者}" --module "{模块}" --feature "[功能名]" --flow A|B
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js set  --root "个人/{作者}/{模块}/[功能名]" --stage 2 --note "可视化通过"
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js reopen --root "个人/{作者}/{模块}/[功能名]" --reason "评审回流"
```

`state.json` 是 hooks 判断当前阶段的唯一机器输入；流程日志是给人看的叙述记录。两者都要维护。

## 评审后修改必须回流

阶段4 评审后的任何**语义修改**，必须**回到阶段1**重新走完整链路，**不允许**在评审环节或直接编辑 PRD 文件。

**勘误快线（唯一例外）**：仅限错别字、标点、格式、链接、文件名笔误，且**不改变任何语义、FID、优先级、取舍**。必须同时满足：

- 用户明确授权（AI 不得自行判定为勘误）
- 修改前在 `RequirementLogs/` 流程日志记录：改了什么、为什么属于勘误
- 若改动涉及需求内容、边界、优先级、交互、假设或风险 → 立即退出快线，回阶段1

## 评审强度分级（防过度评审）

- **L1 全量**（默认）：首轮 PRD、跨模块需求、P0 核心流程 → 5 位评审专家全量并行。
- **L2 增量**：评审回流后的第 2 轮及以后 → 5 位专家仍参与，但只审 `diff + 受影响章节 + 回归影响`，不重读未变章节。评审日志必须列出本轮 diff 范围与已通过基线。
- **L3 轻量**：仅格式/文案/单 FID 局部改动，且用户明确授权 → 可缩为 3 位（完整性与逻辑 / 需求风险 / 格式与文风）。授权与理由写入评审日志。
- 任何降档都**不是跳步**：闸门、用户确认、回流决策不变。AI 不得自行降档。

## 方案目录约定（协作结构 · 本项目适配）

> **机器可读唯一事实源**：`.claude/reqflow/config.json`（workspace 名、产物子目录、阶段、评审人数、PRD 字数闸门）。本节是给人和 AI 阅读的镜像；改路径时必须同步 config、本节、`.claude/hooks/hooks-guide.md` 与 `team/conventions/路径与阶段约定.md`。

本项目的需求产物采用「个人工作区 + 团队共享区」双层协作结构，**不使用默认的 `docs/<产物类型>/[功能]/` 平铺路径**：

- **方案根路径** = `个人/{作者}/{模块}/[功能名]/`
  - `{作者}` = 当前策划人员标识，命名标准为**「中文名-工号」**（如 `张三-1001`），由 `requirement-pipeline` 在流程启动时确认
  - `{模块}` = 七大模块之一（见 `team/conventions/模块清单.md`），**可选**；不归属具体模块时用 `_通用` 兜底。禁止自创模块名
  - `[功能名]` = 本次需求的功能名
- **七类产物**分别落到方案根下对应子目录（RequirementAnalysis / DesignDecisions / VisualMockups / PRD / ReviewLogs / RequirementLogs / Retrospectives）
- **流程状态**统一写到 `RequirementLogs/state.json`，由 hooks 读取；流程日志仍写人类可读的 `[序号]_[功能名]_流程记录.md`
- **项目背景**统一在 `team/project-context/`
- **定稿归档**：评审通过 + **人工审批**后，整个 `[功能名]/` 目录复制到 `team/finalized-proposals/{模块}/[YYYYMMDD_功能名_作者]/`。归档是 **本流程之外的独立动作**，必须经人工审批，不自动触发、不在本流程内执行

> 各 skill 执行时，**以本约定为准**，忽略 SKILL.md 里出现的默认路径示例 `docs/<产物类型>/[功能]/`，一律按上述方案根路径落盘。`requirement-pipeline` 启动时确认 `{作者}` 与 `{模块}`，拼出本次方案根路径后传给所有下游 skill。

## 产物必须落盘

所有阶段产物必须落在方案根下对应子目录，**不允许**只留在对话上下文：

| 产物 | 路径 |
|------|------|
| 需求论证 | `个人/{作者}/{模块}/[功能名]/RequirementAnalysis/` |
| 设计决策（阶段 1） | `个人/{作者}/{模块}/[功能名]/DesignDecisions/设计决策_[功能名].md` |
| 可视化 HTML | `个人/{作者}/{模块}/[功能名]/VisualMockups/` |
| 需求文档 PRD | `个人/{作者}/{模块}/[功能名]/PRD/` |
| 评审记录 | `个人/{作者}/{模块}/[功能名]/ReviewLogs/` |
| 流程日志 + state.json + 定稿标记 | `个人/{作者}/{模块}/[功能名]/RequirementLogs/` |
| 复盘总结 | `个人/{作者}/{模块}/[功能名]/Retrospectives/` |
| 项目背景（共享只读） | `team/project-context/` |

## 流程守护机制

本项目配置了流程守护 hooks（安装步骤见 `hooks/hooks-guide.md`）：

- **SessionStart**：每会话注入精简流程摘要，AI 全会话了解入口与硬规则
- **UserPromptSubmit**：有活跃流程时读取 `RequirementLogs/state.json` 注入当前阶段，防长会话失忆
- **PreToolUse**：写可视化 / PRD 前，检查前置阶段产物是否**真实存在且非空**（提醒模式，不阻断）
- **PostToolUse**：写产物后自动检查字数、章节、FID、占位符；HTML 每次修改后重新提醒 UI 规范审查

hooks 是辅助可见性，**流程纪律的最终保证仍靠本文件 + skill 软约束 + 用户把关**。

## 专家 Agent（派发）

`.claude/agents/` 下定义了 8 个可派发专家（Task 子代理）。主对话按以下时机派发，专家产出交回主对话汇总，**派发不改变阶段顺序与闸门**：

| 专家 | 派发时机 | 读写 |
|------|----------|------|
| `completeness-logic-reviewer` 完整性与逻辑 | 阶段 4 评审：由 `requirement-review` 五路并行派发 | 只读 |
| `risk-reviewer` 需求风险 | 阶段 4 评审：同上 | 只读 |
| `ux-reviewer` 用户体验 | 阶段 4 评审：同上 | 只读 |
| `priority-reviewer` 优先级与分期 | 阶段 4 评审：同上 | 只读 |
| `format-style-reviewer` 格式与文风 | 阶段 4 评审：同上 | 只读 |
| `ui-spec-reviewer` UI 规范审查 | 可视化 HTML 生成/迭代后：`ui-spec-review` 选配审查 | 只读 |
| `ui-designer-html` 线框原型制作与迭代 | 阶段 2：可视化 HTML 的首版制作与迭代修改 | 可写 |
| `prd-writer` PRD 输出 | 阶段 3：PRD 首版撰写与回流修订 | 可写 |

**派发纪律**：

- 评审专家**只读**、独立评审、结论必须带原文证据与 AI确定度标注；意见交回主对话汇总落盘，子代理不直接写文件
- 生产专家的产物**必须落在方案根路径对应子目录**（VisualMockups/、PRD/），且必须先读对应技术规范（html-generation-spec / prd-generator 模板）
- 派发只改变"谁来干活"，不改变流程纪律：用户确认、闸门检查、回流决策仍由主对话与用户完成

## 完整流程细节

- 流程总控：`skills/requirement-pipeline/SKILL.md`
- 各阶段 skill：`skills/requirement-analysis` / `brainstorming` / `visual-companion` / `prd-generator` / `requirement-review` / `retrospective`
- 专家派发：`.claude/agents/`（8 个专家定义，派发时机见上表）
- 守护 hooks：`hooks/hooks-guide.md`
