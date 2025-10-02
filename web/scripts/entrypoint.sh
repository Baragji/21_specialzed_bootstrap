#!/usr/bin/env sh
set -eu

ORCH_BASE="${ORCHESTRATOR_BASE:-}"
cat > /usr/share/nginx/html/config.js <<EOF
window.ORCHESTRATOR_BASE = ${ORCH_BASE:+"$ORCH_BASE"};
EOF

exec nginx -g 'daemon off;'
