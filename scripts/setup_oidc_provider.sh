#!/usr/bin/env bash
set -euo pipefail

echo "Setting up GitHub OIDC provider..."

# Check if OIDC provider already exists
PROVIDER_ARN=$(aws iam list-open-id-connect-providers --query 'OpenIDConnectProviderList[?ends_with(Arn, `token.actions.githubusercontent.com`)].Arn' --output text)

if [ -z "$PROVIDER_ARN" ]; then
  echo "Creating GitHub OIDC provider..."
  
  # Get GitHub's OIDC thumbprint
  THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"
  
  # Create OIDC provider
  PROVIDER_ARN=$(aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list "$THUMBPRINT" \
    --query 'OpenIDConnectProviderArn' --output text)
  
  echo "✅ OIDC provider created: $PROVIDER_ARN"
else
  echo "✅ OIDC provider already exists: $PROVIDER_ARN"
fi

# Create ecsTaskExecutionRole if it doesn't exist
if ! aws iam get-role --role-name ecsTaskExecutionRole >/dev/null 2>&1; then
  echo "Creating ecsTaskExecutionRole..."
  
  cat > /tmp/ecs-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

  aws iam create-role \
    --role-name ecsTaskExecutionRole \
    --assume-role-policy-document file:///tmp/ecs-trust-policy.json
  
  aws iam attach-role-policy \
    --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
  
  rm -f /tmp/ecs-trust-policy.json
  echo "✅ ecsTaskExecutionRole created"
else
  echo "✅ ecsTaskExecutionRole already exists"
fi