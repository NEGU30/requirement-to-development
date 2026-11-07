#!/usr/bin/env node
'use strict';

const lib = require('../scripts/reqflow-lib');

// SessionStart: compact framework reminder. Full gates live in the skill.
// Kept short on purpose: this text is injected into every session.

function main() {
  const text = `=== 需求流程框架（RTD·会话加载）===

【入口】新需求 / 功能构想 / 设计变更 / 尚未成型的痛点，先调用 requirement-pipeline。不允许直接跳子 skill 或直接写产物。纯概念解释、查文件、改错别字除外；拿不准时默认先进阶段 0（诘问成本低）。

【阶段】0 需求分析(requirement-analysis) → 1 推演(brainstorming) → 2 可视化(visual-companion) → 3 PRD(prd-generator) → 4 评审(requirement-review，5 位专家并行) → 5 复盘(retrospective，可选) → 定稿。阶段不可跳，跳步仅用户明确授权。

【必记规则】
1. 先论证再推演；先推演 + 可视化确认再出 PRD；PRD 后必评审。
2. 评审后语义修改：回阶段 1 全链路重走。仅错别字/格式修正可走“勘误快线”（用户明确授权 + 记入流程日志）。
3. 所有阶段产物必须落盘到方案根 个人/{作者}/{模块}/[功能名]/ 对应子目录；阶段 1 必须产出 DesignDecisions/设计决策_[功能名].md。
4. 定稿 ≠ 归档。定稿只写 .finalized；归档到 team/finalized-proposals/ 必须人工审批，流程不自动执行。
5. 定稿 / 回流 / 降级评审强度，必须用户明确确认。

【状态】每阶段用 state.json 记录，hooks 靠它注入当前阶段：
node "\${CLAUDE_PLUGIN_ROOT:-.claude}/scripts/reqflow-state.js set --root <方案根> --stage <0-6|analysis|...> [--round N]

【路径】
方案根：个人/{作者}/{模块}/[功能名]/
产物：RequirementAnalysis / DesignDecisions / VisualMockups / PRD / ReviewLogs / RequirementLogs / Retrospectives
项目背景（共享只读）：team/project-context/
机器可读约定：.claude/reqflow/config.json（插件安装时在插件根 reqflow/config.json）

【完整规则】阶段闸门、日志模板、回流、评审分级见 .claude/skills/requirement-pipeline/SKILL.md 与 .claude/CLAUDE.md。

=== 仅当本次对话要产出需求/方案时启动流程；非需求会话不主动启动 ===`;

  lib.print(text);
}

main();
