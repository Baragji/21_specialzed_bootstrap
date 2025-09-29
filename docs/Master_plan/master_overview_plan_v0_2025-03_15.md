Awesome—locked in. Here’s the tight master plan (v0) plus the **first single-session task** you can paste to your assistant.

# Master Overview Plan (v0)

**A. Customer UI (frontend)**

* Flows: “Create task → select repo → scope (paths/caps) → submit → live status → result links.”
* Components: Task form, Task detail/status, Runs timeline, Checks panel (tests/CodeQL/SBOM/SLSA), Deploy status.

**B. GitHub App (auth & wiring)**

* Create org GitHub App; permissions: Issues (read/write), Pull requests (read), Checks (read), Actions (read), Contents (read), Metadata (read), Webhooks (subscribe).
* Delivery: App private key rotation, install-on-selected repos, webhook secret, org-only install.

**C. Orchestrator service (backend)**

* Endpoints: `POST /tasks` (create GH Issue from UI), `POST /webhooks/github` (ingest/route events), `GET /tasks/:id` (status), `GET /healthz`.
* Policies: allowed paths, time/cost caps, labels, one-PR-per-task, rollback note injection.

**D. Task templating**

* Map UI input → **agent_task.yml** fields (objective, constraints, tests, acceptance). Apply repo-scoped defaults.

**E. Webhook handling (state)**

* Events: `issues`, `issue_comment`, `pull_request`, `check_run`, `workflow_run`, `status`.
* Transitions: `CREATED → IN_PROGRESS → PR_OPEN → CHECKS_GREEN/RED → MERGED/FAILED`.

**F. State store & audit**

* DB tables: `tasks`, `task_events`, `prs`, `checks`, `artifacts`.
* Log sink: append-only action logs; export to SIEM later.

**G. Telemetry**

* OpenTelemetry traces for `/tasks` and webhook pipeline; structured logs.

**H. Security**

* Verify GitHub webhook signature (sha256); JWT for App→Installation token; rate limiting; secrets in vault; no long-lived keys.

**I. Deployment**

* Orchestrator → ECS Fargate (OIDC) with health checks/circuit breaker.
* UI → S3/CloudFront. Use your existing OIDC + pipelines.

**J. E2E pilot & KPIs**

* Golden task: “/version endpoint + show in web.” Track lead time, pass rate, rollback SLA.

---

# Picked Item #1 (single-session): **GitHub App + Minimal Webhook Receiver**

Below is the **paste-ready instruction** for your assistant (one pass, no context needed).

```
Title: Create GitHub App + minimal orchestrator webhook service (v0)

Goal
- Stand up a production-ready skeleton that:
  1) Registers a GitHub App with exact permissions/subscriptions.
  2) Implements a minimal Node/TypeScript service with two endpoints:
     - POST /webhooks/github — verifies X-Hub-Signature-256 and logs event type+ids.
     - GET /healthz — returns {status:"ok"}.
  3) Ships a Docker image and CI that runs tests and emits SBOM + SLSA (align with repo standards).
  4) Deploys to ECS (manual trigger workflow), health-checked by ALB.

Scope & constraints
- Language: Node.js 20 + TypeScript, Fastify or Express (choose one).
- Files live under `services/orchestrator/**` (do not touch infra/, migrations/, or existing services).
- Security: Strict verification of GitHub webhook signature; reject on mismatch; no logs of raw payloads (only event type/id).
- Config: Read from env vars:
  - GITHUB_APP_ID, GITHUB_WEBHOOK_SECRET, GITHUB_APP_PRIVATE_KEY (PEM, base64-encoded),
  - PORT (default 8080).
- No placeholders or mock code; minimal but production-grade.

Exact deliverables (files)
- services/orchestrator/package.json (scripts: build, start, test)
- services/orchestrator/src/server.ts (routes, signature verify)
- services/orchestrator/src/github/signature.ts (HMAC util)
- services/orchestrator/src/types.ts
- services/orchestrator/test/webhook.spec.ts (happy + bad-signature cases)
- services/orchestrator/tsconfig.json
- services/orchestrator/Dockerfile.api (multi-stage build; CMD node dist/server.js)
- .github/workflows/orchestrator-ci.yml
  - Install, build, test, coverage ≥98% (jest config), mutation ≥60% (stryker),
  - CycloneDX SBOM artifact,
  - actions/attest-build-provenance@v1 (subject-path: services/orchestrator/dist/**)
- .github/workflows/deploy-orchestrator.yml
  - workflow_dispatch; OIDC assume backend role; push image to ECR; update ECS service; wait for stability.
- README-ORCHESTRATOR.md
  - Setup instructions, required env vars, local test (curl), webhook sample, ECS health note.

GitHub App (manual steps + docs in README-ORCHESTRATOR.md)
- Create an org GitHub App:
  - Permissions: Issues (Read & write), Pull requests (Read), Checks (Read), Actions (Read), Contents (Read), Metadata (Read).
  - Webhook: enable; secret = ${GITHUB_WEBHOOK_SECRET}.
  - Subscribe to: issues, issue_comment, pull_request, check_run, workflow_run.
  - Generate private key, store as base64 in secret GITHUB_APP_PRIVATE_KEY.
  - Record APP ID → secret GITHUB_APP_ID. Install on selected repos.

Acceptance criteria (must all pass)
1) `GET /healthz` → 200 `{"status":"ok"}`.
2) `POST /webhooks/github` with a valid test payload & signature returns 200 and logs: `{event:"issues", repo:"<org/repo>", id:"<number>"}` (no raw bodies).
3) CI green: unit coverage ≥98%, mutation ≥60%, SBOM artifact present, SLSA provenance step succeeds.
4) Deploy workflow completes: ECS service stable; ALB health check 200 on `/healthz`.
5) Security: invalid signature yields 401; no secrets printed in logs.

Notes
- Use crypto.timingSafeEqual for HMAC compare; reject if missing headers.
- Place a small rate limit (e.g., 100 req/min) on webhook route.
- Don’t implement /tasks or DB yet; that’s Task #2.

Label the PR: `ai-task`, `orchestrator`, `security`.
```

---

If you approve Task #1, I’ll queue **Task #2: `/tasks` endpoint that converts UI input → templated GitHub Issue (using our existing `agent_task.yml`) and auto-assigns @copilot**—also scoped for one session.
