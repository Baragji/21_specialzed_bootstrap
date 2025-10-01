Title: Task #3 — Webhook handling and transient state (v0)

Objective
Implement POST /webhooks/github with signature verification and minimal event routing to maintain in-memory task state. Expose GET /tasks/:id to retrieve basic status. One PR, one session.

Scope & constraints
- Touch only: services/orchestrator/**
- No external DB yet: use in-memory maps; we will replace with a DB in Task #4.
- Verify X-Hub-Signature-256 using GITHUB_WEBHOOK_SECRET. Reject invalid/missing signatures with 401.
- Subscribe to events: issues, issue_comment, pull_request, check_run, workflow_run.
- Do not log raw payloads; only log event type, repo, key ids.

API contracts
1) POST /webhooks/github
- Headers: X-Hub-Signature-256 (required), X-GitHub-Event (required)
- Body: JSON payload from GitHub
- Responses: 200 {status:"ok"} on accepted; 401 on signature mismatch; 400 on malformed

2) GET /tasks/:issue_number
- Returns {state, pr_number?, checks?} derived from observed events for that issue.
- States: CREATED → IN_PROGRESS → PR_OPEN → CHECKS_GREEN | CHECKS_RED → MERGED | FAILED

Implementation
1) services/orchestrator/src/github/signature.ts
   - export verifySignature(secret, rawBody, signatureHeader): boolean
   - Use crypto.createHmac('sha256', secret) and timingSafeEqual. Header format: sha256=... 
2) services/orchestrator/src/routes/webhooks.ts
   - Fastify route with rawBody enabled. Verify signature. Switch on X-GitHub-Event:
     • issues: on opened → set state CREATED; on closed → MERGED/FAILED by label/close reason
     • issue_comment: on bot plan start → IN_PROGRESS (heuristic: contains plan header)
     • pull_request: on opened/synchronize → PR_OPEN; on closed merged=true → MERGED, else FAILED
     • check_run / workflow_run: update checks summary for latest commit
   - Maintain in-memory store keyed by issue_number with fields {state, pr_number?, checks?}.
3) services/orchestrator/src/server.ts
   - Register webhooks route and ensure raw body parsing for that route only.
4) Tests
   - services/orchestrator/test/webhooks.spec.ts
     • Valid signature → 200
     • Invalid signature → 401
     • issues.opened transitions to CREATED
     • pull_request.opened transitions to PR_OPEN with pr_number extraction
     • workflow_run.completed success → CHECKS_GREEN
   - Coverage ≥98% lines/statements; branches ≥95%; Stryker ≥60%.
5) README-ORCHESTRATOR.md
   - Document webhook setup, headers, signature verification, and example curl with signature.

Acceptance criteria
1) /webhooks/github validates signature and returns 200 for valid events.
2) In-memory state transitions work for the core path (issue → PR → checks → merged).
3) /tasks/:id returns the latest state given the events observed.
4) CI green (tests/coverage/mutation, SBOM, SLSA). No secrets in logs.

Notes
- We’ll replace in-memory state with a DB and durable schemas in the next task.
- Use minimal heuristics; exact Copilot Agent signals may vary, but PR open/merge events and workflow checks are sufficient for v0.
