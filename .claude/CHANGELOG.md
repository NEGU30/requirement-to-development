# 更新记录

## [1.0.0] - 2026-11-08

### Added

- 阶段 1 新增落盘产物 `DesignDecisions/设计决策_[功能名].md`，记录候选方案、用户选型理由、砍掉的需求、关键假设与风险。
- 统一流程状态文件 `RequirementLogs/state.json` + `reqflow-state.js` CLI（init / set / get / list / finalize / reopen）。
- 产物校验 CLI `reqflow-check.js`：PRD 字数、章节、FID 连续性、模板占位符、需求论证与设计决策结构、定稿前完整性检查。
- 勘误快线：仅错别字/格式/链接，用户授权并记入日志后原地修正。
- 评审强度分级：L1 全量 5 人 / L2 回流增量 / L3 轻量 3 人（需用户授权）。
- 插件构建：`npm run build:plugin` 生成标准 `.claude-plugin` 结构。
- 一键接入安装器 `scripts/install.js`：复制 skills/agents/hooks/scripts/config，标记块合并 `CLAUDE.md`，合并 `settings.json` hooks（保留项目已有 hook），创建 `team/` 模板，支持 `--dry-run` 与自动备份。
- 完整接入教程 `.claude/接入指南.md`：每条配置的作用、最小/完整接入、验证、升级、卸载、排障。
- 文档一致性检查 `npm run sync:check` 与 Node 测试 `npm test`。

### Changed

- 5 个 hook 全部改为 Node 实现，`.sh` 仅作兼容包装；不再依赖 sed/grep 解析 JSON。
- SessionStart 注入从全量摘要压缩为精简摘要，降低每会话 token 成本。
- UserPromptSubmit 改为读取 `state.json`，不再解析可能永不更新的日志字段。
- PreToolUse 检查产物**文件真实存在且非空**，并新增阶段 1 设计决策检查。
- 新增 PostToolUse 产物自检；UI 审查提醒改为每次 HTML 修改重新提醒。
- 方案根产物从六类扩展为七类（新增 DesignDecisions）。
- `_gen_offline.js` 支持命令行输入/输出参数，不再硬编码示例文件名。
- 安装文档同步：8 个技能、5 个 hook、插件 / 复制两种方式。

### Fixed

- 修正会话注入仍写“三个评审员”的过期信息（现为 5 位）。
- 修正安装说明漏装 `reqflow_ui_review_remind`、`chmod rf_*.sh` 匹配不到 `reqflow_*`。
- 修正使用说明“7 个技能”与实际 8 个不一致。
- 修正 guard 仅检查目录存在、空目录也放行的问题。
- 修正回流后 `.ui-review-reminded` 不重置、UI 审查不再提醒的问题。
