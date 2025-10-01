#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup_alb_https.sh <alb-name> <hosted-zone-id> <domain-name> <aws-region>
# Example: ./scripts/setup_alb_https.sh orchestrator-alb Z123456ABCDEFG orchestrator.example.com eu-north-1

ALB_NAME="${1:?ALB name required}"
HOSTED_ZONE_ID="${2:-}"
DOMAIN_NAME="${3:-}"
AWS_REGION="${4:-eu-north-1}"

export AWS_REGION
export AWS_DEFAULT_REGION="$AWS_REGION"

log() { printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"; }
fatal() { log "❌ $1"; exit 1; }

command -v aws >/dev/null || fatal "AWS CLI required"
command -v jq >/dev/null || fatal "jq required"

ALB_ARN=$(aws elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].LoadBalancerArn' --output text)
[[ -z "$ALB_ARN" || "$ALB_ARN" == "None" ]] && fatal "ALB $ALB_NAME not found"

LISTENERS_JSON=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN")
HAS_HTTPS=$(echo "$LISTENERS_JSON" | jq -r '.Listeners[] | select(.Port==443) | .ListenerArn' | wc -l | tr -d ' ')

if [[ -z "$DOMAIN_NAME" || -z "$HOSTED_ZONE_ID" ]]; then
  log "No domain/zone provided. Skipping ACM/HTTPS setup. You can still use HTTP on port 80."
  exit 0
fi

# Request or find ACM certificate
CERT_ARN=$(aws acm list-certificates --query 'CertificateSummaryList[?DomainName==`'"$DOMAIN_NAME"'`].CertificateArn' --output text --region "$AWS_REGION" | head -n 1 || true)
if [[ -z "$CERT_ARN" || "$CERT_ARN" == "None" ]]; then
  log "Requesting ACM certificate for $DOMAIN_NAME"
  CERT_ARN=$(aws acm request-certificate \
    --domain-name "$DOMAIN_NAME" \
    --validation-method DNS \
    --query CertificateArn \
    --output text \
    --region "$AWS_REGION")

  # Create DNS validation records
  for rec in $(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$AWS_REGION" \
      --query 'Certificate.DomainValidationOptions[].ResourceRecord' --output json | jq -c '.[]'); do
    NAME=$(echo "$rec" | jq -r '.Name')
    TYPE=$(echo "$rec" | jq -r '.Type')
    VALUE=$(echo "$rec" | jq -r '.Value')
    CHANGE_BATCH=$(jq -n --arg name "$NAME" --arg type "$TYPE" --arg value "$VALUE" '{
      Changes: [{
        Action: "UPSERT",
        ResourceRecordSet: {Name: $name, Type: $type, TTL: 300, ResourceRecords: [{Value: $value}]}
      }]
    }')
    log "Upserting DNS validation record $NAME"
    aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "$CHANGE_BATCH" >/dev/null
  done

  log "Waiting for certificate validation (this can take a few minutes)"
  aws acm wait certificate-validated --certificate-arn "$CERT_ARN" --region "$AWS_REGION"
fi

log "Using certificate: $CERT_ARN"

if [[ "$HAS_HTTPS" -eq 0 ]]; then
  # Find default target group from HTTP listener
  TG_ARN=$(echo "$LISTENERS_JSON" | jq -r '.Listeners[] | select(.Port==80) | .DefaultActions[0].ForwardConfig.TargetGroups[0].TargetGroupArn')
  [[ -z "$TG_ARN" || "$TG_ARN" == "null" ]] && fatal "No target group found on port 80 listener"

  log "Creating 443 listener with SSL"
  aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn="$CERT_ARN" \
    --default-actions Type=forward,TargetGroupArn="$TG_ARN" >/dev/null

  # Add HTTP->HTTPS redirect rule on port 80 listener
  HTTP_LISTENER_ARN=$(echo "$LISTENERS_JSON" | jq -r '.Listeners[] | select(.Port==80) | .ListenerArn')
  log "Updating HTTP listener to redirect to HTTPS"
  aws elbv2 modify-listener \
    --listener-arn "$HTTP_LISTENER_ARN" \
    --default-actions Type=redirect,RedirectConfig='{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}' >/dev/null
else
  log "443 listener already present; skipping"
fi

log "✅ HTTPS setup complete for $DOMAIN_NAME"
