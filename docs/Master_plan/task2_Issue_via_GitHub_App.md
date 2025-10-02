Title: Task #2 — POST /tasks → create GitHub Issue (agent task) via GitHub App

Objective
Expose POST /tasks that validates customer input, renders a bounded “Agent Task” issue (matching our template fields), and creates it in GitHub via our GitHub App. Return the issue URL/number. One PR, one session.

Scope & constraints
- Touch only: services/orchestrator/**
- Keep existing security/coverage/mutation/SBOM/SLSA gates.
- No DB yet (stateless). We will add persistence later.
- Use GitHub App auth (JWT → installation access token). Do not use PATs.

Env vars (already use .env.* locally; secrets in Actions)
- GITHUB_APP_ID
- GITHUB_WEBHOOK_SECRET (already used)
- GITHUB_APP_PRIVATE_KEY (base64 PEM)
- GITHUB_INSTALLATION_ID (string). If absent, discover first matching installation for this repo owner in runtime and cache in memory.

API contract
POST /tasks
Content-Type: application/json
Body:
{
  "owner": "ORG_OR_USER",            // required
  "repo": "REPO",                    // required
  "title": "Short task title",       // required
  "objective": "What to achieve",    // required
  "constraints": {
    "allowedPaths": ["services/api/**","web/**","tests/**"],
    "forbiddenPaths": ["infra/**","migrations/**"],
    "timeCapMin": 30,
    "costCapUSD": 1.5
  },
  "testSpec": [
    "Unit tests for changed code",
    "Integration test for new endpoint"
  ],
  "acceptance": [
    "All required checks green (test, coverage≥98, branches≥95, mutation≥60, CodeQL, SBOM, SLSA)"
  ],
  "labels": ["ai-task","orchestrator"]   // optional; default includes "ai-task"
}

Response 201:
{
  "issue_number": 123,
  "issue_url": "https://github.com/<owner>/<repo>/issues/123"
}

Implementation (files)

1) services/orchestrator/src/github/appAuth.ts
   - buildAppJwt(appId, privateKeyB64)
   - getInstallationId(owner[, repo])  // use REST: GET /app/installations then match account.login===owner
   - getInstallationToken(installationId) // POST /app/installations/{id}/access_tokens
   - export githubRequest(token, method, url, body?) // tiny fetch wrapper with retries/backoff

2) services/orchestrator/src/github/createIssue.ts
   - export async function createAgentIssue(input): creates issue via POST /repos/{owner}/{repo}/issues
   - title: `[Agent Task] ${title}`
   - labels: ensure includes "ai-task"
   - body (markdown) — render sections to mirror agent_task.yml:
     ## Objective
     ...
     ## Constraints
     ```yaml
     ALLOWED_PATHS: [...]
     FORBIDDEN_PATHS: [...]
     TIME_CAP_MIN: N
     COST_CAP_USD: N.NN
     ```
     ## Test expectations
     - ...
     ## Acceptance criteria
     - ...
     ## Notes
     - Assign to **Copilot – Coding Agent** via GitHub UI if not auto-assigned by label.
     - This issue was created by the Orchestrator.

3) services/orchestrator/src/routes/tasks.ts
   - zod schema for request body; 400 on invalid
   - Resolve installation id (from env or discovery), get token, call createAgentIssue
   - Return 201 with {issue_number, issue_url}

4) services/orchestrator/src/server.ts
   - register route: POST /tasks → handler from routes/tasks.ts

5) Tests
   - services/orchestrator/test/tasks.spec.ts
     • Valid input → 201 and correct URL (mock GitHub with nock)
     • Missing field → 400
     • Labels handling (adds ai-task when not provided)
     • Installation discovery path (when GITHUB_INSTALLATION_ID is absent)
   - Keep coverage thresholds (lines/statements ≥98, branches ≥95)

6) CI: no changes to workflow names (keep job = test, “sboms-orchestrator”, “Attest build provenance (Orchestrator)”)

7) README-ORCHESTRATOR.md
   - Document POST /tasks contract
   - Example curl:
     curl -sS -X POST http://localhost:8080/tasks \
       -H 'content-type: application/json' \
       -d '{ "owner":"YOUR_ORG","repo":"YOUR_REPO","title":"Expose /version","objective":"Add /version endpoint and show in web", "constraints":{"allowedPaths":["services/api/**","web/**","tests/**"],"forbiddenPaths":["infra/**","migrations/**"],"timeCapMin":30,"costCapUSD":1.5},"testSpec":["Unit test for /version","Web renders version"],"acceptance":["All checks green"] }'

Acceptance criteria (must all pass)
1) Unit tests cover success + error paths; overall ≥98% lines/statements, ≥95% branches; Stryker ≥60%.
2) Creating a task returns 201 with a valid issue URL; the GitHub issue appears with correct title/body/labels.
3) CI green (test/coverage/mutation, CodeQL, SBOM, SLSA). No secrets in logs.
4) Deploy orchestrator; POST /tasks works against the installed repo in staging.

Notes
- Do NOT attempt to programmatically “assign to Copilot” unless a documented API exists in this repo; for now we rely on the label + UI assignment. We can automate agent assignment in a follow-up once confirmed.
- Keep webhook signature verification unchanged.
