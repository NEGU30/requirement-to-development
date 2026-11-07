#!/usr/bin/env bash
# Compatibility wrapper. Real implementation: reqflow_post_check.js (cross-platform).
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/reqflow_post_check.js"
