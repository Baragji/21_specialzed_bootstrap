#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:?Usage: $0 <repo-name> <aws-region>}"
AWS_REGION="${2:-eu-north-1}"

export AWS_REGION
export AWS_DEFAULT_REGION="$AWS_REGION"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

log() {
  printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

fatal() {
  log "❌ $1"
  exit 1
}

command -v aws >/dev/null || fatal "AWS CLI required"
command -v jq >/dev/null || fatal "jq required"
aws sts get-caller-identity --output text --region "$AWS_REGION" >/dev/null || fatal "AWS CLI not authenticated"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")
CLUSTER_NAME="$REPO_NAME-cluster"
SERVICE_NAME="$REPO_NAME-service"
TASK_FAMILY="$REPO_NAME-api"

log "Setting up ECS service $SERVICE_NAME in cluster $CLUSTER_NAME (region $AWS_REGION)"

REGION_FILE="/tmp/${REPO_NAME}-aws-region"
if [[ -f "$REGION_FILE" ]]; then
  STORED_REGION=$(cat "$REGION_FILE")
  if [[ "$STORED_REGION" != "$AWS_REGION" ]]; then
    fatal "Region mismatch: resources were provisioned in $STORED_REGION but current region is $AWS_REGION"
  fi
fi

read_tmp_or_discover() {
  local file_path="$1"
  local discover_cmd="$2"
  if [[ -f "$file_path" ]]; then
    cat "$file_path"
  else
    eval "$discover_cmd"
  fi
}

VPC_ID=$(read_tmp_or_discover \
  "/tmp/${REPO_NAME}-vpc-id" \
  "aws ec2 describe-vpcs --region '$AWS_REGION' --filters Name=tag:Name,Values='$REPO_NAME-vpc' --query 'Vpcs[0].VpcId' --output text")

[[ -n "$VPC_ID" && "$VPC_ID" != "None" ]] || fatal "Unable to locate VPC for $REPO_NAME"

SUBNET_IDS=$(read_tmp_or_discover \
  "/tmp/${REPO_NAME}-subnet-ids" \
  "aws ec2 describe-subnets --region '$AWS_REGION' --filters Name=vpc-id,Values='$VPC_ID' Name=tag:Name,Values='$REPO_NAME-public-*' --query 'Subnets[].SubnetId' --output text | tr '\t' ','")

[[ -n "$SUBNET_IDS" ]] || fatal "No subnets found for $REPO_NAME"

IFS=',' read -ra SUBNET_ARRAY <<<"$SUBNET_IDS"
if (( ${#SUBNET_ARRAY[@]} < 2 )); then
  fatal "At least two public subnets are required; found ${#SUBNET_ARRAY[@]}"
fi

create_or_get_sg() {
  local sg_name="$1"
  local description="$2"
  local sg_id
  sg_id=$(aws ec2 describe-security-groups \
    --region "$AWS_REGION" \
    --filters Name=vpc-id,Values="$VPC_ID" Name=group-name,Values="$sg_name" \
    --query 'SecurityGroups[0].GroupId' --output text)
  if [[ -z "$sg_id" || "$sg_id" == "None" ]]; then
    log "Creating security group $sg_name"
    sg_id=$(aws ec2 create-security-group \
      --group-name "$sg_name" \
      --description "$description" \
      --vpc-id "$VPC_ID" \
      --region "$AWS_REGION" \
      --query 'GroupId' --output text)
  else
    log "Using existing security group $sg_name ($sg_id)"
  fi
  printf "%s" "$sg_id"
}

API_SG_ID=$(create_or_get_sg "$REPO_NAME-api-sg" "Security group for $REPO_NAME ECS tasks")
ALB_SG_ID=$(create_or_get_sg "$REPO_NAME-alb-sg" "Security group for $REPO_NAME Application Load Balancer")

log "Configuring security group ingress rules"
aws ec2 authorize-security-group-ingress \
  --group-id "$ALB_SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 \
  --region "$AWS_REGION" >/dev/null 2>&1 || log "ALB HTTP rule already present"
aws ec2 authorize-security-group-ingress \
  --group-id "$ALB_SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 \
  --region "$AWS_REGION" >/dev/null 2>&1 || log "ALB HTTPS rule already present"
aws ec2 authorize-security-group-ingress \
  --group-id "$API_SG_ID" --protocol tcp --port 3000 --source-group "$ALB_SG_ID" \
  --region "$AWS_REGION" >/dev/null 2>&1 || log "API SG already allows ALB ingress"

log "Ensuring CloudWatch log group exists"
aws logs create-log-group --log-group-name "/ecs/$REPO_NAME-api" --region "$AWS_REGION" >/dev/null 2>&1 || log "Log group already exists"

log "Resolving Application Load Balancer"
LB_ARN=$(aws elbv2 describe-load-balancers --names "$REPO_NAME-alb" --region "$AWS_REGION" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || true)
if [[ -z "$LB_ARN" || "$LB_ARN" == "None" ]]; then
  LB_ARN=$(aws elbv2 create-load-balancer \
    --name "$REPO_NAME-alb" \
    --subnets "${SUBNET_ARRAY[@]}" \
    --security-groups "$ALB_SG_ID" \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --region "$AWS_REGION" \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text)
  log "Created ALB $LB_ARN"
else
  log "Using existing ALB $LB_ARN"
fi

log "Ensuring target group"
TG_ARN=$(aws elbv2 describe-target-groups --names "$REPO_NAME-tg" --region "$AWS_REGION" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)
if [[ -z "$TG_ARN" || "$TG_ARN" == "None" ]]; then
  TG_ARN=$(aws elbv2 create-target-group \
    --name "$REPO_NAME-tg" \
    --protocol HTTP \
    --port 3000 \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region "$AWS_REGION" \
    --query 'TargetGroups[0].TargetGroupArn' --output text)
  log "Created target group $TG_ARN"
else
  log "Using existing target group $TG_ARN"
fi

log "Ensuring HTTP listener"
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$LB_ARN" --region "$AWS_REGION" --query 'Listeners[?Port==`80`].ListenerArn' --output text 2>/dev/null || true)
if [[ -z "$LISTENER_ARN" || "$LISTENER_ARN" == "None" ]]; then
  LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn "$LB_ARN" \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn="$TG_ARN" \
    --region "$AWS_REGION" --query 'Listeners[0].ListenerArn' --output text)
  log "Created HTTP listener $LISTENER_ARN"
else
  log "HTTP listener already exists"
fi

log "Registering task definition"
CPU_UNITS=${CPU:-256}
MEMORY_MIB=${MEMORY:-512}
TASK_DEF_TEMPLATE="$TMP_DIR/task-def.json"

jq -n \
  --arg family "$TASK_FAMILY" \
  --arg taskRole "arn:aws:iam::$ACCOUNT_ID:role/$REPO_NAME-backend-role" \
  --arg executionRole "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole" \
  --arg image "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME/api:latest" \
  --arg logGroup "/ecs/$REPO_NAME-api" \
  --arg container "$REPO_NAME-api" \
  --arg awsRegion "$AWS_REGION" \
  --arg cpu "${CPU_UNITS}" \
  --arg memory "${MEMORY_MIB}" \
  ' {
      family: $family,
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: $cpu,
      memory: $memory,
      executionRoleArn: $executionRole,
      taskRoleArn: $taskRole,
      containerDefinitions: [{
        name: $container,
        image: $image,
        portMappings: [{containerPort: 3000, protocol: "tcp"}],
        essential: true,
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": $logGroup,
            "awslogs-region": $awsRegion,
            "awslogs-stream-prefix": "ecs"
          }
        },
        healthCheck: {
          command: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
          interval: 30,
          timeout: 5,
          retries: 3,
          startPeriod: 60
        }
      }]
    }' >"$TASK_DEF_TEMPLATE"

TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json "file://$TASK_DEF_TEMPLATE" \
  --region "$AWS_REGION" \
  --query 'taskDefinition.taskDefinitionArn' --output text)

log "Task definition registered: $TASK_DEF_ARN"

SERVICE_STATUS=$(aws ecs describe-services \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME" \
  --region "$AWS_REGION" \
  --query 'services[0].status' --output text 2>/dev/null || true)

NETWORK_SUBNETS=$(IFS=,; printf "%s" "${SUBNET_ARRAY[*]}")

if [[ "$SERVICE_STATUS" == "ACTIVE" || "$SERVICE_STATUS" == "DRAINING" ]]; then
  log "Updating ECS service $SERVICE_NAME"
  aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$SERVICE_NAME" \
    --task-definition "$TASK_DEF_ARN" \
    --desired-count 1 \
    --force-new-deployment \
    --region "$AWS_REGION" >/dev/null
else
  log "Creating ECS service $SERVICE_NAME"
  aws ecs create-service \
    --cluster "$CLUSTER_NAME" \
    --service-name "$SERVICE_NAME" \
    --task-definition "$TASK_DEF_ARN" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$NETWORK_SUBNETS],securityGroups=[$API_SG_ID],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=$REPO_NAME-api,containerPort=3000" \
    --region "$AWS_REGION" >/dev/null
fi

ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns "$LB_ARN" --region "$AWS_REGION" --query 'LoadBalancers[0].DNSName' --output text)

cat <<SUMMARY
✅ ECS service provisioned
Cluster: $CLUSTER_NAME
Service: $SERVICE_NAME
Task definition: $TASK_DEF_ARN
Load balancer DNS: http://$ALB_DNS
Security groups:
  - ALB: $ALB_SG_ID
  - Service: $API_SG_ID
Subnets: ${SUBNET_ARRAY[*]}
SUMMARY