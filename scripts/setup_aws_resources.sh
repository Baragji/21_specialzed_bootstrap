#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:?Usage: $0 <repo-name> <github-org/repo> <aws-region>}"
GITHUB_REPO="${2:?Usage: $0 <repo-name> <github-org/repo> <aws-region>}"
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

command -v aws >/dev/null || fatal "AWS CLI required"
command -v jq >/dev/null || fatal "jq required"
aws sts get-caller-identity --output text --region "$AWS_REGION" >/dev/null || fatal "AWS CLI not authenticated"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

log "Setting up AWS resources for $REPO_NAME in region $AWS_REGION (Account: $ACCOUNT_ID)"

echo "${AWS_REGION}" >"/tmp/${REPO_NAME}-aws-region"

ensure_ecr_repository() {
  local repository_name="$REPO_NAME/api"
  if aws ecr describe-repositories --repository-names "$repository_name" --region "$AWS_REGION" >/dev/null 2>&1; then
    log "ECR repository $repository_name already exists"
  else
    log "Creating ECR repository $repository_name"
    aws ecr create-repository \
      --repository-name "$repository_name" \
      --region "$AWS_REGION" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 >/dev/null
  fi
}

ensure_bucket() {
  local bucket_name="$1"
  local website_index="${2:-index.html}"
  local website_error="${3:-error.html}"

  if aws s3api head-bucket --bucket "$bucket_name" >/dev/null 2>&1; then
    log "S3 bucket $bucket_name already exists"
  else
    log "Creating S3 bucket $bucket_name"
    if [[ "$AWS_REGION" == "us-east-1" ]]; then
      aws s3api create-bucket --bucket "$bucket_name" --region "$AWS_REGION" --acl private >/dev/null
    else
      aws s3api create-bucket \
        --bucket "$bucket_name" \
        --region "$AWS_REGION" \
        --acl private \
        --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
    fi
  fi

  log "Configuring public website hosting for $bucket_name"
  aws s3api put-public-access-block \
    --bucket "$bucket_name" \
    --region "$AWS_REGION" \
    --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false >/dev/null

  aws s3api put-bucket-versioning \
    --bucket "$bucket_name" \
    --region "$AWS_REGION" \
    --versioning-configuration Status=Enabled >/dev/null

  aws s3 website "s3://$bucket_name" --index-document "$website_index" --error-document "$website_error"

  local policy
  policy=$(jq -n --arg bucket "$bucket_name" '{
    Version: "2012-10-17",
    Statement: [{
      Sid: "PublicReadGetObject",
      Effect: "Allow",
      Principal: "*",
      Action: "s3:GetObject",
      Resource: "arn:aws:s3:::\($bucket)/*"
    }]
  }')
  aws s3api put-bucket-policy --bucket "$bucket_name" --policy "$policy" >/dev/null
}

website_endpoint() {
  local bucket="$1"
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    printf "%s.s3-website-us-east-1.amazonaws.com" "$bucket"
  else
    printf "%s.s3-website.%s.amazonaws.com" "$bucket" "$AWS_REGION"
  fi
}

ensure_distribution() {
  local environment="$1"
  local bucket_name="$REPO_NAME-$environment"
  local comment="$bucket_name"

  local existing
  existing=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$comment'].Id" --output text)
  if [[ -n "$existing" && "$existing" != "None" ]]; then
    log "CloudFront distribution for $environment already exists: $existing"
    printf "%s" "$existing"
    return 0
  fi

  local endpoint
  endpoint=$(website_endpoint "$bucket_name")

  local caller_reference="${bucket_name}-$(date +%s)"
  local config_file="$TMP_DIR/${environment}-distribution.json"

  jq -n \
    --arg caller "$caller_reference" \
    --arg comment "$comment" \
    --arg originId "$bucket_name" \
    --arg domain "$endpoint" \
    '{
      DistributionConfig: {
        CallerReference: $caller,
        Comment: $comment,
        Enabled: true,
        PriceClass: "PriceClass_100",
        Origins: {
          Quantity: 1,
          Items: [{
            Id: $originId,
            DomainName: $domain,
            CustomOriginConfig: {
              HTTPPort: 80,
              HTTPSPort: 443,
              OriginProtocolPolicy: "http-only",
              OriginSslProtocols: {
                Quantity: 3,
                Items: ["TLSv1", "TLSv1.1", "TLSv1.2"]
              }
            }
          }]
        },
        DefaultRootObject: "index.html",
        DefaultCacheBehavior: {
          TargetOriginId: $originId,
          ViewerProtocolPolicy: "redirect-to-https",
          AllowedMethods: {
            Quantity: 2,
            Items: ["GET", "HEAD"],
            CachedMethods: {
              Quantity: 2,
              Items: ["GET", "HEAD"]
            }
          },
          Compress: true,
          ForwardedValues: {
            QueryString: false,
            Cookies: { Forward: "none" }
          },
          MinTTL: 0,
          DefaultTTL: 86400,
          MaxTTL: 31536000
        }
      }
    }' >"$config_file"

  log "Creating CloudFront distribution for $environment"
  aws cloudfront create-distribution \
    --cli-input-json "file://$config_file" \
    --query 'Distribution.Id' \
    --output text
}

ensure_cluster() {
  local cluster_name="$REPO_NAME-cluster"
  local status
  status=$(aws ecs describe-clusters --clusters "$cluster_name" --region "$AWS_REGION" --query 'clusters[0].status' --output text 2>/dev/null || true)
  if [[ "$status" == "ACTIVE" ]]; then
    log "ECS cluster $cluster_name already exists"
  else
    log "Creating ECS cluster $cluster_name"
    aws ecs create-cluster --cluster-name "$cluster_name" --region "$AWS_REGION" >/dev/null
  fi
}

ensure_vpc_and_subnets() {
  local vpc_tag="$REPO_NAME-vpc"
  local vpc_id
  vpc_id=$(aws ec2 describe-vpcs \
    --region "$AWS_REGION" \
    --filters "Name=tag:Name,Values=$vpc_tag" \
    --query 'Vpcs[0].VpcId' \
    --output text)

  if [[ "$vpc_id" == "None" || -z "$vpc_id" ]]; then
    log "Creating VPC $vpc_tag"
    vpc_id=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region "$AWS_REGION" --query 'Vpc.VpcId' --output text)
    aws ec2 create-tags --resources "$vpc_id" --tags Key=Name,Value="$vpc_tag" --region "$AWS_REGION"
  else
    log "Using existing VPC $vpc_id"
  fi

  aws ec2 modify-vpc-attribute --vpc-id "$vpc_id" --enable-dns-hostnames --region "$AWS_REGION" >/dev/null
  aws ec2 modify-vpc-attribute --vpc-id "$vpc_id" --enable-dns-support --region "$AWS_REGION" >/dev/null

  local igw_id
  igw_id=$(aws ec2 describe-internet-gateways \
    --region "$AWS_REGION" \
    --filters "Name=attachment.vpc-id,Values=$vpc_id" \
    --query 'InternetGateways[0].InternetGatewayId' \
    --output text)
  if [[ "$igw_id" == "None" || -z "$igw_id" ]]; then
    log "Creating and attaching Internet Gateway"
    igw_id=$(aws ec2 create-internet-gateway --region "$AWS_REGION" --query 'InternetGateway.InternetGatewayId' --output text)
    aws ec2 attach-internet-gateway --internet-gateway-id "$igw_id" --vpc-id "$vpc_id" --region "$AWS_REGION"
  fi

  local rt_id
  rt_id=$(aws ec2 describe-route-tables \
    --region "$AWS_REGION" \
    --filters "Name=vpc-id,Values=$vpc_id" "Name=tag:Name,Values=$REPO_NAME-public-rt" \
    --query 'RouteTables[0].RouteTableId' \
    --output text)
  if [[ "$rt_id" == "None" || -z "$rt_id" ]]; then
    log "Creating public route table"
    rt_id=$(aws ec2 create-route-table --vpc-id "$vpc_id" --region "$AWS_REGION" --query 'RouteTable.RouteTableId' --output text)
    aws ec2 create-tags --resources "$rt_id" --tags Key=Name,Value="$REPO_NAME-public-rt" --region "$AWS_REGION"
    aws ec2 create-route --route-table-id "$rt_id" --destination-cidr-block 0.0.0.0/0 --gateway-id "$igw_id" --region "$AWS_REGION" >/dev/null
  else
    log "Public route table already exists"
    local has_route
    has_route=$(aws ec2 describe-route-tables --route-table-ids "$rt_id" --region "$AWS_REGION" --query 'RouteTables[0].Routes[?DestinationCidrBlock==`0.0.0.0/0`].GatewayId' --output text)
    if [[ -z "$has_route" || "$has_route" == "None" ]]; then
      aws ec2 create-route --route-table-id "$rt_id" --destination-cidr-block 0.0.0.0/0 --gateway-id "$igw_id" --region "$AWS_REGION" >/dev/null
    fi
  fi

  local az_output
  az_output=$(aws ec2 describe-availability-zones --region "$AWS_REGION" --query 'AvailabilityZones[?State==`available`].ZoneName' --output text)
  read -ra AVAILABLE_AZS <<<"$az_output"
  if (( ${#AVAILABLE_AZS[@]} < 2 )); then
    fatal "Region $AWS_REGION has fewer than 2 available AZs"
  fi

  local subnet_ids=()
  local cidr_blocks=("10.0.1.0/24" "10.0.2.0/24")

  for i in 0 1; do
    local subnet_name="$REPO_NAME-public-$((i+1))"
    local az="${AVAILABLE_AZS[$i]}"
    local cidr="${cidr_blocks[$i]}"
    local subnet_id

    subnet_id=$(aws ec2 describe-subnets \
      --region "$AWS_REGION" \
      --filters "Name=vpc-id,Values=$vpc_id" "Name=tag:Name,Values=$subnet_name" \
      --query 'Subnets[0].SubnetId' --output text)

    if [[ "$subnet_id" == "None" || -z "$subnet_id" ]]; then
      log "Creating subnet $subnet_name in $az"
      subnet_id=$(aws ec2 create-subnet \
        --vpc-id "$vpc_id" \
        --cidr-block "$cidr" \
        --availability-zone "$az" \
        --region "$AWS_REGION" \
        --query 'Subnet.SubnetId' --output text)
      aws ec2 create-tags --resources "$subnet_id" --tags Key=Name,Value="$subnet_name" --region "$AWS_REGION"
    else
      log "Using existing subnet $subnet_name ($subnet_id)"
    fi

    aws ec2 modify-subnet-attribute --subnet-id "$subnet_id" --map-public-ip-on-launch --region "$AWS_REGION" >/dev/null
    aws ec2 associate-route-table --subnet-id "$subnet_id" --route-table-id "$rt_id" --region "$AWS_REGION" >/dev/null

    subnet_ids+=("$subnet_id")
  done

  printf "%s" "$vpc_id"
  SUBNET_IDS_JOINED=$(IFS=,; echo "${subnet_ids[*]}")
  echo "$SUBNET_IDS_JOINED" >"/tmp/${REPO_NAME}-subnet-ids"
  echo "$vpc_id" >"/tmp/${REPO_NAME}-vpc-id"

  log "VPC setup complete (VPC: $vpc_id, Subnets: ${subnet_ids[*]})"
}

ensure_roles() {
  local backend_role="$REPO_NAME-backend-role"
  local frontend_role="$REPO_NAME-frontend-role"

  local backend_trust
  backend_trust=$(jq -n \
    --arg account "$ACCOUNT_ID" \
    --arg repo "$GITHUB_REPO" '{
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: {
          Federated: ("arn:aws:iam::" + $account + ":oidc-provider/token.actions.githubusercontent.com")
        },
        Action: "sts:AssumeRoleWithWebIdentity",
        Condition: {
          StringEquals: {"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"},
          StringLike: {"token.actions.githubusercontent.com:sub": ("repo:" + $repo + ":ref:refs/heads/main")}
        }
      }]
    }')

  local backend_policy
  backend_policy=$(jq -n \
    --arg region "$AWS_REGION" \
    --arg account "$ACCOUNT_ID" \
    --arg repo "$REPO_NAME/api" \
    --arg cluster "$REPO_NAME-cluster" \
    --arg service "$REPO_NAME-service" '{
      Version: "2012-10-17",
      Statement: [
        {Effect: "Allow", Action: ["ecr:GetAuthorizationToken"], Resource: "*"},
        {Effect: "Allow", Action: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:CompleteLayerUpload",
          "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload",
          "ecr:ListImages",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ], Resource: ("arn:aws:ecr:" + $region + ":" + $account + ":repository/" + $repo)},
        {Effect: "Allow", Action: ["ecs:DescribeServices", "ecs:UpdateService"], Resource: ("arn:aws:ecs:" + $region + ":" + $account + ":service/" + $cluster + "/" + $service)},
        {Effect: "Allow", Action: ["ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"], Resource: "*"},
        {Effect: "Allow", Action: ["iam:PassRole"], Resource: ("arn:aws:iam::" + $account + ":role/ecsTaskExecutionRole")}
      ]
    }')

  local frontend_policy
  frontend_policy=$(jq -n --arg repo "$REPO_NAME" '{
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Action: ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      Resource: [
        "arn:aws:s3:::" + $repo + "-staging",
        "arn:aws:s3:::" + $repo + "-staging/*",
        "arn:aws:s3:::" + $repo + "-production",
        "arn:aws:s3:::" + $repo + "-production/*"
      ]
    },
    {
      Effect: "Allow",
      Action: ["cloudfront:CreateInvalidation"],
      Resource: "*"
    }]
  }')

  if aws iam get-role --role-name "$backend_role" >/dev/null 2>&1; then
    log "Updating backend role $backend_role"
    aws iam update-assume-role-policy --role-name "$backend_role" --policy-document "$backend_trust" >/dev/null
  else
    log "Creating backend role $backend_role"
    aws iam create-role --role-name "$backend_role" --assume-role-policy-document "$backend_trust" >/dev/null
  fi
  aws iam put-role-policy --role-name "$backend_role" --policy-name BackendPolicy --policy-document "$backend_policy" >/dev/null

  if aws iam get-role --role-name "$frontend_role" >/dev/null 2>&1; then
    log "Updating frontend role $frontend_role"
    aws iam update-assume-role-policy --role-name "$frontend_role" --policy-document "$backend_trust" >/dev/null
  else
    log "Creating frontend role $frontend_role"
    aws iam create-role --role-name "$frontend_role" --assume-role-policy-document "$backend_trust" >/dev/null
  fi
  aws iam put-role-policy --role-name "$frontend_role" --policy-name FrontendPolicy --policy-document "$frontend_policy" >/dev/null

  BACKEND_ROLE_ARN=$(aws iam get-role --role-name "$backend_role" --query 'Role.Arn' --output text)
  FRONTEND_ROLE_ARN=$(aws iam get-role --role-name "$frontend_role" --query 'Role.Arn' --output text)
}

ensure_ecr_repository
ensure_bucket "$REPO_NAME-staging"
ensure_bucket "$REPO_NAME-production"
STAGING_DIST_ID=$(ensure_distribution "staging")
PRODUCTION_DIST_ID=$(ensure_distribution "production")
ensure_cluster
VPC_ID=$(ensure_vpc_and_subnets)
ensure_roles

cat <<SUMMARY
✅ AWS resources provisioned

� ECR repository:
- $REPO_NAME/api

🪣 S3 buckets:
- $REPO_NAME-staging (website endpoint: $(website_endpoint "$REPO_NAME-staging"))
- $REPO_NAME-production (website endpoint: $(website_endpoint "$REPO_NAME-production"))

🌐 CloudFront distributions:
- Staging ID: $STAGING_DIST_ID
- Production ID: $PRODUCTION_DIST_ID

☁️ ECS cluster:
- $REPO_NAME-cluster

🕸️ Networking:
- VPC ID: $VPC_ID
- Public subnets (stored in /tmp/${REPO_NAME}-subnet-ids)

🔐 IAM role ARNs:
- Backend deploy role: $BACKEND_ROLE_ARN
- Frontend deploy role: $FRONTEND_ROLE_ARN

Next: run ./scripts/setup_ecs_service.sh $REPO_NAME $AWS_REGION
SUMMARY