# Orchestrator Setup Guide - From Zero to Working

This guide walks you through setting up the orchestrator so you can call `POST /tasks` to create GitHub issues automatically.

## Current State ✅

You already have:
- ✅ Orchestrator service code (`services/orchestrator/`)
- ✅ Deploy workflow (`.github/workflows/deploy-orchestrator.yml`)
- ✅ AWS deployment secrets in GitHub Actions
- ✅ ECS cluster and service created

## What's Missing ❌

The **orchestrator container** needs GitHub App credentials to create issues. Right now those don't exist.

---

## Setup Steps (20 minutes)

### Step 1: Create a GitHub App (5 min)

This gives your orchestrator permission to create issues.

1. **Navigate**: GitHub org → Settings → Developer settings → GitHub Apps → **New GitHub App**

2. **Basic Info**:
   - **Name**: `21-specialized-orchestrator`
   - **Homepage URL**: `https://github.com/<your-org>/<this-repo>`
   - **Webhook URL**: Leave empty (add after deploying)
   - **Webhook secret**: Generate one:
     ```bash
     openssl rand -hex 32
     ```
     **Save this value!** You'll need it as `GITHUB_WEBHOOK_SECRET`

3. **Permissions** (Repository permissions):
   ```
   Issues:        Read and write ✅
   Pull requests: Read
   Checks:        Read
   Actions:       Read
   Contents:      Read
   Metadata:      Read
   ```

4. **Subscribe to events**:
   ```
   ✅ issues
   ✅ issue_comment
   ✅ pull_request
   ✅ check_run
   ✅ workflow_run
   ```

5. **Where can this app be installed?**: Only on this account

6. Click **Create GitHub App**

7. **After creation**:
   - **App ID**: Note the number at the top → save as `GITHUB_APP_ID`
   - **Generate a private key**: Click the button → downloads `<name>.YYYY-MM-DD.private-key.pem`
   - **Base64 encode** the key:
     ```bash
     base64 -i <downloaded-file>.pem | tr -d '\n'
     ```
     **Save this output!** You'll need it as `GITHUB_APP_PRIVATE_KEY`

8. **Install the app**: Left sidebar → "Install App" → pick your org → select this repository

---

### Step 2: Deploy the Orchestrator (5 min)

If you haven't deployed yet:

1. Go to **Actions** tab → **deploy-orchestrator** → **Run workflow**
2. Wait for it to complete (should take ~3 min)
3. Verify deployment:
   ```bash
   # Get the ALB DNS from ECS console or:
   aws elbv2 describe-load-balancers --region eu-central-1 --query 'LoadBalancers[0].DNSName' --output text
   ```
4. Test health endpoint:
   ```bash
   curl -s http://<alb-dns>/healthz
   # Should return: {"status":"ok"}
   ```

---

### Step 3: Add GitHub App Credentials to ECS (5 min)

Now give the running container the GitHub App credentials:

```bash
cd /Users/Yousef_1/Downloads/21_specialzed_bootstrap

# Export AWS credentials if not already configured
export AWS_REGION=eu-central-1
export ECS_CLUSTER=21-specialzed-bootstrap-cluster
export ECS_ORCHESTRATOR_SERVICE=21-specialzed-bootstrap-orchestrator-service

# Run the configuration script
./scripts/configure_orchestrator_env.sh \
  <GITHUB_APP_ID> \
  <GITHUB_WEBHOOK_SECRET> \
  <GITHUB_APP_PRIVATE_KEY_BASE64>
```

**Example**:
```bash
./scripts/configure_orchestrator_env.sh \
  123456 \
  abc123def456webhook789secret \
  LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQo...
```

This script will:
1. Download your current ECS task definition
2. Add the three GitHub App env vars
3. Register a new task definition revision
4. Update the service
5. Wait for it to stabilize

---

### Step 4: Update GitHub App Webhook URL (2 min)

Now that your orchestrator is deployed:

1. Go back to: **Settings → Developer settings → GitHub Apps → <your-app>**
2. **Webhook URL**: `http://<your-alb-dns>/webhooks/github`
3. **Active**: ✅ (checked)
4. Save

---

### Step 5: Test the Full Flow (3 min)

#### Test 1: Health Check
```bash
curl -s http://<alb-dns>/healthz
# Expected: {"status":"ok"}
```

#### Test 2: Create a Task (Issue)
```bash
curl -sS -X POST http://<alb-dns>/tasks \
  -H 'content-type: application/json' \
  -d '{
    "owner":"<YOUR_ORG>",
    "repo":"<YOUR_REPO>",
    "title":"Test: Expose /version endpoint",
    "objective":"Add a /version endpoint to services/api that returns {version, commit}.",
    "constraints": {
      "allowedPaths": ["services/api/**", "tests/**"],
      "forbiddenPaths": ["infra/**", "migrations/**"],
      "timeCapMin": 30,
      "costCapUSD": 1.5
    },
    "testSpec": [
      "Unit test for /version endpoint",
      "Test returns version and commit fields"
    ],
    "acceptance": [
      "All required checks pass",
      "Coverage ≥ 98%",
      "Mutation score ≥ 60%"
    ],
    "labels": ["ai-task", "test"]
  }'
```

**Expected response**:
```json
{
  "issue_number": 123,
  "issue_url": "https://github.com/<org>/<repo>/issues/123"
}
```

#### Test 3: Check the Issue
1. Go to the `issue_url` from the response
2. You should see a new issue with:
   - Title: "Test: Expose /version endpoint"
   - Labels: `ai-task`, `test`
   - Body formatted with objective, constraints, test specs, and acceptance criteria
3. **Assign it to `@copilot`** to trigger the Coding Agent

---

## Troubleshooting

### ❌ Error: "401 Unauthorized" when calling `/tasks`

**Cause**: GitHub App credentials not configured in ECS task.

**Fix**: Re-run Step 3 (configure_orchestrator_env.sh)

---

### ❌ Error: "Service not found" in configure script

**Cause**: Orchestrator not deployed yet.

**Fix**: Run Step 2 (deploy the orchestrator first)

---

### ❌ Webhook shows "Recent Deliveries" with red X

**Cause**: Webhook signature verification failed.

**Fix**: Make sure the `GITHUB_WEBHOOK_SECRET` you configured in Step 3 matches the webhook secret in your GitHub App settings.

---

### ❌ Can't find ALB DNS

```bash
# Get load balancer DNS
aws elbv2 describe-load-balancers \
  --region eu-central-1 \
  --query 'LoadBalancers[].DNSName' \
  --output text

# Or get it from ECS service
aws ecs describe-services \
  --cluster 21-specialzed-bootstrap-cluster \
  --services 21-specialzed-bootstrap-orchestrator-service \
  --region eu-central-1 \
  --query 'services[0].loadBalancers'
```

---

## What Happens Next?

Once you assign an issue to `@copilot`:
1. Copilot Coding Agent reads the issue
2. Creates a plan (posts as comment)
3. Creates a PR with code changes
4. CI runs: tests, coverage, mutation, SBOM, SLSA
5. If checks pass → ready to merge
6. On merge → auto-deploys to ECS/S3

Your orchestrator receives webhooks at each step and can track progress.

---

## Summary

**Two types of secrets**:
1. **Deploy secrets** (GitHub Actions → AWS) - ✅ Already configured
2. **Runtime secrets** (Orchestrator → GitHub API) - ❌ Configured in Steps 1-3

After completing all steps, you can call `POST /tasks` from your customer UI, and it will create GitHub issues that Copilot can execute.