# Web UI v0

A minimal React/TypeScript single-page app to create orchestrator tasks and view status.

## Environment

- ORCHESTRATOR_BASE: Base URL of the orchestrator service (e.g., https://orchestrator.example.com)

At runtime, the container entrypoint writes `/usr/share/nginx/html/config.js` with:

```
window.ORCHESTRATOR_BASE = "https://...";
```

The UI reads `globalThis.ORCHESTRATOR_BASE` during API calls.

## Build & run locally

- Build static assets:
  - `npm run build`
- Serve `web/build` via any static server or use Docker image.

## Docker

- Build: docker build -f web/Dockerfile.web -t web-ui:local web
- Run: docker run -e ORCHESTRATOR_BASE="https://orchestrator" -p 8080:80 web-ui:local

## Manual validation

1) Navigate to `/` (default):
   - Fill owner, repo, title, objective.
   - Optionally add allowedPaths, forbiddenPaths, testSpec, acceptance, labels.
   - Submit; expect Issue link and navigation to `#/status/:issue_number`.
2) On status view:
   - Verify state badge, checks, and PR/Issue links update every 5s.

## Tests & coverage

- `npm test -- --coverage` must meet thresholds (global):
  - Statements/Lines/Functions ≥ 98%
  - Branches ≥ 95%

