Got it — you want the **closest out-of-the-box** agent that already goes from **issue → plan → code → tests → PR**, and a **linear, atomic, self-validating runbook** your AI developer can execute.

Quick correction first: **Copilot Workspace** (the Tech Preview from 2024) was **sunset on May 30, 2025**. The thing that actually does what you want *today* is **GitHub Copilot – Coding Agent**, which is **GA** as of **Sept 25, 2025**. It runs tasks asynchronously on an Actions VM and opens PRs you can iterate on via comments. ([GitHub Next][1])

# Closest out-of-the-box choice

**Use:** **GitHub Copilot – Coding Agent (GA)**
**Why:** Assign an issue to **@copilot**, it **plans, edits multi-files, runs tests in Actions, and opens a PR** for review/iteration. No custom agent to build. ([GitHub][2])

---

# Atomic execution plan (for your AI developer)

Each step has a **Goal → Actions → Validation (gates)**. Move to the next step **only if gates pass**.

## 0) Org prerequisites (once)

* **Goal:** Turn on the right products and policies.
* **Actions:**

  * Ensure org has **Copilot Enterprise/paid Copilot**; confirm **Copilot Coding Agent** is available (Agents panel).
  * Enable **GitHub Enterprise Cloud Data Residency (EU)** if required.
* **Validation:** Agent appears in **Agents panel**; org shows EU data residency in Enterprise settings. ([The GitHub Blog][3])

## 1) Baseline repo hardening

* **Goal:** PRs can’t merge without green checks and review.
* **Actions:** Add **branch protection** on `main`: required status checks, required reviews, dismiss stale approvals, require signed commits (if policy), require conversation resolution.
* **Validation:** “Merge” button disabled until checks/reviews pass. ([GitHub Docs][4])

## 2) Turn on **Code Scanning (CodeQL)**

* **Goal:** Security gates block high/critical before merge.
* **Actions:** Enable **CodeQL code scanning** (default or advanced setup) and mark its check as **required** in branch protection.
* **Validation:** CodeQL runs on PRs; any **high/critical** fails the check and blocks merge. ([GitHub Docs][5])

## 3) Add supply-chain proofs (SBOM + provenance)

* **Goal:** Every build produces a **CycloneDX SBOM** and a **SLSA in-toto provenance** attestation.
* **Actions (GitHub Actions):**

  * Generate SBOM (e.g., **CycloneDX** action or repo UI/API export).
  * Add **`actions/attest-build-provenance`** to sign provenance.
* **Validation:** Workflow artifacts include SBOM + attestation; a **verify step** succeeds. ([GitHub Docs][6])

> Minimal snippet (drop into your build job):

```yaml
- name: Generate CycloneDX SBOM (example Node)
  uses: CycloneDX/gh-node-module-generatebom@v3
  with:
    output: 'sbom.cdx.json'

- name: Attest build provenance (SLSA)
  uses: actions/attest-build-provenance@v1
  with:
    subject-path: 'dist/**'
```

## 4) Set up secure deploy auth (OIDC)

* **Goal:** No long-lived cloud keys in secrets.
* **Actions:** Configure **OIDC** trust with your cloud (AWS/Azure/GCP) and switch deploy steps to short-lived tokens.
* **Validation:** Pipelines deploy using OIDC; no static keys present. ([GitHub Docs][7])

## 5) Define “agent-safe” issue template

* **Goal:** Make tasks machine-executable and bounded.
* **Actions:** Add an **Issue template** with: scope, constraints (files/dirs), test expectations, timeout/cost caps, rollback note.
* **Validation:** New issues include these fields; reviewers confirm clarity.

## 6) **Assign a trivial issue to @copilot** (smoke test)

* **Goal:** End-to-end agent loop works.
* **Actions:** From the **Agents panel** or issue UI, assign the issue to **Copilot**; watch it create a branch, run tests in Actions, and open a PR.
* **Validation:** PR is opened with task summary; checks run; you can comment and **Copilot iterates**. ([GitHub Docs][8])

## 7) Expand to multi-file changes

* **Goal:** Validate non-trivial edits and test impact.
* **Actions:** Feed an issue that touches ≥3 files; ensure unit/integration tests exist for the target area.
* **Validation:** PR passes **all** required checks (tests + CodeQL + SBOM/provenance) before review.

## 8) Add quality bars (coverage & mutation)

* **Goal:** Prevent low-quality agent code.
* **Actions:** Add coverage & mutation jobs; mark as **required** checks.
* **Validation:** Thresholds met (e.g., unit ≥98%, mutation ≥60% on changed modules). *(Thresholds per your criteria.)*

## 9) Add SCA/DAST (if applicable) and policy gates

* **Goal:** Block vulnerable deps and insecure endpoints.
* **Actions:** Wire **SCA** (e.g., Dependabot/Snyk) and **DAST** into PR checks; mark as required.
* **Validation:** High/critical findings block merge; reports stored.

## 10) Rollback safety

* **Goal:** Ensure **<10 min** revert if a change slips through.
* **Actions:** Add **canary** deploy and **auto-rollback** on failed health checks; tag agent PRs for faster triage.
* **Validation:** Failure in canary triggers automated rollback within SLA.

## 11) Privacy/residency controls

* **Goal:** Keep data where it must be and minimize retention.
* **Actions:** Use **GitHub Enterprise Cloud data residency (EU)**; apply org **Copilot policies** as needed.
* **Validation:** Residency shows as EU; org policies enforced. ([GitHub Docs][9])

## 12) Graduate to “business issues”

* **Goal:** Prove ROI under real load.
* **Actions:** Run 50 scoped issues across 3 services; track **lead time, review time, defect rate, rollback time**, and **agent PR success rate**.
* **Validation:** Hit your success targets (P95 lead time <24h, P90 review <2h, ≤1% post-deploy defects, rollback <10m).

---

## What your AI developer actually does (tight prompts)

* **Enable agent & test:**
  “Assign issue ‘Fix typo in README, add unit test for `util.ts`’ to **@copilot**. When PR opens, comment: *‘Add an additional test for edge case X and re-run.’* Approve only if all checks pass.” ([GitHub Docs][8])
* **Scale up:**
  “Create issue: *‘Refactor `auth/` to extract token validator; add tests; keep public API stable; time cap 30 min; only touch `auth/*` and `tests/auth/*`.’* Assign to **@copilot** and enforce checks.”

---

## Why this is the simplest viable path

* **Workspace is gone; Coding Agent is GA** and purpose-built for **issue→PR autonomy**. You get **PR-centric control** plus native **Actions VM** execution. ([GitHub Next][1])
* With **branch protection + CodeQL + SBOM + SLSA + OIDC** in place, each atomic step is **production-grade** before you proceed. ([GitHub Docs][4])

If you want, I’ll convert the above into a **one-repo bootstrap PR** (Actions workflow files + branch protection checklist + issue template) your AI developer can run immediately.
