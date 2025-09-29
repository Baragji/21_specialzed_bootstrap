# Repository State Report (2025-03-15)

## 1. Codebase structure and key components
- **Backend API (`services/api`)**: Lightweight Node.js 20 + TypeScript HTTP server exposing a JSON health response and bootstrap listener; packaged with Jest tests covering PORT variants, Stryker mutation settings, and a multi-stage Dockerfile for ECS deployment.
- **Frontend web module (`web`)**: TypeScript static module exporting an `add` helper and a custom build script that emits an HTML stub, with matching Jest and Stryker gating plus an Nginx-based Docker image for S3/CloudFront hosting.
- **CI/CD workflows (`.github/workflows`)**: Unified test workflow enforcing ≥98% coverage, ≥60% mutation scores, CycloneDX SBOMs, and SLSA provenance for both API and web; dedicated CodeQL analysis and deploy pipelines for ECS Fargate and S3/CloudFront triggered via OIDC.
- **Operational scripts (`scripts/`)**: Shell automation to configure AWS resources, branch protection, GitHub secrets, ECS service, and OIDC trust relationships.
- **Documentation (`docs/`, `Agent_Prompt/`)**: Research archives, master plans, and operational instructions guiding autonomous agent deployment and orchestration roadmap.

## 2. Active branches and status
- Current working branch: `work`; no additional local or remote branches observed in this snapshot.
- Working tree otherwise clean after removing transient `node_modules` artifacts created during inspection.

## 3. Issues and pull requests
- No Git-tracked issue or PR metadata present in-repo; coordination occurs through `agents.md` and supporting planning documents rather than tracked GitHub issues in this workspace snapshot.

## 4. Development goals and milestones
- Adopt Copilot Coding Agent with Cody and Amazon Q as strategic baseline, with emphasis on guardrailed CI/CD, SBOM, and provenance.
- Execute the Master Overview Plan (v0): build customer-facing UI, configure GitHub App authentication, implement orchestrator service and task templating, handle GitHub webhooks/state, add telemetry/security, deploy to AWS, and run golden task pilot.

## 5. Immediate next tasks (priority)
1. **GitHub App + minimal orchestrator webhook service (High)**: Implement Node/TypeScript service under `services/orchestrator` with verified webhook handling, Dockerization, CI, and ECS deploy workflow.
2. **Define UX + policy for task templating (High)**: Map customer UI inputs to scoped `agent_task.yml` templates with guardrails on paths, budgets, and acceptance criteria.
3. **Webhook-driven state store (Medium)**: Persist GitHub issue/PR/check events into audit-friendly tables to back the UI status views once the minimal orchestrator skeleton is live.

## 6. Dependencies and technical debt considerations
- **Runtime dependencies**: Both API and web packages currently expose only devDependencies (Jest, ts-jest, Stryker, TypeScript), indicating no production libraries beyond Node standard modules—future features may require adding runtime frameworks.
- **Quality gates**: CI enforces aggressive coverage/mutation thresholds; contributors must maintain comprehensive unit and mutation tests before merging.
- **Infrastructure dependencies**: Deployment pipelines rely on AWS ECR, ECS Fargate, S3, and CloudFront via OIDC roles with secrets configured per README.
- **Technical debt**: API and web services are scaffolds without business logic; orchestrator service, customer UI, persistence, and telemetry remain unimplemented. Existing docs highlight need for security hardening (webhook signature verification, rate limiting) and evidence-led governance.

## Critical path items
- Standing up the orchestrator webhook service unlocks downstream tasks (state store, task templating, UI integration) and is prerequisite for end-to-end Copilot-driven workflow visibility.
- Ensuring AWS OIDC roles and required secrets stay valid is essential for CI and deploy workflows to pass branch protections and maintain autonomous deployment readiness.
