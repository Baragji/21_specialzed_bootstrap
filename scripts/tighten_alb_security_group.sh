#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/tighten_alb_security_group.sh <alb-name> <aws-region> [allow-cidr]
# Example: ./scripts/tighten_alb_security_group.sh orchestrator-alb eu-north-1 0.0.0.0/0

ALB_NAME="${1:?ALB name required}"
AWS_REGION="${2:-eu-north-1}"
ALLOW_CIDR="${3:-0.0.0.0/0}"

export AWS_REGION
export AWS_DEFAULT_REGION="$AWS_REGION"

log() { printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"; }
fatal() { log "❌ $1"; exit 1; }

ALB_JSON=$(aws elbv2 describe-load-balancers --names "$ALB_NAME" --region "$AWS_REGION" --output json)
ALB_ARN=$(echo "$ALB_JSON" | jq -r '.LoadBalancers[0].LoadBalancerArn')
SG_ID=$(echo "$ALB_JSON" | jq -r '.LoadBalancers[0].SecurityGroups[0]')
[[ -z "$SG_ID" || "$SG_ID" == "null" ]] && fatal "Could not determine ALB Security Group"

log "Ensuring inbound rules 80/443 from $ALLOW_CIDR on $SG_ID"

# Idempotently authorize 80
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --ip-permissions \
'[{"IpProtocol":"tcp","FromPort":80,"ToPort":80,"IpRanges":[{"CidrIp":"'"$ALLOW_CIDR"'"}]}]' \
--region "$AWS_REGION" 2>/dev/null || true

# Idempotently authorize 443
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --ip-permissions \
'[{"IpProtocol":"tcp","FromPort":443,"ToPort":443,"IpRanges":[{"CidrIp":"'"$ALLOW_CIDR"'"}]}]' \
--region "$AWS_REGION" 2>/dev/null || true

log "✅ Security group $SG_ID ingress ensured for 80/443"
