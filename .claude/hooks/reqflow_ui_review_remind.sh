#!/usr/bin/env bash
# reqflow_ui_review_remind.sh
# PostToolUse Hook：visual 写 HTML 后提醒 ui-spec-review（只触发一次）
#
# 作用：visual-companion 生成 HTML 后，注入一次性提醒"可调用 ui-spec-review 审 UI"。
#       用标记文件确保每个功能只提醒一次（不反复注入）。
#
# 触发条件：PostToolUse（Write|Edit），文件路径匹配 VisualMockups/*.html
# 标记文件：方案根/RequirementLogs/.ui-review-reminded（存在则跳过）

INPUT=$(cat)

# 子代理放行
AGENT_ID=$(echo "$INPUT" | sed -n 's/.*"agent_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
if [ -n "$AGENT_ID" ] && [ "$AGENT_ID" != "null" ]; then exit 0; fi

# 提取文件路径
FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
[ -z "$FILE_PATH" ] && exit 0

# 路径规范化：Windows 反斜杠 → 正斜杠
NORMALIZED=$(echo "$FILE_PATH" | tr '\' '/' | sed 's|//\+|/|g')

# 匹配 VisualMockups 下 HTML 写入，反推方案根
case "$NORMALIZED" in
  */个人/*/*/VisualMockups/*.html)
    FEATURE_ROOT=$(echo "$NORMALIZED" | sed -n 's|\(.*/个人/[^/]*/[^/]*/[^/]*\)/VisualMockups/.*|\1|p')
    ;;
  *) exit 0 ;;
esac

[ -z "$FEATURE_ROOT" ] && exit 0

# 只触发一次：检查标记文件
[ -f "$FEATURE_ROOT/RequirementLogs/.ui-review-reminded" ] && exit 0

# 创建标记（确保 RequirementLogs 目录存在）
mkdir -p "$FEATURE_ROOT/RequirementLogs" 2>/dev/null
touch "$FEATURE_ROOT/RequirementLogs/.ui-review-reminded"

# 注入一次性提醒
cat <<EOF
[选配工具提醒] 可视化 HTML 已生成。确认通过后，可调用 ui-spec-review 对 HTML 的 UI 设计做规范审查（按钮/颜色/圆角/弹窗等）。
需提前在 skills/ui-spec-review/ 文件夹内放入项目的 UI 设计规范文档（默认读 team/conventions/UI设计规范参考.md）。
这是一次性提醒，不会重复出现。
EOF
exit 0
