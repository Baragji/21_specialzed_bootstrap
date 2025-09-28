# Bootstrap: Copilot Coding Agent + Production Gates

## What you get
- Autonomous **issue → plan → code → test → PR** via **GitHub Copilot – Coding Agent**
- Security: **CodeQL** scanning blocks high/critical
- Supply-chain: **CycloneDX SBOMs** + **SLSA provenance** on every PR build
- Quality bars: **coverage ≥98%**, **mutation ≥60%**
- Deploy: API to **ECS Fargate**, Web to **S3+CloudFront** using **OIDC** (no long-lived keys)

## Repo layout (assumed)
- `services/api` — Node/TypeScript API (`npm run build`, `npm test`)
- `web` — React app (`npm run build`, `npm test`)

## Run order
1. Configure secrets (see below)
2. Set up AWS OIDC trust & IAM (see below)
3. `./scripts/setup_branch_protection.sh your-org/your-repo`
4. Create an issue using **Agent Task** template and assign to **@copilot**

## Required repo secrets
- **AWS / Backend**: `AWS_BACKEND_ROLE_ARN`, `ECR_API_REPO`, `ECS_CLUSTER`, `ECS_SERVICE`, `AWS_REGION` (optional, defaults `eu-central-1`)
- **AWS / Frontend**: `AWS_FRONTEND_ROLE_ARN`, `S3_STAGING_BUCKET`, `S3_PRODUCTION_BUCKET`, `CF_STAGING_DISTRIBUTION`, `CF_PRODUCTION_DISTRIBUTION`

## IAM (minimum policy)
- Backend role needs: `ecr:*` (push/pull for target repo), `ecs:UpdateService`, `ecs:Describe*`, `logs:CreateLogStream/PutLogEvents` (if needed)
- Frontend role needs: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` for target bucket(s); `cloudfront:CreateInvalidation`

Trust both roles to `token.actions.githubusercontent.com` with condition on `sub` = `repo:your-org/your-repo:ref:refs/heads/main`.

## Developer commands (API/Web)
- Install: `npm ci`
- Build: `npm run build`
- Test (coverage): `npm test -- --coverage`
- Mutation: `npx stryker run`
