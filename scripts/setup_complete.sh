#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:?Usage: $0 <repo-name> <github-org/repo> <aws-region>}"
GITHUB_REPO="${2:?Usage: $0 <repo-name> <github-org/repo> <aws-region>}"
AWS_REGION="${3:-eu-north-1}"

export AWS_REGION
export AWS_DEFAULT_REGION="$AWS_REGION"

echo "🚀 Setting up complete AWS infrastructure for $REPO_NAME"
echo "GitHub Repository: $GITHUB_REPO"
echo "AWS Region: $AWS_REGION"
echo ""

# Validate prerequisites
echo "Checking prerequisites..."
command -v aws >/dev/null || { echo "❌ AWS CLI required"; exit 1; }
command -v gh >/dev/null || { echo "❌ GitHub CLI required"; exit 1; }
command -v jq >/dev/null || { echo "❌ jq required"; exit 1; }
aws sts get-caller-identity --output text >/dev/null || { echo "❌ AWS CLI not authenticated"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "❌ GitHub CLI not authenticated"; exit 1; }
echo "✅ Prerequisites validated"

# Make scripts executable
chmod +x scripts/*.sh

# Track failures
FAILED_STEPS=()

# 1. Setup OIDC provider
echo ""
echo "Step 1/5: Setting up OIDC provider..."
if ./scripts/setup_oidc_provider.sh; then
  echo "✅ OIDC provider setup complete"
else
  echo "❌ OIDC provider setup failed"
  FAILED_STEPS+=("OIDC provider")
fi

# 2. Create AWS resources
echo ""
echo "Step 2/5: Creating AWS resources..."
if ./scripts/setup_aws_resources.sh "$REPO_NAME" "$GITHUB_REPO" "$AWS_REGION"; then
  echo "✅ AWS resources created"
else
  echo "❌ AWS resources creation failed"
  FAILED_STEPS+=("AWS resources")
fi

# 3. Create ECS service
echo ""
echo "Step 3/5: Creating ECS service..."
if ./scripts/setup_ecs_service.sh "$REPO_NAME" "$AWS_REGION"; then
  echo "✅ ECS service created"
else
  echo "❌ ECS service creation failed"
  FAILED_STEPS+=("ECS service")
fi

# 4. Set GitHub secrets
echo ""
echo "Step 4/5: Setting GitHub secrets..."
if ./scripts/setup_github_secrets.sh "$GITHUB_REPO" "$REPO_NAME" "$AWS_REGION"; then
  echo "✅ GitHub secrets configured"
else
  echo "❌ GitHub secrets configuration failed"
  FAILED_STEPS+=("GitHub secrets")
fi

# 5. Apply branch protection
echo ""
echo "Step 5/5: Applying branch protection..."
if ./scripts/setup_branch_protection.sh "$GITHUB_REPO"; then
  echo "✅ Branch protection applied"
else
  echo "❌ Branch protection failed"
  FAILED_STEPS+=("Branch protection")
fi

echo ""
if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
  echo "✅ Complete setup finished successfully!"
  echo ""
  echo "🎯 Next steps:"
  echo "1. Push your code to trigger the first CI run"
  echo "2. Create an issue using the 'Agent Task' template"
  echo "3. Assign the issue to @copilot to start autonomous development"
  echo ""
  echo "📊 Monitor your setup:"
  echo "- GitHub Actions: https://github.com/$GITHUB_REPO/actions"
  echo "- AWS ECS: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters"
  echo "- AWS ECR: https://console.aws.amazon.com/ecr/repositories?region=$AWS_REGION"
else
  echo "❌ Setup completed with failures in: ${FAILED_STEPS[*]}"
  echo ""
  echo "🔧 Troubleshooting:"
  echo "- Check AWS CLI permissions for IAM, ECS, ECR, S3, CloudFront, EC2"
  echo "- Verify GitHub CLI has repo admin access"
  echo "- Review error messages above for specific issues"
  echo "- Re-run individual scripts after fixing issues"
  exit 1
fi