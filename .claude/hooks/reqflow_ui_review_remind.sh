#!/usr/bin/env bash
# Compatibility wrapper. Real implementation: reqflow_ui_review_remind.js (cross-platform).
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/reqflow_ui_review_remind.js"
