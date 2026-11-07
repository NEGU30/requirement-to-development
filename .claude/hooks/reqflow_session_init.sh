#!/usr/bin/env bash
# Compatibility wrapper. Real implementation: reqflow_session_init.js (cross-platform).
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/reqflow_session_init.js"
