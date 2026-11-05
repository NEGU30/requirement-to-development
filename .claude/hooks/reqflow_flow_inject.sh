#!/usr/bin/env bash
# reqflow_flow_inject.sh
# UserPromptSubmit Hook（状态可见 · 纯粹版）
#
# 职责重新划分（解决 matcher 关键词盲区）：
#   - "判断该不该进流程" → 交给 requirement-pipeline skill 的按需激活（语义级，覆盖全）
#   - "有这套流程的心智" → 交给 reqflow_session_init.sh 的 SessionStart 每会话提醒
#   - 本 hook 只做 skill 做不到的事：流程进行中的状态可见性（防失忆）
#
# 逻辑：
#   - 有活跃流程（个人/*/*/<功能>/RequirementLogs/ 下有未定稿日志）→ 注入当前阶段，防长会话失忆
#   - 无活跃流程 → 静默，零干扰
#
# 路径体系（协作结构）：方案根 = 个人/<作者>/<模块>/<功能>/，流程日志在其 RequirementLogs/ 子目录下。
# 本 hook 不需要知道作者/模块具体是谁——用 glob 定位最近的流程日志，再反推方案根。
#
# 不依赖 matcher 关键词、不依赖 marker 文件——判断依据是客观的文件系统状态。
# settings.json 里 matcher 设为空字符串即可（每轮触发，但无活跃流程时静默退出）。

INPUT=$(cat)

# 找最近修改的流程日志（协作路径：个人/<作者>/<模块>/<功能>/RequirementLogs/）
# glob 的三个 * 分别匹配 作者/模块/功能
LATEST_LOG=$(ls -t 个人/*/*/*/RequirementLogs/[0-9]*_流程记录.md 2>/dev/null | head -1)
# 无流程日志 → 静默退出（用户没在做需求，零干扰）
[ -z "$LATEST_LOG" ] && exit 0

# 方案根 = 流程日志往上两级：
#   LATEST_LOG = .../<功能>/RequirementLogs/<文件>
#   dirname 一次 = .../<功能>/RequirementLogs
#   dirname 两次 = .../<功能>   ← 方案根
FEATURE_ROOT=$(dirname "$(dirname "$LATEST_LOG")")
FEATURE=$(basename "$FEATURE_ROOT")

# 已定稿的流程不注入状态（已完成的功能不再提醒）
[ -f "$FEATURE_ROOT/RequirementLogs/.finalized" ] && exit 0

# 解析当前阶段（取日志中最后一条"当前阶段"记录）
CURRENT=$(grep -oE '当前阶段:.*' "$LATEST_LOG" 2>/dev/null | tail -1 | sed 's/^当前阶段:[[:space:]]*//' | sed 's/[[:space:]]*$//')

if [ -n "$CURRENT" ]; then
  echo "[需求流程] 活跃需求：$FEATURE · 当前阶段：$CURRENT"
else
  echo "[需求流程] 活跃需求：$FEATURE · 阶段未记录"
fi

exit 0
