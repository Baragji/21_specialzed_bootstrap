Title: Pre-flight (CI+deploy+housekeeping) → then Task #4 UI v0

Phase A — Pre-flight on current Task 3 branch
1) CI: Run full pipeline (tests, coverage gates, mutation, SBOM, SLSA). Confirm mutation ≥60%.
2) Deploy: Run deploy-orchestrator; verify:
   - GET /healthz → 200 {"status":"ok"}
   - POST /tasks → 201 and a live GitHub Issue created
3) ts-jest warnings:
   - Move ts-jest transform config into Jest config file
   - Add a dedicated test tsconfig (tsconfig.jest.json) with "isolatedModules": true
4) State machine required checks:
   - Ensure the constant list exactly matches branch protection check names:
     ["test","codeql","sboms-orchestrator","Attest build provenance (Orchestrator)"]
   - Update README to reflect these names
5) Open PR → ensure all checks green → merge → redeploy orchestrator.

Phase B — Task #4 UI v0 (Create Task + Status)
Objective
- A tiny React/TS front end that: (1) posts new tasks to the orchestrator, (2) shows live status of a task.

Scope
- Touch only: web/**
- Use env var: ORCHESTRATOR_BASE
- Keep repo gates green (coverage ≥98% lines/statements, ≥95% branches for web/)

Routes & features
1) `/` NewTask:
   - Required fields: owner, repo, title, objective
   - Optional: constraints.allowedPaths[], constraints.forbiddenPaths[], timeCapMin, costCapUSD, testSpec[], acceptance[], labels[]
   - POST `${ORCHESTRATOR_BASE}/tasks`; on 201 show Issue link and “View Status” → `/status/:issue_number`
2) `/status/:issue_number` TaskStatus:
   - GET `${ORCHESTRATOR_BASE}/tasks/:issue_number` every 5s
   - Show state badge (CREATED/IN_PROGRESS/PR_OPEN/CHECKS_GREEN/CHECKS_RED/MERGED/FAILED), checks panel, PR/Issue links

File sketch
- web/src/pages/NewTask.tsx
- web/src/pages/TaskStatus.tsx
- web/src/api/orchestrator.ts (fetch with timeout + one retry for status)
- web/src/components/FormArray.tsx
- web/src/types.ts (TaskRequest, TaskStatusResponse)
- web/.env.example (ORCHESTRATOR_BASE)
- Tests: web/src/tests/NewTask.spec.tsx, TaskStatus.spec.tsx, orchestrator.spec.ts

Tests (must cover)
- Successful POST navigates to /status/:id and renders Issue link
- 400 from orchestrator shows validation error banner
- Status polling renders transition sequence (mock: CREATED → PR_OPEN → CHECKS_GREEN)
- Error path (network) → retry once then surface error

Acceptance criteria
- All web/ tests pass with coverage ≥98% lines/statements and ≥95% branches; mutation budget unaffected
- Manual: form creates a task against staging orchestrator; status page reflects state
- No secrets in bundle; .env.example updated; README section added

Labels for PRs: ui, orchestrator, ai-task
