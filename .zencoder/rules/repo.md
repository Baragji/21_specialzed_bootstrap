---
description: Repository Information Overview
alwaysApply: true
---

# Bootstrap Project Information

## Summary
A template repository for setting up autonomous coding with GitHub Copilot Coding Agent, featuring comprehensive security and quality gates. The project includes a Node.js/TypeScript API backend and a React frontend with deployment pipelines to AWS ECS/ECR and S3/CloudFront.

## Structure
- `.github/` - GitHub workflows, Copilot instructions, and issue templates
- `services/api/` - Node.js/TypeScript API backend
- `web/` - React frontend application
- `scripts/` - Utility scripts including branch protection setup
- `docs/` - Documentation and research materials
- `Agent_Prompt/` - AI agent system prompts and instructions

## Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: Node.js v20 (specified in .nvmrc)
**Build System**: npm
**Package Manager**: npm

## Dependencies
While specific dependencies aren't listed in the repository template, the project is configured to use:
- Jest for testing
- Stryker for mutation testing
- CycloneDX for SBOM generation

## Build & Installation
```bash
# API
cd services/api
npm ci
npm run build
npm test -- --coverage

# Web
cd web
npm ci
npm run build
npm test -- --coverage

# Mutation testing
npx stryker run
```

## Docker
**API Dockerfile**: `services/api/Dockerfile.api`
**Web Dockerfile**: `web/Dockerfile.web`
**Configuration**: 
- API: Multi-stage build with Node.js 20 Alpine, exposing port 3000
- Web: Multi-stage build with Node.js 20 Alpine for build and Nginx for serving

## CI/CD
**Workflows**:
- `ci.yml`: Runs tests, coverage checks (≥98%), mutation testing (≥60%), generates SBOMs, and SLSA provenance
- `codeql.yml`: Security scanning for JavaScript/TypeScript
- `deploy-backend.yml`: Builds and deploys API to AWS ECS via OIDC
- `deploy-frontend.yml`: Builds and deploys web to AWS S3/CloudFront via OIDC

## Testing
**Framework**: Jest
**Test Location**: Within each project directory
**Coverage Threshold**: 98% line coverage, 90% branch coverage
**Mutation Threshold**: 60% minimum score
**Run Command**:
```bash
npm test -- --coverage
npx stryker run
```

## Security & Compliance
- CodeQL scanning blocks high/critical findings
- CycloneDX SBOMs generated for both projects
- SLSA provenance attestation for build artifacts
- AWS OIDC authentication (no long-lived keys)

## GitHub Copilot Integration
- Configured for autonomous issue → plan → code → test → PR workflow
- Agent task template with constraints and acceptance criteria
- Restricted to modifying only `services/api/`, `web/`, and `tests/` directories