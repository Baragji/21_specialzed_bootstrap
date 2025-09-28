#!/usr/bin/env bash
set -euo pipefail
REPO="${1:?Usage: $0 org/repo}"
BRANCH="${2:-main}"

gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks.strict=true \
  -f enforce_admins=true \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f required_pull_request_reviews.required_approving_review_count=1 \
  -F required_status_checks.contexts[]="test" \
  -F required_status_checks.contexts[]="codeql" \
  -F required_status_checks.contexts[]="sboms" \
  -F required_status_checks.contexts[]="Attest build provenance (API)" \
  -F required_status_checks.contexts[]="Attest build provenance (Web)" \
  -F required_status_checks.contexts[]="API mutation testing (≥60%)" \
  -F required_status_checks.contexts[]="Web mutation testing (≥60%)"
echo "Branch protection configured for $REPO@$BRANCH"
