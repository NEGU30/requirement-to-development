#!/usr/bin/env bash
# Compatibility wrapper. Real implementation: reqflow_flow_inject.js (cross-platform).
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/reqflow_flow_inject.js"
