Perfect—your screenshots show the bootstrap files are staged and ready. Here’s the exact, no-guesswork sequence to go from “files added” → “agent opens first PR and all gates pass.”

## Do these in order (10–20 min)

1. **Push the branch**

* Tap **Push** (or `git push origin <branch>`).
* Open the repo → **Actions**. You should see `codeql` and `test` workflows appear. First run may be skipped until a PR exists (that’s fine).

2. **Create the required secrets (repo → Settings → Secrets and variables → Actions)**
   Back end (ECS/ECR):

* `AWS_BACKEND_ROLE_ARN` — IAM role ARN for backend deploy via OIDC
* `ECR_API_REPO` — e.g., `my-saas/api`
* `ECS_CLUSTER` — your cluster name
* `ECS_SERVICE` — your service name

Front end (S3/CloudFront):

* `AWS_FRONTEND_ROLE_ARN` — IAM role ARN for frontend deploy via OIDC
* `S3_STAGING_BUCKET`, `S3_PRODUCTION_BUCKET`
* `CF_STAGING_DISTRIBUTION`, `CF_PRODUCTION_DISTRIBUTION`

> Tip: if you don’t have the IAM roles yet, do step 3 next and then come back to finish the secrets.

3. **Set up AWS OIDC trust (one-time)**
   Create **two** IAM roles:

**Trust policy (both roles)**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
      }
    }
  }]
}
```

**Backend role minimal policy** (attach or add to an inline policy):

```json
{
  "Version":"2012-10-17",
  "Statement":[
    {"Effect":"Allow","Action":["ecr:GetAuthorizationToken"],"Resource":"*"},
    {"Effect":"Allow","Action":["ecr:BatchGetImage","ecr:BatchCheckLayerAvailability","ecr:PutImage","ecr:InitiateLayerUpload","ecr:UploadLayerPart","ecr:CompleteLayerUpload","ecr:DescribeRepositories","ecr:CreateRepository"],"Resource":"*"},
    {"Effect":"Allow","Action":["ecs:UpdateService","ecs:DescribeServices","ecs:DescribeTaskDefinition","ecs:RegisterTaskDefinition","iam:PassRole"],"Resource":"*"}
  ]
}
```

**Frontend role minimal policy**:

```json
{
  "Version":"2012-10-17",
  "Statement":[
    {"Effect":"Allow","Action":["s3:PutObject","s3:DeleteObject","s3:ListBucket"],"Resource":["arn:aws:s3:::YOUR_BUCKET","arn:aws:s3:::YOUR_BUCKET/*"]},
    {"Effect":"Allow","Action":["cloudfront:CreateInvalidation"],"Resource":"*"}
  ]
}
```

Paste the two **role ARNs** into `AWS_BACKEND_ROLE_ARN` and `AWS_FRONTEND_ROLE_ARN` secrets.

4. **Apply branch protection (one-time)**
   In your terminal (with repo admin + GitHub CLI logged in):

```bash
chmod +x scripts/setup_branch_protection.sh
./scripts/setup_branch_protection.sh YOUR_ORG/YOUR_REPO
```

This enforces the required checks the workflows produce.

5. **Kick off a first CI run (smoke PR)**

* Create a tiny change (e.g., edit README).
* Open a PR to `main`.
* Verify you see checks for: `test` (with coverage + mutation), `codeql`, `sboms`, and both **Attest build provenance** steps.
* Merge only when green.

6. **Run the agent end-to-end**

* **Issues → New issue → “Agent Task”** template.
* Fill in an easy objective (e.g., “Add `/healthz` endpoint and test”), keep paths to `services/api/**` and `tests/**`.
* Assign to **Copilot – Coding Agent** from the **Agents** menu.
* Watch it: plan → branch → Actions VM test → PR.
* In the PR, **comment** if you want adjustments (the agent will iterate), then merge when all required checks pass.

---

## Validation checklist (pass gates before expanding)

* [ ] **CodeQL** check is required and blocks high/critical.
* [ ] **Coverage ≥ 98%** and **mutation ≥ 60%** checks pass in `test` workflow.
* [ ] **SBOM artifacts** (two CycloneDX JSON files) show in the run.
* [ ] **SLSA provenance** steps succeed for API and Web.
* [ ] **Deploy workflows** can assume the AWS roles via OIDC (no long-lived keys).

---

## Common “first run” snags & quick fixes

* **“Required check missing”**: The check names in protection must match the workflow step/job names. If you changed names, re-run `setup_branch_protection.sh` or tweak in Settings → Branches.
* **Coverage gate fails**: Your repo may not have enough tests yet. Lower temporarily to `0.9` in `ci.yml`, or let the agent add tests first, then restore to `0.98`.
* **Stryker is slow**: Start with a narrower mutate glob (e.g., `src/auth/**/*.ts`) and widen later.
* **CodeQL not analyzing TS**: Ensure `languages: javascript-typescript` (already set). For monorepos with unusual layouts, switch CodeQL to “advanced setup” and add `autobuild: false` + explicit build steps.
* **OIDC assume-role denied**: Re-check trust policy `sub` matches `repo:ORG/REPO:*` and that your workflow has `permissions: id-token: write`.

---

## Next two increments (after smoke)

1. **Canary + auto-rollback** in your ECS service (deploy workflow): add a health-check alarm and a step to revert the task definition on failed alarm within 10 min.
2. **SCA/DAST gates**: add Snyk or Dependabot security updates as required checks; add OWASP ZAP against a staging URL on PR.

---

If you want, tell me your **ECS cluster/service and ECR repo names**, and I’ll return the deploy task-definition JSON and update `deploy-backend.yml` to pin container names and health checks so you can ship the canary/rollback next.
