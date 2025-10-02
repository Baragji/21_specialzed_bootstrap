#!/usr/bin/env bash
set -euo pipefail
REPO="${1:?Usage: $0 org/repo}"
BRANCH="${2:-main}"

gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" \
  -H "Accept: application/vnd.github+json" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "test / api-web-ci",
      "codeql / analyze"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null
}
EOF
echo "Branch protection configured for $REPO@$BRANCH"
