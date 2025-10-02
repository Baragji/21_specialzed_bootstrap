# Orchestrator Service: Durable State, Idempotency, Metrics

This service persists task state to Redis with an in-memory fallback, makes GitHub webhook handling idempotent via delivery IDs, and exposes a small metrics endpoint.

## Environment variables

- REDIS_URL: Redis connection URL. When unset, the service uses a non-durable in-memory store and logs a single WARN on startup.
- REDIS_TLS: Set to "true" to enable TLS for Redis connections. Default: false.
- REDIS_PREFIX: Key prefix used in Redis to namespace data. Default: orc:.
- STATE_TTL_SEC: TTL for stored task state, timeline, and delivery-id dedupe. Default: 604800 (7 days).
- GIT_SHA: Optional commit SHA used for the metrics version field.

Existing variables (unchanged):
- GITHUB_WEBHOOK_SECRET, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, PORT

## Behavior

- Durable task state: Task records are stored as JSON in Redis with TTL; a timeline list is maintained per task (trimmed to last 50 events).
- Idempotent webhooks: Duplicate GitHub deliveries (by `x-github-delivery`) are detected and no-op with a 200 response.
- Fallback mode: If REDIS_URL is not set, the service stores state in memory only and logs a WARN once on startup.

## Metrics

- GET /metricsz returns JSON like:
  {
    uptimeSec: number,
    mode: "redis" | "memory",
    keys: { tasks: number | -1 },
    version: string
  }

- In memory mode, `keys.tasks` approximates the in-memory task count. In Redis mode, it's `-1` (to avoid expensive scans).

## Quick checks

- Verify mode: hit /metricsz and confirm `mode` is `redis` when REDIS_URL is configured.
- Verify idempotency: send the same webhook payload twice with the same `x-github-delivery`; both return 200 but the second should be a no-op.
- Verify tasks API: GET /tasks/:issue_number returns the last 25 timeline entries and the current state without changing the existing response contract.

## Notes

- The service preserves existing API contracts for POST /tasks and GET /tasks/:issue_number.
- Timeline is kept newest-first in Redis and reversed on read to chronological order; in memory it’s stored chronologically and trimmed.