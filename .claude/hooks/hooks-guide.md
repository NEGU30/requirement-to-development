# 流程守护 Hooks — 使用说明

RTD 的 hooks 是**状态可见性层**：只补 skill 做不到的事（跨会话状态、文件级前置检查、自动化自检），不替 AI 做流程决策。

**实现已改为 Node.js**（`.js`），`.sh` 只是兼容旧配置的薄包装。Node 由 Claude Code 自带，Windows / macOS / Linux 一致，不再依赖 `sed` / `grep` / Git Bash 解析 JSON。

## 职责划分

| 职责 | 承担者 |
|------|--------|
| 建立“有这套流程”的心智 | SessionStart（精简摘要，约 400 字，不再全量注入） |
| 判断“这次该不该进流程” | `requirement-pipeline` skill 的语义激活 |
| 流程进行中的状态可见 | UserPromptSubmit 读取 `RequirementLogs/state.json` |
| 前置阶段检查 | PreToolUse 检查产物文件是否真实存在且非空 |
| 产物质量自动自检 | PostToolUse 检查 PRD 字数/章节/FID/占位符 |
| UI 规范审查提醒 | PostToolUse 监听 HTML 内容变化，**每次修改提醒一次** |

## 五个 hook

| Hook | 类型 | 作用 |
|------|------|------|
| `reqflow_session_init.js` | SessionStart | 注入精简流程摘要（入口/阶段/硬规则/state 用法/路径） |
| `reqflow_flow_inject.js` | UserPromptSubmit | 有活跃流程时注入当前阶段、轮次、下一步 skill；无流程静默 |
| `reqflow_flow_guard.js` | PreToolUse | 写 `VisualMockups/` 或 `PRD/` 前，检查前置产物是否真实非空；提醒不阻断 |
| `reqflow_post_check.js` | PostToolUse | 写需求论证/设计决策/PRD 后自动校验结构、字数、FID、占位符 |
| `reqflow_ui_review_remind.js` | PostToolUse | HTML 内容变化后提醒 ui-spec-review；同一版本不重复 |

## 状态文件（关键变化）

每个功能的状态写在：

```
个人/{作者}/{模块}/[功能名]/RequirementLogs/state.json
```

结构示例：

```json
{
  "schemaVersion": 1,
  "feature": "日历周视图",
  "author": "张三-1001",
  "module": "_通用",
  "root": "个人/张三-1001/_通用/日历周视图",
  "flow": "B",
  "currentStage": "visual",
  "round": 1,
  "status": "active",
  "createdAt": "2026-11-08T01:00:00.000Z",
  "updatedAt": "2026-11-08T01:10:00.000Z",
  "history": []
}
```

维护命令（从项目根运行，或设置 `CLAUDE_PROJECT_DIR`）：

```bash
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js init --root "个人/张三-1001/_通用/日历周视图" --author "张三-1001" --module "_通用" --feature "日历周视图" --flow B
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js set  --root "个人/张三-1001/_通用/日历周视图" --stage 2 --note "可视化通过"
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js get  --root "个人/张三-1001/_通用/日历周视图" --field currentStage
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js list
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js finalize --root "个人/张三-1001/_通用/日历周视图"
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js reopen   --root "个人/张三-1001/_通用/日历周视图" --reason "评审回流"
```

- `init` 创建或更新状态；已有状态时保留轮次与历史。
- `set` 推进阶段；`--stage finalized` 会同时写 `.finalized`。
- `reopen` 删除 `.finalized` 与 `.ui-review-reminded`，轮次 +1，阶段回到推演。
- 没有 `state.json` 的旧流程：inject / guard 会回退读取旧流程日志，提示迁移。

## 安装步骤

### 方式 A：作为 Claude Code 插件安装（推荐）

仓库内置构建脚本，把源布局打包成标准插件结构：

```bash
npm run build:plugin
```

产物：`dist/requirement-to-development/`

```
dist/requirement-to-development/
├── .claude-plugin/plugin.json
├── skills/
├── agents/
├── hooks/
│   ├── hooks.json
│   └── reqflow_*.js
├── reqflow/config.json
├── scripts/
└── CLAUDE.md
```

安装插件后 hooks 自动生效；`state.json` 与产物路径仍以**目标项目根**为基准（hook 使用 `CLAUDE_PROJECT_DIR`）。`CLAUDE.md` 内容仍需合并到目标项目 `.claude/CLAUDE.md`（插件不能覆盖项目宪法）。

### 方式 B：复制到目标项目（传统方式）

```bash
mkdir -p 目标项目/.claude/{hooks,scripts,reqflow}
cp .claude/hooks/reqflow_*.js        目标项目/.claude/hooks/
cp .claude/hooks/reqflow_*.sh        目标项目/.claude/hooks/   # 仅为旧配置兼容，可选
cp .claude/scripts/reqflow-*.js      目标项目/.claude/scripts/
cp .claude/reqflow/config.json       目标项目/.claude/reqflow/
cp -r .claude/skills/*               目标项目/.claude/skills/
cp -r .claude/agents/*               目标项目/.claude/agents/
```

> `chmod +x` 不再需要——Node 脚本由 `node` 调用，不依赖文件执行位。

### settings.json

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/reqflow_session_init.js" }]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/reqflow_flow_inject.js" }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/reqflow_flow_guard.js" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "node .claude/hooks/reqflow_post_check.js" },
          { "type": "command", "command": "node .claude/hooks/reqflow_ui_review_remind.js" }
        ]
      }
    ]
  }
}
```

插件模式由 `hooks/hooks.json` 自动注册，不需要手改项目 settings。

> **与项目已有 hook 共存**：同类型下追加独立 matcher 块即可。本套 hook 只匹配 `个人/{作者}/{模块}/[功能]/...`，不碰业务代码。

## 能做什么、不能做什么

### ✅ 能做

- 每会话注入精简流程心智，token 成本明显低于旧版全量注入
- 每轮读取 state 注入当前阶段、轮次、下一步 skill
- 前置产物目录/文件为空时提醒（不再是“目录存在即通过”）
- PRD 字数、§0-§6 章节、FID 连续性、模板占位符自动检查
- HTML 每次修改都重新提醒 UI 规范审查
- 定稿/重开时自动维护 `.finalized` 与提醒标记

### ❌ 不能做

- **证明不了阶段被认真执行**：文件存在只证明产物落盘，不证明论证质量
- **不负责判断该不该进流程**：语义判断仍由 skill 负责
- **不硬拦截**：所有提醒均 `exit 0`，避免误伤补录、维护、路径迁移
- **不自动归档**：定稿 ≠ 归档

## 自动校验命令

可单独运行，也可接 CI：

```bash
# 单个 PRD
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-check.js --prd "个人/.../PRD/01_xxx_需求文档.md"

# 整个方案根
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-check.js --root "个人/张三-1001/_通用/日历周视图"

# 定稿前强校验（缺评审记录/状态会报错）
node "${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-check.js --root "个人/..." --final --strict
```

检查项：

- PRD 字数 1500–5000（可在 `config.json` 调整）
- §0/§1/§2/§3/§4/§6 章节存在
- FID 编号连续、模板占位 `Xxx_` 已替换
- `[待补充]` / `[待填写]` / `TODO` / `[xxx]` 残留
- 需求论证 §1/§2/§4/§8 章节
- 设计决策含候选方案/选型结论/假设/风险
- `--final` 额外检查评审记录与 `state.json`

## 测试

```bash
npm test
```

测试覆盖：

- 路径解析（Windows 反斜杠、中文路径、非 RTD 路径）
- state 初始化 / 推进 / 定稿 / 重开
- PRD 校验（字数、FID 连续性、占位符）
- 五个 hook 的输入输出（fixture JSON）

## 平台与路径

- 全部逻辑使用 Node 标准库，无第三方依赖
- 项目根解析顺序：`CLAUDE_PROJECT_DIR` → 输入 `cwd` → `process.cwd()`
- 路径统一转 `/`；支持 Windows 盘符、中文、空格
- 旧 `.sh` 包装器保留，内部 `exec node`，老配置无需立刻迁移
- 旧路径回退：没有 `state.json` 时读取 `*_流程记录.md` 的最后阶段记录

## 定稿与重开

- 定稿：`reqflow-state.js finalize --root ...` → `state.status=finalized` + `.finalized`
- 重开/回流：`reqflow-state.js reopen --root ...` → 删除两个标记、轮次 +1、阶段回推演
- 用户绕过流程直接改文件时，可手动删除：
  ```bash
  rm "个人/{作者}/{模块}/[功能]/RequirementLogs/.finalized"
  rm "个人/{作者}/{模块}/[功能]/RequirementLogs/.ui-review-reminded"
  ```
