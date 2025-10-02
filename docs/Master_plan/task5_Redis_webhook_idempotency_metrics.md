Title: Task #5 — Durable task state (Redis), webhook idempotency, and basic metrics

Objective
Replace the in-memory task store with Redis (TTL). Make webhook handling idempotent using GitHub delivery IDs. Add a tiny metrics endpoint for ops. One PR, one session.

Scope
- Touch only: services/orchestrator/**
- Do not change API contracts: POST /tasks and GET /tasks/:issue_number stay the same.
- Keep existing security + coverage gates (≥98% lines/statements, ≥95% branches; mutation ≥60%).

Env (document in README-ORCHESTRATOR.md)
- REDIS_URL (e.g., redis://user:pass@host:6379/0)
- REDIS_TLS=(true|false) default false
- REDIS_PREFIX=orc: (key prefix)
- STATE_TTL_SEC=604800 (7 days)

Implementation

1) Redis client & keys
- Add src/state/redis.ts:
  - createRedisClient(): handles TLS when REDIS_TLS=true
  - key helpers:
    * taskKey(issue_number)        → `${REDIS_PREFIX}task:${issue_number}`
    * timelineKey(issue_number)    → `${REDIS_PREFIX}timeline:${issue_number}`
    * seenDeliveryKey(delivery_id) → `${REDIS_PREFIX}seen:${delivery_id}`
- JSON encode/decode; all writes set EX=STATE_TTL_SEC.

2) State store
- src/state/store.ts:
  - setTaskState(issue_number, statePayload)
  - getTaskState(issue_number) → { issue_number, state, last_event, timeline[], repo, pr_number?, checks{}, updatedAt }
  - appendTimeline(issue_number, event) (trim list to last N=50 events)
  - seenDelivery(delivery_id): boolean (SETNX with TTL to dedupe)
- Fallback: if REDIS_URL unset, use current in-memory Map; log a WARN once on startup.

3) Webhook idempotency
- In src/webhooks/router.ts (or the route preHandler):
  - Read `x-github-delivery` header → deliveryId
  - If !deliveryId → proceed (no idempotency)
  - If seenDelivery(deliveryId) is true → immediately 200 (no-op)
  - Else mark seen, then route to the handler

4) GET /tasks/:issue_number
- Swap to read from Redis-backed store; maintain the exact response shape.

5) Metrics (tiny)
- Add GET /metricsz → 200 JSON:
  {
    "uptimeSec": <number>,
    "mode": REDIS_URL ? "redis" : "memory",
    "keys": { "tasks": <approx or -1 if unknown> },
    "version": process.env.GIT_SHA || "dev"
  }
- Keep it non-sensitive and lightweight (no Redis creds, no PII).

6) Tests (must cover)
- store.spec.ts (with REDIS_URL mocked):
  - set/get round-trip, TTL set, timeline trim, append order
  - seenDelivery returns false first, true on repeat
- webhooks_idempotency.spec.ts:
  - Duplicate delivery ID returns 200 and does not double-append timeline
  - Missing delivery header still processes normally
- fallback.spec.ts:
  - No REDIS_URL → logs a single WARN and uses memory store
- metrics.spec.ts:
  - /metricsz returns mode, uptimeSec, and version shape
- Maintain ≥98% lines/statements, ≥95% branches; mutation ≥60%.

7) CI/Deploy
- No workflow name changes. Ensure CI is green, then deploy.
- After deploy:
  - Hit /metricsz → mode "redis"
  - Post a synthetic webhook twice (same delivery ID) → first updates state, second is a no-op
  - GET /tasks/:issue_number shows proper timeline/state after restart (prove durability)

Acceptance criteria
1) Redis-backed state with TTL; in-memory fallback when REDIS_URL missing.
2) Webhook idempotency via delivery IDs; duplicates are ignored.
3) /metricsz endpoint returns expected JSON and does not expose secrets.
4) CI gates green (coverage/mutation/CodeQL/SBOM/SLSA) and successful deploy.
