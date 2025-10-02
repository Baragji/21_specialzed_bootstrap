#!/usr/bin/env bash
set -euo pipefail

GITHUB_REPO="${1:?Usage: $0 <github-org/repo> <repo-name> <aws-region>}"
REPO_NAME="${2:?Usage: $0 <github-org/repo> <repo-name> <aws-region>}"
AWS_REGION="${3:-eu-north-1}"

export AWS_REGION
export AWS_DEFAULT_REGION="$AWS_REGION"

log() {
  printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

fatal() {
  log "❌ $1"
  exit 1
}

command -v gh >/dev/null || fatal "GitHub CLI required"
command -v aws >/dev/null || fatal "AWS CLI required"
command -v jq >/dev/null || fatal "jq required"

gh auth status >/dev/null 2>&1 || fatal "GitHub CLI not authenticated"
aws sts get-caller-identity --output text --region "$AWS_REGION" >/dev/null || fatal "AWS CLI not authenticated"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")
BACKEND_ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$REPO_NAME-backend-role"
FRONTEND_ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$REPO_NAME-frontend-role"

distribution_id() {
  local comment="$1"
  aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='$comment'].Id" \
    --output text
}

log "Validating CloudFront distributions"
STAGING_COMMENT="$REPO_NAME-staging"
PRODUCTION_COMMENT="$REPO_NAME-production"
STAGING_DIST=$(distribution_id "$STAGING_COMMENT")
PRODUCTION_DIST=$(distribution_id "$PRODUCTION_COMMENT")

[[ -n "$STAGING_DIST" && "$STAGING_DIST" != "None" ]] || fatal "Missing CloudFront distribution for $STAGING_COMMENT"
[[ -n "$PRODUCTION_DIST" && "$PRODUCTION_DIST" != "None" ]] || fatal "Missing CloudFront distribution for $PRODUCTION_COMMENT"

log "Setting GitHub secrets for $GITHUB_REPO"
set_secret() {
  local name="$1"
  local value="$2"
  gh secret set "$name" --body "$value" --repo "$GITHUB_REPO"
}

set_secret AWS_BACKEND_ROLE_ARN "$BACKEND_ROLE_ARN"
set_secret ECR_API_REPO "$REPO_NAME/api"
set_secret ECS_CLUSTER "$REPO_NAME-cluster"
set_secret ECS_SERVICE "$REPO_NAME-service"
set_secret AWS_FRONTEND_ROLE_ARN "$FRONTEND_ROLE_ARN"
set_secret S3_STAGING_BUCKET "$REPO_NAME-staging"
set_secret S3_PRODUCTION_BUCKET "$REPO_NAME-production"
set_secret CF_STAGING_DISTRIBUTION "$STAGING_DIST"
set_secret CF_PRODUCTION_DISTRIBUTION "$PRODUCTION_DIST"
set_secret AWS_REGION "$AWS_REGION"

log "Setting GitHub variables"
set_variable() {
  gh variable set "$1" --body "$2" --repo "$GITHUB_REPO"
}

SERVICE_URL=$(aws elbv2 describe-load-balancers \
  --names "$REPO_NAME-alb" \
  --region "$AWS_REGION" \
  --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "")

set_variable AWS_REGION "$AWS_REGION"
[[ -n "$SERVICE_URL" && "$SERVICE_URL" != "None" ]] && set_variable API_SERVICE_URL "http://$SERVICE_URL"

cat <<SUMMARY
✅ GitHub repository secrets configured for $GITHUB_REPO
Secrets:
  - AWS_BACKEND_ROLE_ARN
  - ECR_API_REPO
  - ECS_CLUSTER
  - ECS_SERVICE
  - AWS_FRONTEND_ROLE_ARN
  - S3_STAGING_BUCKET
  - S3_PRODUCTION_BUCKET
  - CF_STAGING_DISTRIBUTION
  - CF_PRODUCTION_DISTRIBUTION
  - AWS_REGION
Variables:
  - AWS_REGION
  - API_SERVICE_URL (if ALB DNS detected)
SUMMARY