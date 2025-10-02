# Orchestrator Service

Production-ready skeleton for routing customer tasks through GitHub Copilot Coding Agent via a secured webhook receiver.

## Capabilities
- `GET /healthz` for ALB and diagnostics.
- `POST /webhooks/github` verifies `X-Hub-Signature-256`, enforces a 100 req/min rate limit, and logs structured event metadata only.
- `POST /tasks` validates task requests and creates GitHub “Agent Task” issues via the App installation.
- Hardened Node.js 20 + Fastify service with coverage, mutation, SBOM, and SLSA gates wired through GitHub Actions.
- Containerized build ready for ECS Fargate using existing OIDC trusts.

## Environment Variables
Set the following variables for both local runs and ECS tasks:

| Variable | Description |
| --- | --- |
| `PORT` | Optional HTTP port (defaults to `8080`). |
| `GITHUB_APP_ID` | Numeric App ID from the GitHub App settings. |
| `GITHUB_WEBHOOK_SECRET` | Shared secret used to sign GitHub webhook payloads. |
| `GITHUB_APP_PRIVATE_KEY` | Base64-encoded GitHub App private key (PEM). |
| `RATE_LIMIT_MAX` | Optional override for maximum requests per window (defaults to 100). |
| `RATE_LIMIT_MODE` | Leave unset (plugin-enforced) in production; set to `internal` only in tests to use the deterministic in-memory limiter. |

> Decode the private key inside the container or runtime when you need to call GitHub APIs. The service only checks that the secret exists during boot.

Store these values in GitHub Actions repository secrets:

- `GITHUB_APP_ID`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `ECR_ORCHESTRATOR_REPO` (for example `21-specialzed-bootstrap/orchestrator`)
- `ECS_ORCHESTRATOR_SERVICE`
- `ECS_CLUSTER`
- `AWS_BACKEND_ROLE_ARN`

## GitHub App Setup
1. Visit **Settings -> Developer settings -> GitHub Apps -> New GitHub App** under your organization.
2. Configure metadata:
   - Homepage URL: internal portal or repository URL.
   - Callback URLs: leave empty for now.
   - Webhook: enable, provide the orchestrator URL (`https://<alb-domain>/webhooks/github`) once deployed, and set the webhook secret to match `GITHUB_WEBHOOK_SECRET`.
3. Permissions (least privilege):
   - Issues: Read & write
   - Pull requests: Read
   - Checks: Read
   - Actions: Read
   - Contents: Read
   - Metadata: Read
4. Subscribe to events:
   - `issues`
   - `issue_comment`
   - `pull_request`
   - `check_run`
   - `workflow_run`
5. Create the App, then generate a private key.
6. Base64-encode the PEM for safe storage:
   ```bash
   base64 -w0 < path/to/private-key.pem
   ```
   Store the output as the `GITHUB_APP_PRIVATE_KEY` secret.
7. Capture the App ID and save it as the `GITHUB_APP_ID` secret.
8. Install the App on the repositories you want the orchestrator to manage (start with this repository).

## Local Development
```bash
cd services/orchestrator
npm install
npm run lint
npm run test
npm run build
PORT=8080 GITHUB_APP_ID=123 \
  GITHUB_WEBHOOK_SECRET=dev-secret \
  GITHUB_APP_PRIVATE_KEY=$(base64 -w0 ./path/to/dev-key.pem) \
  npm start
```

### Health Check
```bash
curl -s http://localhost:8080/healthz
# => {"status":"ok"}
```

### Webhook Test
```bash
payload='{"repository":{"full_name":"example/repo"}}'
signature="sha256=$(echo -n "$payload" | openssl dgst -sha256 -hmac "dev-secret" | sed 's/^.* //')"
curl -i \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $signature" \
  -H "X-GitHub-Event: issues" \
  -H "X-GitHub-Delivery: local-test" \
  --data "$payload" \
  http://localhost:8080/webhooks/github
```

Invalid signatures return `401` with body `{"status":"invalid signature"}`.

### Tasks API
`POST /tasks` creates a GitHub issue that follows the “Agent Task” template.

#### Example request
```bash
curl -sS -X POST http://localhost:8080/tasks \
  -H 'content-type: application/json' \
  -d '{
        "owner":"YOUR_ORG",
        "repo":"YOUR_REPO",
        "title":"Expose /version",
        "objective":"Add /version endpoint and surface it in the web UI",
        "constraints":{
          "allowedPaths":["services/api/**","web/**","tests/**"],
          "forbiddenPaths":["infra/**","migrations/**"],
          "timeCapMin":30,
          "costCapUSD":1.5
        },
        "testSpec":["Unit test for /version","Web renders version"],
        "acceptance":["All checks green"]
      }'
```

#### Example response
```json
{
  "issue_number": 123,
  "issue_url": "https://github.com/YOUR_ORG/YOUR_REPO/issues/123"
}
```

If `labels` are supplied they are merged with `ai-task`; when omitted the service automatically adds `ai-task`.

## CI / Quality Gates
The workflow `.github/workflows/orchestrator-ci.yml` runs on pushes and pull requests targeting `main` and `aws_gh_setup` and enforces:
- Jest coverage >= 98 percent for lines, statements, and functions (>= 95 percent branches).
- Stryker mutation score >= 60 percent (build fails below the break threshold).
- CycloneDX SBOM artifact upload (`sboms-orchestrator`).
- SLSA provenance via `actions/attest-build-provenance` on `services/orchestrator/dist/**`.

Required checks to block merges (branch protection):
- `orchestrator-ci / orchestrator-ci`
- `test`
- `codeql`
- `sboms-orchestrator`
- `Attest build provenance (Orchestrator)`

These names must match the orchestrator state machine's REQUIRED_CHECKS list for checks aggregation.

## Deployment
Trigger `.github/workflows/deploy-orchestrator.yml` manually once repository secrets are in place. The workflow:
1. Assumes `AWS_BACKEND_ROLE_ARN` using GitHub OIDC.
2. Builds the Docker image from `services/orchestrator/Dockerfile.api`.
3. Pushes the image to `ECR_ORCHESTRATOR_REPO` with tag `${GITHUB_SHA}`.
4. Forces a new deployment on `ECS_ORCHESTRATOR_SERVICE` (cluster `ECS_CLUSTER`).
5. Waits until the service is stable.

Confirm the target ALB marks the new tasks as healthy by requesting:
```bash
curl -s https://<alb-domain>/healthz
```
A `200` with `{ "status": "ok" }` confirms readiness.

## Next Steps
- Extend the orchestrator with a `/tasks` API that renders the agent task template and opens GitHub Issues.
- Persist webhook event metadata for timeline reconstruction and UI consumption.
- Emit OpenTelemetry traces once request routing is added.
