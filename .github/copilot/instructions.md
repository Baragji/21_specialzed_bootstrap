# Repo instructions for GitHub Copilot – Coding Agent

## Scope & boundaries
- Only edit files under: `services/api/**`, `web/**`, `tests/**`
- Do NOT modify: `infra/**`, `migrations/**`, deployment workflows

## Task execution contract
1. Create a plan and list impacted files.
2. Implement minimal changes to meet the objective.
3. Write/adjust unit tests (Jest) and integration tests where applicable.
4. Run the CI job locally in the Actions VM; ensure tests pass.
5. Open a PR with:
   - Summary of changes
   - Test evidence and commands used
   - Risks & rollback note

## Quality gates
- Unit coverage ≥ 98% (repo-wide), mutation score ≥ 60% on changed modules
- No high/critical CodeQL findings
- SBOM (CycloneDX) + SLSA provenance emitted by CI
