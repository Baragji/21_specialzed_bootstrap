You're right—what you need now is a crisp **build vs. buy** decision, not more landscape. Here’s a concrete, decision-grade answer that tells you **what to buy, what to configure, what to integrate, and what (little) to build**—plus the risks, effort, and acceptance criteria.

---

# Build vs. Buy — Decision & Plan

## Bottom line (recommendation)

**Buy and extend.** Use **GitHub Copilot (Coding Agent)** as the execution agent, **Sourcegraph Cody Enterprise** for repo-scale context, and **Amazon Q Developer** as an AWS-centric adjunct for security scans and code upgrades. Close the remaining gaps via **configuration + CI/CD integrations** (provenance, SBOM, gates) and build only a **thin proprietary “orchestrator”** (policies, task routing, cost/risk guardrails). Do **not** build an autonomous coding agent from scratch.
Rationale: these products already implement >70% of the autonomy and enterprise plumbing you need (agent PR loops, repo-scoped execution, enterprise/self-host options, security scanning) and integrate with your toolchain—so most gaps are addressable without heavy custom dev. ([The GitHub Blog][1])

---

## Decision tree (use this now)

1. **Can we meet privacy/compliance (zero-retention, EU processing, auditability) by configuring vendors + CI?**

   * **Yes** → **Buy & configure** Copilot Agent + Cody; add CI provenance (SLSA) and SBOM (CycloneDX). **Stop here unless a unique requirement appears.** ([SLSA][2])
   * **No** → If legal requires **air-gapped inference + self-host** for code context, **self-host Sourcegraph/Cody**, keep Copilot Agent in tightly scoped repos, or substitute more self-hosted scaffolds; still **avoid** building a model/agent from scratch. ([sourcegraph.com][3])

2. **Do we need cross-repo, monorepo-scale understanding?**

   * **Yes** → Ensure Cody Enterprise (self-host/SaaS) is the **context fabric** and let Copilot Agent or Q act on scoped tasks. ([sourcegraph.com][3])

3. **Are we heavily AWS-centric or performing major code upgrades (framework/runtime)?**

   * **Yes** → Add **Amazon Q Developer** where it’s strong (security scanning, upgrades). ([docs.aws.amazon.com][4])

4. **Regulatory horizon (EU AI Act, GPAI obligations Aug 2025)**: If you need formal technical files/logging, build **governance & evidence** layers (policies, action logs, risk register) rather than custom agents. ([Reuters][5])

---

## Gap-by-gap closure plan

(Exactly what is **Configuration**, **Integration**, or **Custom Dev**—with owners and testable acceptance criteria.)

| Gap vs Requirement                                               | Closure Type                | Owner (RACI)      | What to do (specific)                                                                                                  | Acceptance Criteria                                                                                          |
| ---------------------------------------------------------------- | --------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Autonomous task execution with safe PRs**                      | **Configuration**           | AA/DA (R), SA (C) | Enable **Copilot Coding Agent** on pilot repos; restrict to labeled issues; set one-PR-per-task; require human review. | ≥95% agent tasks produce a PR; PRs pass branch protections; logs retained. ([The GitHub Blog][1])            |
| **Cross-repo context & large monorepos**                         | **Buy + Config**            | AA (R), DA (A)    | Deploy **Sourcegraph/Cody Enterprise** (SaaS or self-host); index all GitHub Enterprise repos; wire Cody to PR review. | Context retrieval P95 < 2s; Cody answers reference correct files ≥90% in spot checks. ([sourcegraph.com][3]) |
| **Security: no high/critical vulns introduced**                  | **Buy + Config**            | SA (A), DA (R)    | Enable **Q Developer** security scanning in IDE; enforce SAST/DAST/SCA gates (SonarQube/Snyk) in CI pre-merge.         | 0 high/crit findings at merge; any high blocked by CI. ([docs.aws.amazon.com][4])                            |
| **Provenance & SBOM per PR (auditability)**                      | **Integration**             | DA (R), SA (C)    | Add **SLSA provenance (in-toto attestations)** and **CycloneDX SBOM** emission/verify steps to GitHub Actions.         | Each PR build emits signed provenance & SBOM; verification step passes; artifacts signed. ([SLSA][2])        |
| **EU AI Act (GPAI obligations Aug 2025) & ISO 42001-style AIMS** | **Configuration + Process** | SA (R), Legal (A) | Produce technical file, usage logs, DPIA, human-oversight checkpoints; map controls to **ASVS v5** & **SSDF 1.1**.     | Evidence pack complete; audit walkthrough passes; control mappings approved. ([Reuters][5])                  |
| **Zero retention / residency controls**                          | **Configuration**           | SA (R), DA (C)    | Turn on vendor privacy modes; prefer EU/EAA processing; scope repo access; redact secrets via MCP/tools.               | Vendor configs reviewed; DPA signed; quarterly privacy tests = 0 incidents. ([GitHub Docs][6])               |
| **NFR-aware designs (perf/cost/ops)**                            | **Integration + Light Dev** | AA (R), DA (C)    | Add perf/load tests & cost checks to PR template; require ADR update; provide “NFR hints” context to agents.           | NFR tests run on PR; regressions auto-blocked; ADRs updated in 95% agent PRs.                                |
| **Benchmark parity (SWE-bench-like)**                            | **Integration + Process**   | AA/DA (R)         | Stand up internal SWE-bench-style harness and “golden task” suite per language.                                        | ≥70% success on Verified-like tasks; ≥95% pass on golden tasks.                                              |

---

## Work type breakdown (so you can allocate teams)

* **Configuration (~50–60%)**: Copilot Agent org/repo policies; Cody Enterprise deployment & indexing; Q Developer IDE rollout; vendor privacy settings; branch protections. ([The GitHub Blog][1])
* **Integration (~30–40%)**: GitHub Actions templates for **SLSA provenance (in-toto)** and **CycloneDX SBOM**; SonarQube/Snyk gating; AI action logs to SIEM; ADR/NFR checks. ([SLSA][2])
* **Custom Development (~10%)**: a **thin internal orchestrator** (policy/routing), plus adapters to: (a) choose agent per task (Copilot vs Q), (b) enforce time/cost caps, (c) persist action logs, (d) inject NFR hints. No model training; no bespoke agent core.

---

## Effort, cost, and timeline (fit to your 12-week plan)

* **Phase 1 (Weeks 1–6)**

  * Stand up Cody (SaaS/self-host), enable Copilot Agent on 3–5 pilot repos, rollout Q Developer to pilot teams.
  * Add SLSA/CycloneDX to CI; wire Snyk/Sonar gates; basic orchestrator v0 (policies, routing).
  * **Effort**: ~8–12 eng-weeks DA, 4–6 SA, 4–6 AA. **Spend**: licenses + modest Actions minutes. ([The GitHub Blog][1])
* **Phase 2 (Weeks 7–10)**

  * Golden-task suite + SWE-bench-like harness; KPI instrumentation (lead time, review cycle, defect rate).
  * Tighten privacy/residency configs; produce AI Act/ISO 42001 evidence pack draft. ([Reuters][5])
* **Phase 3 (Weeks 11–12)**

  * Orchestrator v1 (cost caps, SIEM logging, NFR checks); Go/No-Go for expansion.

This keeps you within the **$2–5M (3-yr TCO)** band by avoiding bespoke agent development and focusing investment on licenses, enablement, and CI hardening.

---

## Risk: Build proprietary vs. Extend existing

| Approach                       | Benefits                                                                            | Risks                                                                                                  | Risk Level  | Mitigations                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Build agent from scratch**   | Full control, on-prem by default                                                    | High R&D cost; talent scarcity; brittle reasoning tools; heavy compliance burden; slower time-to-value | **HIGH**    | Not recommended; if pursued, start as research pilot only with rollback.                                                        |
| **Buy & extend (recommended)** | Fast value; mature integrations; vendor attestations (SOC2/27001); feature velocity | Vendor lock-in; feature gaps; residency limits in some tools                                           | **LOW–MED** | Dual-vendor pilot (Copilot + Cody + Q); self-host Cody; contract for DPAs; abstractions in orchestrator. ([sourcegraph.com][3]) |
| **Hybrid with heavy OSS**      | Lower license cost; flexibility                                                     | Integration tax; long-term maintenance; uneven support                                                 | **MED**     | Use OSS mainly in CI (SLSA/CycloneDX) and internal harnesses; avoid owning core agent logic. ([SLSA][2])                        |

---

## Exactly what to buy/configure/build

**Buy / License**

* **GitHub Copilot Enterprise (Coding Agent)** for task execution via Actions-backed VMs and PR workflow. ([The GitHub Blog][1])
* **Sourcegraph Cody Enterprise** (SaaS or self-host) for cross-repo context/RAG. ([sourcegraph.com][3])
* **Amazon Q Developer** seats for teams doing security fixes/upgrades on AWS-heavy services. ([docs.aws.amazon.com][4])

**Configure**

* Vendor privacy modes (zero retention/EU processing); repo scoping; branch protections; action logs. ([GitHub Docs][6])

**Integrate**

* GitHub Actions: **SLSA provenance (in-toto)** + **CycloneDX SBOM** generation & verification; SonarQube/Snyk as merge gates. ([SLSA][2])

**Build (thin & proprietary)**

* **Orchestrator** service (2–3 micro-features): policy engine (what tasks can run), agent router (Copilot vs Q), guardrails (time/cost caps), action-log sink → SIEM, inject NFR hints/ADR templates. No custom model training.

---

## Go/No-Go criteria (tie directly to your success targets)

* **Quality**: unit tests ≥98% pass on PR; mutation score ≥60% on touched modules; ≤1% post-deploy defects.
* **Throughput**: P95 dev lead time <24h; P90 review cycle <2h; MTTR <1h.
* **Autonomy**: ≥95% of scoped issues produce a valid PR; rollback <10 minutes.
* **Security/Compliance**: 0 high/crit findings at merge; SLSA provenance + CycloneDX SBOM verified for every PR; AI Act (GPAI) evidence pack ready. ([SLSA][2])

---

## What this means for investment allocation

* **70–80%** of budget goes to **licenses + adoption** (Copilot/Cody/Q), **CI hardening**, and **enablement**.
* **10–15%** to the **orchestrator** and adapters (your IP, but deliberately thin).
* **5–10%** to **governance artifacts** (ISO 42001-aligned AIMS, AI Act technical file, SSDF/ASVS mappings). ([owasp.org][7])

---

## Quick answers to your three asks

1. **For each gap—is it config, integration, or dev?**
   See the **Gap-by-gap closure plan** table above—explicitly labeled and testable.

2. **Should we build proprietary tech or license + integrate?**
   **License + integrate; build a thin orchestrator only.** Full custom agent is high risk/cost with no clear ROI advantage within your 12-week path.

3. **Is investment-grade achievable via configuration alone?**
   **Almost.** Everything except the small **orchestrator** and internal **benchmark harness** is config/integration. Provenance/SBOM/AI Act evidence are **process + CI** work, not new ML. ([SLSA][2])

---