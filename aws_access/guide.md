Good — you created the access key. Below is a **no-nonsense, copy-paste terminal recipe** that:

1. Configures the AWS CLI locally with the access key you made.
2. Uses that credential to create a **GitHub-OIDC trust role** (safe defaults + `sub` restriction) and attach a least-privilege inline policy for ECS/ECR.
3. Creates the ECR repo (if needed).
4. Publishes the needed **GitHub repo secrets** with `gh`.

I’ll also show the key safety notes and links to the official docs I used. Do every step from the repo root / your terminal.

---

## Important safety notes (read before running)

* Long-lived access keys are powerful — rotate/delete them when you finish this setup. AWS docs recommend using temporary credentials (roles / SSO / OIDC) instead of access keys for long-term use. ([docs.aws.amazon.com][1])
* Don’t paste secrets into files that go into git. Use `gh secret set` (the CLI encrypts before upload). ([GitHub CLI][2])
* After you finish, remove these keys or restrict them (MFA, least privilege). ([docs.aws.amazon.com][1])

---

## Step A — Configure your AWS CLI with the access key you created

Run this and paste the Access key ID and Secret access key when asked:

```bash
# start the old-style configure wizard (you created an access key already)
aws configure
# Enter:
# AWS Access Key ID [None]: <YOUR_ACCESS_KEY_ID>
# AWS Secret Access Key [None]: <YOUR_SECRET_ACCESS_KEY>
# Default region name [None]: eu-central-1    # or your preferred region
# Default output format [None]: json
```

(If you prefer one-liners:)

```bash
aws configure set aws_access_key_id  YOUR_ACCESS_KEY_ID
aws configure set aws_secret_access_key YOUR_SECRET_ACCESS_KEY
aws configure set region eu-central-1
aws configure set output json
```

Official reference: creating and using access keys. ([docs.aws.amazon.com][3])

---

## Step B — Create the IAM role GitHub Actions will assume (OIDC trust)

Save this to a file `trust-oidc.json`. Replace `123456789012` with your AWS account ID and `OWNER/REPO` with your GitHub owner and repo.

```json
# trust-oidc.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Create the role (CLI):

```bash
ROLE_NAME="gh-backend-deploy"
aws iam create-role \
  --role-name "${ROLE_NAME}" \
  --assume-role-policy-document file://trust-oidc.json \
  --description "Role for GitHub Actions OIDC deploy (ECR/ECS)" || true
```

**Why `sub` restriction:** it prevents any other repo or branch from assuming this role. Official GitHub + AWS guidance recommends scoping the `sub` claim to your repo or a specific workflow. ([GitHub Docs][4])

---

## Step C — Attach a least-privilege inline policy for ECR/ECS

Save the policy to `/tmp/backend_policy.json`. Replace region, account and resource names accordingly.

```json
# /tmp/backend_policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid":"EcrLogin","Effect":"Allow","Action":["ecr:GetAuthorizationToken"],"Resource":"*" },
    { "Sid":"EcrRepo","Effect":"Allow","Action":[
        "ecr:BatchGetImage","ecr:BatchCheckLayerAvailability","ecr:CompleteLayerUpload",
        "ecr:InitiateLayerUpload","ecr:PutImage","ecr:UploadLayerPart","ecr:GetDownloadUrlForLayer",
        "ecr:DescribeRepositories"
      ], "Resource":"arn:aws:ecr:eu-central-1:123456789012:repository/my-saas/api" },
    { "Sid":"EcsUpdate","Effect":"Allow","Action":[
        "ecs:UpdateService","ecs:DescribeServices","ecs:DescribeTaskDefinition","ecs:DescribeClusters"
      ], "Resource":[
        "arn:aws:ecs:eu-central-1:123456789012:service/my-saas-cluster/api-service",
        "arn:aws:ecs:eu-central-1:123456789012:cluster/my-saas-cluster"
      ] }
  ]
}
```

Attach it:

```bash
aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name "${ROLE_NAME}-inline" \
  --policy-document file:///tmp/backend_policy.json
```

(If you need CloudWatch Logs permissions, add them as `logs:CreateLogStream` / `logs:PutLogEvents` with appropriate resources.)

---

## Step D — Ensure ECR repo exists (create if needed)

```bash
aws ecr describe-repositories --repository-names "my-saas/api" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "my-saas/api"
```

Official ECR creation docs referenced earlier. ([docs.aws.amazon.com][5])

---

## Step E — Read the created role ARN and copy it (we’ll set it as a GitHub secret)

Get the role ARN:

```bash
aws iam get-role --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text
# copy the ARN, e.g. arn:aws:iam::123456789012:role/gh-backend-deploy
```

---

## Step F — Publish required GitHub secrets using `gh`

Make sure you `gh auth login` first (browser flow). Then:

```bash
# Replace OWNER/REPO with your actual values
REPO="OWNER/REPO"
gh auth status   # confirm you're logged in

# set secrets (example)
gh secret set AWS_BACKEND_ROLE_ARN -R "${REPO}" -b "arn:aws:iam::123456789012:role/gh-backend-deploy"
gh secret set ECR_API_REPO        -R "${REPO}" -b "my-saas/api"
gh secret set ECS_CLUSTER         -R "${REPO}" -b "my-saas-cluster"
gh secret set ECS_SERVICE         -R "${REPO}" -b "api-service"
gh secret set AWS_REGION          -R "${REPO}" -b "eu-central-1"
```

Docs: `gh secret set` encrypts client-side and uploads. ([GitHub CLI][2])

---

## Step G — Update workflow snippet to assume role via OIDC (already in your workflows)

Your deploy workflow should use:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_BACKEND_ROLE_ARN }}
    aws-region: eu-central-1
```

Official guidance: GitHub docs + AWS blog explain the OIDC pattern and role-to-assume flow. ([GitHub Docs][4])

---

## Step H — Test it

1. Push a trivial commit that touches `services/api/**` or manually dispatch `deploy-backend` in Actions.
2. Check Actions logs — `aws-actions/configure-aws-credentials` should assume the role successfully and the job should proceed to build/push image.

If you see an error like `AccessDenied` or `NotAuthorized`:

* Verify the `sub` in the trust policy exactly matches `repo:OWNER/REPO:ref:refs/heads/main` (or change to `workflow:deploy-backend.yml` if you restricted by workflow).
* Verify the role ARN is exactly the value you put into the GitHub secret.
* Check the Actions run’s job context: if it’s a fork PR, OIDC might be limited; restrict CodeQL/upload behavior for forks. ([Stack Overflow][6])

---

## Quick rollback / cleanup (when done)

* Delete the access key you used for setup (or rotate it): IAM → Users → Security credentials → Delete access key. AWS docs recommend this. ([docs.aws.amazon.com][1])

---

## References (authoritative)

* Manage access keys for IAM users (best practices / rotate keys). ([docs.aws.amazon.com][1])
* CreateAccessKey / IAM CLI reference. ([docs.aws.amazon.com][5])
* Configuring OpenID Connect in Amazon Web Services (GitHub Docs). ([GitHub Docs][4])
* AWS blog: use IAM roles to connect GitHub Actions to AWS (OIDC role + trust examples). ([Amazon Web Services, Inc.][7])
* `gh secret set` documentation. ([GitHub CLI][2])

---

If you want, I’ll now:

* (A) Fill the JSON files and terminal script using **your** `OWNER/REPO`, `ACCOUNT_ID`, ECR/ECS names — paste those here and I’ll render the exact files/commands ready to run; **or**
* (B) Run you through the exact error log if something fails when you test the workflow (paste the Actions failure text).

Pick A or B and I’ll produce the exact copy-paste commands.

[1]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html?utm_source=chatgpt.com "Manage access keys for IAM users"
[2]: https://cli.github.com/manual/gh_secret_set?utm_source=chatgpt.com "gh secret set"
[3]: https://docs.aws.amazon.com/cli/v1/userguide/cli-authentication-user.html?utm_source=chatgpt.com "Authenticating using IAM user credentials for the AWS CLI"
[4]: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services?utm_source=chatgpt.com "Configuring OpenID Connect in Amazon Web Services"
[5]: https://docs.aws.amazon.com/cli/latest/reference/iam/create-access-key.html?utm_source=chatgpt.com "create-access-key — AWS CLI 2.31.3 Command Reference"
[6]: https://stackoverflow.com/questions/77969948/github-actions-with-aws-oidc-login-not-working?utm_source=chatgpt.com "GitHub Actions with AWS OIDC login not working"
[7]: https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/?utm_source=chatgpt.com "Use IAM roles to connect GitHub Actions to actions in AWS"
