#!/usr/bin/env bash
# Compatibility wrapper. Real implementation: reqflow_flow_guard.js (cross-platform).
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/reqflow_flow_guard.js"
