Awesome — here’s your **ready-to-commit bootstrap package** for a **Node.js/TypeScript (API) + React (web)** SaaS on **AWS** with **GitHub Copilot – Coding Agent** and production-grade gates. Copy these files into your repo exactly as-path. Then follow the “Post-commit setup” at the end.

---

## 📦 Files to add (verbatim)

### 1) Agent task template

**.github/ISSUE_TEMPLATE/agent_task.yml**

```yaml
name: Agent Task
description: Atomic, bounded task for GitHub Copilot – Coding Agent
labels: [ai-task]
body:
  - type: input
    id: objective
    attributes: { label: Objective, placeholder: "Add rate limiter to /v1/api..." }
    validations: { required: true }
  - type: textarea
    id: constraints
    attributes:
      label: Constraints
      description: "Touched paths only; forbidden areas; time/cost caps"
      value: |
        ALLOWED_PATHS: ["services/api/**","web/**","tests/**"]
        FORBIDDEN_PATHS: ["infra/**","migrations/**"]
        TIME_CAP_MIN: 30
        COST_CAP_USD: 1.50
  - type: textarea
    id: test_spec
    attributes:
      label: Test expectations
      value: |
        - Unit tests cover new branches
        - Integration tests for API endpoints touched
        - Keep public APIs backward compatible
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      value: |
        - All required checks green (test, codeql, sbom, provenance, coverage, mutation)
        - PR description lists files changed + rationale
```

---

### 2) Copilot agent instructions (shown in Agents panel)

**.github/copilot/instructions.md**

```markdown
# Repo instructions for GitHub Copilot – Coding Agent

## Scope & boundaries
- Only edit files under: `services/api/**`, `web/**`, `tests/**`
- Do NOT modify: `infra/**`, `migrations/**`, deployment workflows

## Task execution contract
1. Create a plan and list impacted files.
2. Implement minimal changes to meet the objective.
3. Write/adjust unit tests (Jest) and integration tests where applicable.
4. Run the CI job locally in the Actions VM; ensure tests pass.
5. Open a PR with:
   - Summary of changes
   - Test evidence and commands used
   - Risks & rollback note

## Quality gates
- Unit coverage ≥ 98% (repo-wide), mutation score ≥ 60% on changed modules
- No high/critical CodeQL findings
- SBOM (CycloneDX) + SLSA provenance emitted by CI
```

---

### 3) CodeQL (security scanning)

**.github/workflows/codeql.yml**

```yaml
name: codeql
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
permissions:
  contents: read
  security-events: write
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
```

---

### 4) CI: tests, coverage gate, mutation testing, SBOM & SLSA provenance

**.github/workflows/ci.yml**

```yaml
name: test
on:
  pull_request: { branches: [main] }
  push: { branches: [main] }

env:
  NODE_VERSION: '20'
  API_DIR: services/api
  WEB_DIR: web

permissions:
  contents: read
  id-token: write         # for provenance + OIDC
  attestations: write
  actions: read

jobs:
  api-web-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # ---------- API ----------
      - name: Setup Node (API)
        uses: actions/setup-node@v4
        with: { node-version: ${{ env.NODE_VERSION }} }
      - name: Install API deps
        working-directory: ${{ env.API_DIR }}
        run: npm ci
      - name: Build API
        working-directory: ${{ env.API_DIR }}
        run: npm run build --if-present
      - name: Test API (with coverage)
        working-directory: ${{ env.API_DIR }}
        run: npm run test -- --ci --runInBand --coverage
      - name: Enforce API coverage ≥ 98%
        working-directory: ${{ env.API_DIR }}
        run: |
          THRESH=0.98
          ACTUAL=$(node -e "console.log(require('./coverage/coverage-summary.json').total.lines.pct/100)")
          awk -v a="$ACTUAL" -v t="$THRESH" 'BEGIN{exit !(a>=t)}' || \
            { echo "Coverage below threshold: $ACTUAL < $THRESH"; exit 1; }
      - name: API mutation testing (≥60%)
        working-directory: ${{ env.API_DIR }}
        run: npx stryker run

      # ---------- WEB ----------
      - name: Install Web deps
        working-directory: ${{ env.WEB_DIR }}
        run: npm ci
      - name: Build Web
        working-directory: ${{ env.WEB_DIR }}
        run: npm run build --if-present
      - name: Test Web (with coverage)
        working-directory: ${{ env.WEB_DIR }}
        run: npm run test -- --ci --runInBand --coverage
      - name: Enforce Web coverage ≥ 98%
        working-directory: ${{ env.WEB_DIR }}
        run: |
          THRESH=0.98
          ACTUAL=$(node -e "console.log(require('./coverage/coverage-summary.json').total.lines.pct/100)")
          awk -v a="$ACTUAL" -v t="$THRESH" 'BEGIN{exit !(a>=t)}' || \
            { echo "Coverage below threshold: $ACTUAL < $THRESH"; exit 1; }
      - name: Web mutation testing (≥60%)
        working-directory: ${{ env.WEB_DIR }}
        run: npx stryker run

      # ---------- SBOM (both projects) ----------
      - name: Generate CycloneDX SBOM (API)
        uses: CycloneDX/gh-node-module-generatebom@v3
        with:
          path: ${{ env.API_DIR }}
          output: '${{ env.API_DIR }}/sbom-api.cdx.json'
      - name: Generate CycloneDX SBOM (Web)
        uses: CycloneDX/gh-node-module-generatebom@v3
        with:
          path: ${{ env.WEB_DIR }}
          output: '${{ env.WEB_DIR }}/sbom-web.cdx.json'
      - name: Upload SBOM artifacts
        uses: actions/upload-artifact@v4
        with:
          name: sboms
          path: |
            ${{ env.API_DIR }}/sbom-api.cdx.json
            ${{ env.WEB_DIR }}/sbom-web.cdx.json

      # ---------- SLSA provenance ----------
      - name: Attest build provenance (API)
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: '${{ env.API_DIR }}/dist/**'
      - name: Attest build provenance (Web)
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: '${{ env.WEB_DIR }}/build/**'
```

---

### 5) Deploy API to ECS Fargate (OIDC, ECR image push, service update)

**.github/workflows/deploy-backend.yml**

```yaml
name: deploy-backend
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'services/api/**'
      - '.github/workflows/deploy-backend.yml'

env:
  AWS_REGION: eu-central-1
  API_DIR: services/api
  IMAGE_TAG: ${{ github.sha }}

permissions:
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Login to AWS via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_BACKEND_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Log in to Amazon ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build API image
        working-directory: ${{ env.API_DIR }}
        run: |
          docker build -t ${{ steps.ecr.outputs.registry }}/${{ secrets.ECR_API_REPO }}:${{ env.IMAGE_TAG }} -f Dockerfile.api .
      - name: Push API image
        run: |
          docker push ${{ steps.ecr.outputs.registry }}/${{ secrets.ECR_API_REPO }}:${{ env.IMAGE_TAG }}

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ secrets.ECS_CLUSTER }} \
            --service ${{ secrets.ECS_SERVICE }} \
            --force-new-deployment \
            --region ${{ env.AWS_REGION }}

      - name: Wait for service stability
        run: |
          aws ecs wait services-stable --cluster ${{ secrets.ECS_CLUSTER }} --services ${{ secrets.ECS_SERVICE }}
```

---

### 6) Deploy Web to S3 + CloudFront (staging & prod), with invalidation

**.github/workflows/deploy-frontend.yml**

```yaml
name: deploy-frontend
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'staging or production'
        required: true
        default: 'staging'
  push:
    branches: [main]
    paths:
      - 'web/**'
      - '.github/workflows/deploy-frontend.yml'

env:
  AWS_REGION: eu-central-1
  WEB_DIR: web

permissions:
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Install & build web
        working-directory: ${{ env.WEB_DIR }}
        run: |
          npm ci
          npm run build

      - name: Login to AWS via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_FRONTEND_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Select environment
        id: envsel
        run: |
          if [ "${{ github.event.inputs.environment || 'staging' }}" = "production" ]; then
            echo "bucket=${{ secrets.S3_PRODUCTION_BUCKET }}" >> $GITHUB_OUTPUT
            echo "cf=${{ secrets.CF_PRODUCTION_DISTRIBUTION }}" >> $GITHUB_OUTPUT
          else
            echo "bucket=${{ secrets.S3_STAGING_BUCKET }}" >> $GITHUB_OUTPUT
            echo "cf=${{ secrets.CF_STAGING_DISTRIBUTION }}" >> $GITHUB_OUTPUT
          fi

      - name: Sync to S3
        run: |
          aws s3 sync "${{ env.WEB_DIR }}/build" "s3://${{ steps.envsel.outputs.bucket }}/" --delete
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation --distribution-id "${{ steps.envsel.outputs.cf }}" --paths "/*"
```

---

### 7) Branch protection bootstrap (run once)

**scripts/setup_branch_protection.sh**

```bash
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
```

---

### 8) Jest config (ensures coverage files exist for the CI gate)

**jest.config.ci.js** (copy into both `services/api/` and `web/` or import)

```js
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json-summary','text','lcov'],
  coverageThreshold: {
    global: { lines: 98, statements: 98, functions: 98, branches: 90 }
  }
};
```

---

### 9) Stryker (mutation testing) config

**services/api/stryker.conf.json**

```json
{
  "testRunner": "jest",
  "jest": { "configFile": "jest.config.ci.js" },
  "reporters": ["progress", "html"],
  "mutate": ["src/**/*.ts"],
  "ignorePatterns": ["dist/**", "node_modules/**"],
  "thresholds": { "high": 70, "low": 60, "break": 60 }
}
```

**web/stryker.conf.json**

```json
{
  "testRunner": "jest",
  "jest": { "configFile": "jest.config.ci.js" },
  "reporters": ["progress", "html"],
  "mutate": ["src/**/*.{ts,tsx}"],
  "ignorePatterns": ["build/**", "node_modules/**"],
  "thresholds": { "high": 70, "low": 60, "break": 60 }
}
```

---

### 10) Minimal Dockerfiles (ECS deploy expects images)

**services/api/Dockerfile.api**

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node","dist/server.js"]
```

**web/Dockerfile.web** *(optional; we deploy static to S3/CF, but keep for local use)*

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

---

### 11) Node version pin & .gitignore

**.nvmrc**

```
v20
```

**.gitignore** (append if you already have one)

```
# build artifacts
dist/
build/
coverage/
*.lcov
stryker-report/
sbom*.json
```

---

### 12) Bootstrap README for your team

**README-BOOTSTRAP.md**

```markdown
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
```

---

## 🔧 Post-commit setup (one-time)

1. **Create AWS OIDC roles**

* `AWS_BACKEND_ROLE_ARN` (ECS/ECR perms) and `AWS_FRONTEND_ROLE_ARN` (S3/CloudFront perms)
* Trust policy: federate `token.actions.githubusercontent.com`, condition on `aud=sts.amazonaws.com` and your repo `sub`.

2. **Create ECR repo** for API image; set secret `ECR_API_REPO` (e.g., `my-saas/api`), and ECS **cluster/service** names.

3. **Create S3 buckets & CloudFront dists** for web (staging & prod); set the four frontend secrets.

4. **Apply branch protection**

```bash
chmod +x scripts/setup_branch_protection.sh
./scripts/setup_branch_protection.sh your-org/your-repo
```

5. **Smoke test the agent**

* Open an issue via **Agent Task** template with a trivial change.
* Assign to **@copilot** (Agents panel).
* Ensure the PR opens and all checks pass (including CodeQL, SBOM, provenance, coverage, mutation).

---

If you want this as a **single patch file** (so your AI dev can apply with `git am`), say the word and I’ll output it inline.
