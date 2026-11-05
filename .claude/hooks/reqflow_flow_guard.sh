#!/usr/bin/env bash
# reqflow_flow_guard.sh
# PreToolUse Hook（提醒模式 · 非阻断）
#
# 设计理念：
#   hook 只做"知情提醒"，不做"硬拦截"。
#   需求流程由人主导、语义模糊，文件系统状态（目录是否存在）对不上流程真实状态
#   （阶段是否认真做完）。硬拦截会因功能名笔误等误判打断正常工作；提醒模式让
#   AI 和用户"知情"，决策权在人。
#
# 作用：AI 写某阶段产物时，检查前置阶段产物文件是否存在。
#       缺失 → stdout 输出提醒（exit 0 放行），AI 看到后自行判断是否该停下走流程。
#       存在 → 静默放行。
#
# 路径体系（协作结构）：方案根 = 个人/<作者>/<模块>/<功能>/
#   PRD 产物：   <方案根>/PRD/...
#   可视化产物：<方案根>/VisualMockups/...
#   论证产物：  <方案根>/RequirementAnalysis/...
#   定稿标记：  <方案根>/RequirementLogs/.finalized
# 本 hook 从写入路径反推"方案根"（<作者>/<模块>/<功能> 三级），同一方案根下的跨阶段一致性
# 靠完整路径保证——比旧版"只靠功能名"更稳，且天然支持多人同名功能互不干扰。
#
# 诚实边界（本 hook 做不到的事）：
#   - 只能证明"前置产物文件存在过"，证明不了"阶段被认真执行"（空目录也能让提醒消失）
#   - 写入路径不符合协作结构（如绕过 本流程直接写 docs/PRD/）时静默放行，不提醒
#   - 替代不了 skill 的软约束和人工评审

INPUT=$(cat)

# 子代理放行：子代理由主代理调度，提醒交给主代理上下文处理
AGENT_ID=$(echo "$INPUT" | sed -n 's/.*"agent_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
if [ -n "$AGENT_ID" ] && [ "$AGENT_ID" != "null" ]; then
  exit 0
fi

# 提取被写入的文件路径
FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
[ -z "$FILE_PATH" ] && exit 0

# 路径规范化：Windows 反斜杠 → 正斜杠；压缩 JSON 转义导致的多斜杠
NORMALIZED=$(echo "$FILE_PATH" | tr '\' '/' | sed 's|//\+|/|g')

# 判断写入目标属于哪个阶段产物，从协作路径反推方案根
# 协作路径形如：.../个人/<作者>/<模块>/<功能>/<产物类型>/...
# sed 捕获组抓取 <功能> 及其以上层级作为方案根
STAGE=""
FEATURE_ROOT=""
case "$NORMALIZED" in
  */个人/*/*/PRD/*)
    STAGE="prd"
    FEATURE_ROOT=$(echo "$NORMALIZED" | sed -n 's|\(.*/个人/[^/]*/[^/]*/[^/]*\)/PRD/.*|\1|p')
    ;;
  */个人/*/*/VisualMockups/*)
    STAGE="mock"
    FEATURE_ROOT=$(echo "$NORMALIZED" | sed -n 's|\(.*/个人/[^/]*/[^/]*/[^/]*\)/VisualMockups/.*|\1|p')
    ;;
  *)
    # 非本流程协作路径产物（或绕过流程的旧式 docs/PRD/ 写入）→ 静默放行
    exit 0
    ;;
esac

[ -z "$FEATURE_ROOT" ] && exit 0
FEATURE=$(basename "$FEATURE_ROOT")

# 已定稿的功能 → 静默放行（改错别字、维护等不再提醒）
[ -f "$FEATURE_ROOT/RequirementLogs/.finalized" ] && exit 0

# 检查某前置阶段产物目录是否存在（基于方案根，跨阶段一致性靠同一方案根）
stage_done() {
  case $2 in
    0) [ -d "$1/RequirementAnalysis" ] ;;
    2) [ -d "$1/VisualMockups" ] ;;
  esac
}

# 校验前置阶段，汇总缺失项
WARN=""
case $STAGE in
  mock)
    if ! stage_done "$FEATURE_ROOT" 0; then
      WARN="  - 阶段 0 需求分析产物 $FEATURE_ROOT/RequirementAnalysis/ 未见"
    fi
    ;;
  prd)
    if ! stage_done "$FEATURE_ROOT" 0; then
      WARN="  - 阶段 0 需求分析产物 $FEATURE_ROOT/RequirementAnalysis/ 未见"
    fi
    if ! stage_done "$FEATURE_ROOT" 2; then
      WARN="$WARN
  - 阶段 2 可视化产物 $FEATURE_ROOT/VisualMockups/ 未见"
    fi
    ;;
esac

# 前置齐全 → 静默放行
[ -z "$WARN" ] && exit 0

# 前置缺失 → 输出提醒到 stdout（注入 AI 上下文），但放行不阻断
STAGE_LABEL=""
case $STAGE in
  mock) STAGE_LABEL="阶段 2 可视化产物" ;;
  prd)  STAGE_LABEL="阶段 3 PRD 产物" ;;
esac

cat <<EOF
[RF流程守护·提醒] 即将写入 $STAGE_LABEL（功能：$FEATURE），但前置阶段产物可能缺失：
$WARN

这是一条提醒，不是拦截——写入会正常进行。请 AI 自行判断：
  - 若是新功能且尚未走前置流程，建议先调用 requirement-pipeline skill 走完需求分析/可视化；
  - 若属补录/维护/方案根在阶段间写法不一致，可忽略本提醒。
EOF
exit 0
