Title: Task #4 — UI v0 (Create Task + Status View) wired to Orchestrator

Objective
Deliver a minimal customer-facing UI that:
1) Submits new agent tasks to the orchestrator (POST /tasks)
2) Shows status for a task (GET /tasks/:issue_number)
Non-goals: auth, dashboards, persistence; keep it tiny but production-ready.

Scope & stack
- Touch only: web/**
- React + TypeScript + existing CSS/Tailwind setup (reuse project conventions)
- Environment: ORCHESTRATOR_BASE (e.g., https://<domain>)
- Tests: component + integration (mock fetch); coverage must keep repo-wide thresholds green.

Screens & routes
1) `/` — “New Task” form
   - Fields: owner, repo, title, objective (required)
   - Optional sections (collapsible): constraints (allowedPaths[], forbiddenPaths[], timeCapMin, costCapUSD),
     testSpec[] (string list), acceptance[] (string list), labels[] (default includes "ai-task")
   - Submit → POST `${ORCHESTRATOR_BASE}/tasks`
   - On 201: show success with Issue link and a “View Status” button → `/status/:issue_number`

2) `/status/:issue_number` — live status
   - On load: GET `${ORCHESTRATOR_BASE}/tasks/:issue_number`
   - Render: state badge (CREATED/IN_PROGRESS/PR_OPEN/CHECKS_GREEN/CHECKS_RED/MERGED/FAILED),
     lastEvent timestamp, checks panel (required checks + pass/fail), PR link (if any), Issue link.
   - Poll every 5s (clear on unmount)

Files (suggested)
- web/src/pages/NewTask.tsx
- web/src/pages/TaskStatus.tsx
- web/src/api/orchestrator.ts (fetch helpers with timeouts/retry)
- web/src/components/FormArray.tsx (add/remove list items)
- web/src/types.ts (TaskRequest, TaskStatusResponse)
- web/src/tests/NewTask.spec.tsx, TaskStatus.spec.tsx, orchestrator.spec.ts (mocks)

Validation & UX
- Client-side required validation for owner/repo/title/objective
- Disable submit while in-flight, show error banner on non-2xx
- Never display secrets; log only summary data in dev

Config
- web/.env.example → ORCHESTRATOR_BASE=<https://your-domain>
- Use runtime injection if you already support it; otherwise static env for now

Tests (must cover)
- Successful POST → navigates to /status/:id and renders Issue link
- 400 path → shows validation error
- Status polling renders state transitions (mock sequence: CREATED → PR_OPEN → CHECKS_GREEN)
- Edge: network error → retry/backoff once, then show error

Acceptance criteria
1) UI builds and passes tests; coverage remains ≥98% lines/statements, ≥95% branches for web/.
2) New Task form successfully creates an issue (manually verified against staging orchestrator).
3) Status page reflects transitions based on orchestrator’s GET response (verified with mocked sequence).
4) No secrets in the UI bundle; .env.example updated; README updated with usage.

Notes
- Keep components small; no global state manager required.
- Prefer native `fetch` with AbortController; 5s timeout; one retry for status polling.
- Do not add auth yet; staging may be public behind rate limits.
