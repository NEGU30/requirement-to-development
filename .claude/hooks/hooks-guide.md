# 流程守护 Hooks — 使用说明

这三个 hook 构成 本流程的**状态可见性层**——只做 skill 做不到的事，不越俎代庖。

## 设计定位：职责三分

需求流程的三个职责，分别交给最合适的承担者：

| 职责 | 承担者 | 为什么 |
|------|--------|--------|
| 建立"有这套流程"的心智 | **SessionStart 注入流程框架**（reqflow_session_init.sh） | 每会话把流程核心（入口/阶段/规则/检查点）注入 AI 上下文，确保 AI 全会话"知道"流程存在 |
| 判断"这次该不该进流程" | **skill 按需激活**（requirement-pipeline 的 description） | AI 语义理解用户意图，覆盖全，无盲区 |
| 流程进行中的状态可见（防失忆） | **hook 状态注入**（reqflow_flow_inject.sh） | skill 激活后内容会被上下文压缩丢失，hook 靠文件系统状态持续可见 |

**关键**：SessionStart 注入流程框架是"强制看内容"——hook 不能命令 AI 去读文件，但能把内容直接摆到 AI 上下文里，AI 一定看到。这是保证 AI 每会话都了解流程的可靠方式（不依赖 AI 主动 recall skill）。

## 提醒模式，不拦截

本套 hook **不做硬拦截**（不 exit 2 阻断）。需求流程由人主导、语义模糊，文件系统状态对不上流程真实状态，硬拦会误判打断正常工作。改为提醒——误报只是噪音，不卡流程，决策权在人。

## 三个 hook 的职责

| Hook | 类型 | 作用 |
|------|------|------|
| `reqflow_session_init.sh` | SessionStart | 每会话注入流程框架摘要（入口/6 阶段/必记规则/强制检查点/增量复盘/产物路径），让 AI 全会话了解流程 |
| `reqflow_flow_inject.sh` | UserPromptSubmit | 有活跃流程时，每轮注入当前阶段（防失忆）；无活跃流程时静默 |
| `reqflow_flow_guard.sh` | PreToolUse | 写 PRD/HTML 前，前置阶段产物缺失则提醒（放行不阻断） |

## 安装步骤

### 1. 复制脚本到目标项目

```bash
cp reqflow_session_init.sh /目标项目/.claude/hooks/
cp reqflow_flow_inject.sh  /目标项目/.claude/hooks/
cp reqflow_flow_guard.sh   /目标项目/.claude/hooks/
chmod +x /目标项目/.claude/hooks/rf_*.sh
```

### 2. 配置 settings.json

在目标项目的 `.claude/settings.json` 的 `hooks` 字段追加：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/reqflow_session_init.sh" }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/reqflow_flow_inject.sh" }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/reqflow_flow_guard.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/reqflow_ui_review_remind.sh" }
        ]
      }
    ]
  }
}
```

> **UserPromptSubmit 的 matcher 设为空**（每轮触发）。不用担心干扰——inject 内部会判断：无活跃流程时静默退出，零输出。只有 `个人/*/*/*/RequirementLogs/` 下有未定稿流程时才注入一行状态。

> **与项目已有 hook 共存**：若项目已有同类型 hook（如 family_planning 的 enforce-skill-first / component-reuse-reminder），**新建独立 matcher 块**追加到数组。例如项目已有 UserPromptSubmit：
> ```json
> "UserPromptSubmit": [
>   { "matcher": "按钮|弹窗|...", "hooks": [{ ... 已有hook ... }] },
>   { "matcher": "", "hooks": [{ "type": "command", "command": "bash .claude/hooks/reqflow_flow_inject.sh" }] }
> ]
> ```
> 两个 matcher 块各自独立匹配。本套 hook 只盯 `docs/` 下 需求产物路径，与项目业务代码 hook 职责不重叠。

## hook 能做什么、不能做什么

### ✅ 能做

- 每会话开始注入一句流程提醒，AI 知道有这套流程
- 流程进行中，每轮注入当前阶段，长会话不失忆（不论用户用什么词表达）
- AI 写 PRD 时若阶段 0/2 产物缺失 → 提醒，AI 可主动停下问用户
- 已定稿功能不再提醒

### ❌ 不能做（诚实边界）

- **证明不了阶段被认真执行**：空目录也能让提醒消失，hook 只校验"目录存在"
- **保证不了功能名一致**：阶段间功能名写法不一致时会误报（因不阻断，只是噪音）
- **不负责判断该不该进流程**：那是 requirement-pipeline skill 的职责（靠 AI 语义理解，比关键词可靠）
- **替代不了 skill 软约束和人工评审**

## 定稿标记与重开流程

### 定稿

流程走完定稿后，`requirement-pipeline` 自动创建 `.finalized` 标记，该功能后续编辑不再提醒（标记在方案根下的 RequirementLogs/）：

```bash
个人/{作者}/{模块}/日历周视图/RequirementLogs/.finalized
```

### 重开流程（改版已定稿的功能）

用户对已定稿功能提出新改版时，只要通过 `requirement-pipeline` 启动流程，总控**自动删除** `.finalized`，恢复 hook 提醒——用户无需任何手动操作。

仅当用户**绕过流程直接改文件**、又想让 hook 恢复提醒时，才需手动：

```bash
rm "个人/{作者}/{模块}/日历周视图/RequirementLogs/.finalized"
```

## 阶段产物路径约定（guard 校验依据）

> 路径基于**方案根** `个人/{作者}/{模块}/[功能]/`，guard 从写入路径反推方案根（作者/模块/功能三级），再校验同根下的前置产物——天然支持多人同名功能互不干扰。

| 阶段 | 产物路径 | 前置依赖（缺失时提醒） |
|------|---------|---------|
| 0 需求分析 | `个人/{作者}/{模块}/[功能]/RequirementAnalysis/` | 无（起点） |
| 2 可视化 | `个人/{作者}/{模块}/[功能]/VisualMockups/` | 阶段 0 |
| 3 PRD | `个人/{作者}/{模块}/[功能]/PRD/` | 阶段 0 + 阶段 2 |

> 阶段 4（评审）产物在实际场景多为真人评审（会话外），AI 很少写 `个人/{作者}/{模块}/[功能]/ReviewLogs/`，故未纳入校验范围。
> 阶段 1（推演）、阶段 5（复盘）无前置依赖，不校验。

## 平台兼容

- bash 脚本，依赖 `sed`/`tr`/`case`/`grep`
- Windows 路径已处理：`tr '\\' '/'` + 压缩多斜杠
- 中文路径用 `case` 通配符匹配，规避 grep 在某些 locale 下的中文匹配问题
- Windows Git Bash、macOS、Linux 均可运行
