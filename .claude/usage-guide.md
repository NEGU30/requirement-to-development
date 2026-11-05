# 需求推演至开发 — 使用说明

一套从需求分析到开发交接的协作流程，运行在 Claude Code 中。

当前版本：v0.0.1

## 快速安装（5 步）

### 第 1 步：复制 skills 目录

将 `skills/` 下的 7 个文件夹**整体**复制到目标项目的 `.claude/skills/` 目录下：

```
目标项目/.claude/skills/
├── requirement-pipeline/   ← 总控
├── requirement-analysis/   ← 需求分析（阶段 0）
├── brainstorming/          ← 推演
├── visual-companion/       ← 可视化
├── prd-generator/          ← PRD 生成
├── requirement-review/     ← 评审
└── retrospective/          ← 复盘总结
```

如果 `.claude/skills/` 下已有其他 skill，不会冲突，直接并排放置即可。

随 skills 一起安装 `agents/`（可派发专家，Task 子代理）：

```
目标项目/.claude/agents/
├── completeness-logic-reviewer.md   ← 评审专家：完整性与逻辑
├── risk-reviewer.md                 ← 评审专家：需求风险
├── ux-reviewer.md                   ← 评审专家：用户体验
├── priority-reviewer.md             ← 评审专家：优先级与分期
├── format-style-reviewer.md         ← 评审专家：格式与文风
├── ui-spec-reviewer.md              ← 生产/审查专家：可视化 HTML UI 规范审查
├── ui-designer-html.md              ← 生产专家：线框原型制作与迭代
└── prd-writer.md                    ← 生产专家：PRD 输出
```

五位评审专家在阶段 4 由 `requirement-review` 并行派发（隔离上下文、只读、独立评审）；三个生产/审查专家分别在可视化、PRD 撰写与 UI 规范审查环节派发。派发时机与纪律详见 `CLAUDE.md` 的「专家 Agent（派发）」。

### 第 2 步：合并 CLAUDE.md 项目级约束

`CLAUDE.md` 是项目级"宪法"，AI 进入项目就遵守——比 skill 和 hook 的约束力更强。把 本目录下的 `CLAUDE.md` 内容合并到目标项目：

- 若目标项目**已有** `.claude/CLAUDE.md`：把本流程的 `CLAUDE.md` 内容**追加到末尾**（保留项目原有约束）
- 若**没有**：直接复制为 `.claude/CLAUDE.md`

内容包含：强制流程入口（新需求必先走 requirement-pipeline）、阶段不跳步、评审后修改必回流、产物必落盘。详见 [`CLAUDE.md`](CLAUDE.md)。

### 第 3 步：安装流程守护 hooks（推荐）

skill 是软约束（靠 AI 自觉）。hooks 提供**状态可见性层**，补 skill 做不到的事。三者职责划分：

| 职责 | 承担者 |
|------|--------|
| 建立"有这套流程"的心智 | SessionStart hook（每会话注入流程框架摘要） |
| 判断"这次该不该进流程" | requirement-pipeline skill 的按需激活（AI 语义理解，覆盖全） |
| 流程进行中的状态可见（防失忆） | UserPromptSubmit hook（有活跃流程才注入阶段） |

将 `hooks/` 下的三个脚本复制到目标项目的 `.claude/hooks/`，并在 `.claude/settings.json` 的 `hooks` 字段追加配置（SessionStart / UserPromptSubmit / PreToolUse）。

> 📌 **详细的 hook 安装步骤、settings.json 配置、设计定位、能与不能、平台兼容等，见 [hooks/hooks-guide.md](hooks/hooks-guide.md)。** 本节只做概要说明。

安装后效果：
- 每会话开始注入流程框架摘要（入口/6 阶段/必记规则/强制检查点/产物路径），AI 全会话了解流程——**这是"强制看内容"**，不依赖 AI 主动 recall skill
- 流程进行中（有活跃流程日志时），每轮注入当前阶段，长会话不失忆——**不论用户用什么词表达**，无关键词盲区
- AI 写 PRD 时若阶段 0/2 产物缺失 → 提醒（不阻断），AI 可主动停下确认
- 没在做需求时（无活跃流程）→ 静默，零干扰
- 已定稿功能不再提醒

> 注意：hook 是提醒模式，不做硬拦截。需求流程由人主导，文件状态对不上流程真实状态，硬拦会误判。详见 hooks/hooks-guide 的设计定位说明。

### 第 4 步：准备项目背景

将 `project-context/` 文件夹复制到目标项目的 `team/project-context/` 目录下，然后**把里面的背景文档换成你项目的**：

```
目标项目/team/project-context/
├── README.md                          ← 说明（可保留）
└── [你项目的背景文档，可单可多]         ← 替换示例，填自己项目
```

> 需求产物采用**协作目录结构**：个人区 `个人/{作者}/{模块}/[功能名]/` + 共享区 `team/`。项目背景属共享区。配套的模块清单、协作公约、定稿归档区等放在 `team/conventions/` 下（各项目自行维护）。

- 文件夹里的 `README.md` 是说明文档。**把你项目的背景文档放进来即可**。
- 背景可单可多（项目概要 / 模块说明 / 架构图……），AI 会读整个文件夹。
- **文件名随意**，不用保持任何固定名字。

### 第 5 步：目录会自动创建，无需手动建

首次启动流程时，requirement-pipeline 会和你确认作者、模块、功能名（路径三要素）+ 流程选择（A/B）。确认后自动创建工作区目录：

- **`个人/`** —— 首次写产物时自动创建（Write 工具建父目录链），无需手动建。
- **`team/`** —— requirement-pipeline 启动确认后自动创建（`team/project-context/`、`team/conventions/`、`team/finalized-proposals/`），无需手动建。

> 目录结构自动创建后，用户需自行往 `team/project-context/` 放置项目背景文档、`team/conventions/` 放置模块清单等规约（目录是自动建的，内容是人填的）。

---

## 安装后验证

新开一个 Claude Code 会话，输入一个需求，例如：

> "我想给待办模块加一个看板视图"

如果 AI 开始按照推演流程逐步提问（一次一个问题），说明安装成功。

---

## 如何使用

**你不需要手动调用任何 Skill。** 在 Claude Code 对话中用自然语言描述需求，AI 会自动启动流程。

流程中你只需在以下时刻做确认：

| 阶段 | 你需要做什么 |
|------|-------------|
| 需求分析 | 回答诘问，举证论证需求值得做（或承认是假设） |
| 推演 | 回答问题、选择方案、确认设计 |
| 可视化 | 用浏览器（推荐 Chrome）打开 HTML 查看，回复通过或修改 |
| PRD 生成 | 无需操作，自动完成 |
| 评审 | 逐条回复"处理"或"接受" |
| 复盘 | 查看复盘报告，回顾踩坑教训 |

### 可视化阶段

可视化产物是一个**离线自包含的 HTML 文件**，用浏览器（推荐 Chrome）打开即可交互查看。内容按需求复杂度**至少覆盖一项**、最多四类维度：业务流程图（业务怎么走通）、UI 线框图（可交互）、用户操作流程图、页面流转图。

**两种 HTML 来源**：
- **AI 生成**（默认）：根据设计方案自动生成
- **用户提供外部 HTML**：已有设计师稿或现成原型，直接接入（复制到 VisualMockups/ 下），不重新生成

**UI 规范审查（选配）**：可视化确认通过后，可调用 `ui-spec-review`（选配工具）对 HTML 的 UI 设计做规范审查（按钮/颜色/圆角/弹窗等），需要提前在 `skills/ui-spec-review/` 放入项目的设计规范文档。

如需精确指定"改哪个元素"，用页面自带的 **selector 标注器**——它**已内嵌在每个生成的 HTML 里**，无需安装：

1. 打开生成的可视化 HTML
2. 右下角点 **📐 浮动按钮** → 点「开启标注」
3. 鼠标悬浮高亮元素 → 点击选中 → 写改动 → 导出清单
4. 把清单贴给 AI，AI 按 selector 精确改

> Edge / Chrome / Firefox 全通用（内嵌为页面自身 JS，绕开了书签在 Edge 上的兼容问题）。
> 仅当要标注**非 本流程生成的任意网页**时，才用书签版（`skills/visual-companion/partial-annotation-bookmarklet.html`）。**书签法推荐 Chrome**（一拖即装）；Edge 上书签受限，改用控制台法（F12 粘贴源码，见安装页第 1 步②）。
>
> 注：标注器是 visual-companion skill 生成 HTML 时自动内嵌的，普通使用者不用关心代码细节，打开 HTML 看到 📐 按钮即可用。

---

## 文件夹内容

```
rf/
├── usage-guide.md                        ← 你正在看的这个文件
├── CLAUDE.md                              ← 项目级约束模板（合并到目标项目 .claude/CLAUDE.md）
├── project-context/                              ← 项目背景文件夹（顶层，含 README，安装时放本项目内容）
│   └── README.md                          ← 用途说明
├── skills/                                ← 软约束层（prompt）
│   ├── requirement-pipeline/
│   │   └── SKILL.md                        ← 总控（唯一入口）
│   ├── requirement-analysis/
│   │   └── SKILL.md                        ← 阶段 0：需求分析（A 简表 / B 诘问 + 举证）
│   ├── brainstorming/
│   │   └── SKILL.md                        ← 阶段 1：需求推演
│   ├── visual-companion/
│   │   ├── SKILL.md                        ← 阶段 2：可视化（AI 生成 / 外部 HTML）
│   │   ├── html-generation-spec.md                  ← AI 生成技术规范（方式一读、方式二不读）
│   │   ├── _gen_offline.js                 ← 离线化兜底工具
│   │   └── partial-annotation-bookmarklet.html        ← 标注器书签版（标注外部 HTML 用）
│   ├── prd-generator/
│   │   └── SKILL.md                        ← 阶段 3：PRD 生成
│   ├── requirement-review/
│   │   └── SKILL.md                        ← 阶段 4：团队评审（五评审专家并行派发）
│   ├── retrospective/
│   │   └── SKILL.md                        ← 阶段 5：复盘总结
│   └── ui-spec-review/
│       ├── SKILL.md                        ← 选配工具：审 HTML UI 规范
│       └── [UI设计规范文档].md                 ← 默认规范（可换，适配不同项目）
├── agents/                                ← 专家派发层（Task 子代理）
│   ├── completeness-logic-reviewer.md      ← 评审专家：完整性与逻辑（只读）
│   ├── risk-reviewer.md                    ← 评审专家：需求风险（只读）
│   ├── ux-reviewer.md                      ← 评审专家：用户体验（只读）
│   ├── priority-reviewer.md                ← 评审专家：优先级与分期（只读）
│   ├── format-style-reviewer.md            ← 评审专家：格式与文风（只读）
│   ├── ui-spec-reviewer.md                 ← 审查专家：HTML UI 规范审查（只读）
│   ├── ui-designer-html.md                 ← 生产专家：线框原型制作与迭代
│   └── prd-writer.md                       ← 生产专家：PRD 输出
└── hooks/                                 ← 状态可见性层（提醒，不拦截）
    ├── hooks-guide.md                    ← hooks 安装与配置说明
    ├── reqflow_session_init.sh                  ← SessionStart：每会话注入流程框架摘要
    ├── reqflow_flow_inject.sh                   ← UserPromptSubmit：有活跃流程时注入当前阶段（防失忆）
    ├── reqflow_flow_guard.sh                    ← PreToolUse：写产物前提醒前置是否完成
    └── reqflow_ui_review_remind.sh              ← PostToolUse：HTML 生成后一次性提醒 ui-spec-review
```

### 参考文档说明

`docs/模板示例/` 下的文件是**参考样本**，不属于安装内容（复制到目标项目时不必带）。均按「模板示例 + 文档类型」命名，结构对齐 本流程对应阶段的模板，可作"照着写"的范本：

| 文档 | 类型 | 特点 |
|------|------|------|
| `模板示例_PRD_定时发送模块_交互优化.md` | PRD（迭代优化类） | §0 含用户反馈原话 + 优化前后对比，多 FID 带 P 分级 |
| `模板示例_复盘总结_日历周视图.md` | 复盘 | 含增量复盘 + 总复盘，结构完整 |
| `模板示例_可视化_日历周视图.html` | 可视化 | 可交互 UI + 内联 SVG 图表，离线自包含 |

> 这些样本由实际工作文档改造为标准格式，frontmatter 均有标注。如需用 本流程从头生成全新样本，参照 `skills/` 下对应 skill 的模板。
