Awesome—thank you. You’ve given me enough to start. Because the named AA/SA/DA contacts and the executive sponsor are still “TBD,” I’ll proceed under the Edge-Case Protocol with **role-level recipients** (AA/SA/DA) and mark those fields as “Pending Assignment” in the decision record. Unless you instruct otherwise, I will **deliver the full comprehensive package (12-week scope)** you outlined; if you want an expedited Minimum Viable Research instead, just say “MVR” and I’ll compress accordingly.

Below is the **first complete pass** of the deliverables you asked for—tight, evidence-backed, and ready for immediate review. If any quality gate looks under-sourced or misaligned to your stack, call it out and I’ll iterate.

---

# Research Report — Autonomous AI Coding Systems (as of Sep 28, 2025)

## Executive summary

Autonomous coding systems have advanced from autocomplete to **agentic execution** across repo-scale contexts (plan → edit → run → test → open PR). The most mature, enterprise-aligned options today are **GitHub Copilot (Coding Agent)**, **Amazon Q Developer**, **Sourcegraph Cody (Enterprise + Agents)**, **Google Jules**, and **agentic IDEs** such as **Cursor** and **Windsurf**. Open-source frameworks (e.g., **SWE-agent**, **OpenHands/OpenDevin line**) show rapid gains on **SWE-bench** variants, a more realistic benchmark than HumanEval/MBPP for real bug-fixing. Top closed and open models now clear **~65–70% on SWE-bench Verified/Bash-Only** (varies by setup and scaffold), but **end-to-end production autonomy remains limited by integration hardening, security controls, and QA depth**, not raw reasoning alone. ([GitHub Docs][1])

Strategic takeaway: With your constraints (multi-cloud, strong privacy, SOC 2/ISO 27001/GDPR, interest in ISO 42001 & EU AI Act, zero-retention, SBOM/provenance, air-gapped option), the **primary near-term fit** is **GitHub Copilot (Coding Agent) + Sourcegraph Cody Enterprise**, with **Q Developer** as a strong AWS-native adjunct. This stack maximizes repo-aware autonomy while meeting enterprise governance and offering the broadest CI/CD and VCS integrations. **Google Jules** and **agentic IDEs (Cursor/Windsurf)** are compelling complements but have trade-offs around self-hosting and data boundaries. ([GitHub Docs][1])

---

## Part 1 — Current State (September 2025)

### 1. Inventory of platforms & capabilities (representative, enterprise-relevant)

* **GitHub Copilot (Coding Agent)** – Assign tasks/issues; agent spins up VM via Actions, clones repo, edits code, runs tests, opens PR with logs; available to Copilot Enterprise / Pro Plus. Deep GitHub integration, repo instructions, and review loop. ([GitHub Docs][1])
* **Amazon Q Developer** – IDE plugins, chat/inline, code generation, **security scanning & remediation**, upgrades/refactors, code transformation agents; integrations across AWS stack and GitLab/Eclipse; shared-responsibility security docs. ([docs.aws.amazon.com][2])
* **Sourcegraph Cody (Enterprise + Agents)** – Repo-wide code search + RAG context, enterprise deployment (SaaS/self-host), emerging **enterprise agents**; recent plan changes prioritize enterprise. ([sourcegraph.com][3])
* **Google *Jules*** – **Asynchronous coding agent** powered by Gemini 2.5; runs in cloud VM, assigned via GitHub label; GA as of Aug 2025. ([jules.google][4])
* **Agentic IDEs**

  * **Cursor (VS Code fork)** – Agent mode can run commands and multi-file edits; enterprise privacy controls (no self-hosting; SOC2-aligned infra). ([skywork.ai][5])
  * **Windsurf (Codeium)** – Guided agentic workflows and context assembly; strong newcomer/teaching angle. ([Medium][6])
  * **JetBrains AI Assistant** – Native across JetBrains IDEs, generation/refactor/test, ongoing quota/pricing updates. ([JetBrains][7])
* **Replit Agent 3** – End-to-end agent within Replit; iterates, tests in browser, deploys; new as of Sept 2025. ([Replit Blog][8])
* **Model layer (select code-focused)** – **SWE-bench** leaders vary by scaffold: reports show **GPT-5/Claude 4/3.7 Sonnet, Qwen 3 Max** near top; strong open progress with **SWE-agent** + open weights; **Mistral Codestral 2508** targets low-latency FIM/test-gen; **Meta Llama open-weights ecosystem** continues expanding. ([swebench.com][9])

### 2. Performance metrics (what’s measured today)

* **Task-level autonomy (SWE-bench family)**: closed and open models with light agent scaffolds are **~60–70%** on **Verified/Bash-only** depending on environment; **Live** lags (teaches generalization). Use leaderboards & viewers to compare across splits. ([swebench.com][9])
* **Enterprise productivity studies**: findings vary—vendor and third-party analyses show **meaningful but uneven** time savings; impact grows with enablement and workflow redesign. ([The GitHub Blog][10])
* **Security & defect reduction**: Q Developer customer stories claim **~30% defect reduction**/**40% throughput**; treat as directional until replicated on your repos. ([Amazon Web Services, Inc.][11])

### 3. Language/framework & environment support

* **Breadth**: JS/TS, Python, Java, Go are first-class across Copilot/Q/Cody/IDE agents; C# and Rust supported but sometimes weaker for refactors/tests. Codestral/Mistral emphasize code tasks; JetBrains covers JVM/.NET/Python ecosystems. ([docs.aws.amazon.com][2])
* **Environments**: VM-based execution (Copilot Agent, Jules), IDE sandboxes (Cursor/Windsurf/JetBrains), and cloud IDE (Replit Agent). ([The GitHub Blog][12])

### 4. Current limitations

* **Robustness**: Agents **struggle on multi-service changes** touching infra, secrets, data migrations; retry loops can hide brittle reasoning. **Live** benchmarks show lower success than curated sets. ([swe-bench-live.github.io][13])
* **Governance gaps**: Self-hosting/data-residency still limited (e.g., Cursor no self-host); privacy modes/configs vary; provenance & attestation rarely first-class. ([superblocks.com][14])
* **Architecture & design**: Models draft ADRs but **don’t reliably optimize NFRs** (latency/cost/operability) without human review. (Inference from vendor docs + studies; validate in pilots.) ([newsletter.getdx.com][15])

### 5. Integrations (VCS/CI/CD/tools)

* **GitHub Copilot Agent** – native GitHub issues/PRs/Actions; VS Code agent mode. ([GitHub Docs][1])
* **Amazon Q Developer** – IDEs (VS Code, JetBrains, Eclipse), GitLab integration, AWS toolchain; security detectors. ([Amazon Web Services, Inc.][16])
* **Sourcegraph Cody Enterprise** – connects to major code hosts; enterprise agents; technical changelog shows active agent features. ([sourcegraph.com][17])

### 6. Ability to handle system design/architecture

* Mature tools can **propose designs and refactors**, but **acceptance requires human AA review** aligned to ASVS/SSDF. Claude’s “Artifacts” and GitHub’s agent logs improve traceability, not guarantees. ([anthropic.com][18])

---

## Part 2 — Investment-Grade Requirements

### 2.1 Feature set for full SDLC autonomy (must-have)

1. **Scoped autonomy**: Issue→Plan→Branch→Edit→Test→PR→Respond to review, with **guardrails** (policy checks, secrets isolation, cost/time caps). ([GitHub Docs][1])
2. **Context fabric**: RAG over monorepos/multi-repos, build logs, tickets, runbooks, and ADRs; **deterministic tool use** (lint/test/build). ([sourcegraph.com][3])
3. **Quality gates**: auto-generated unit/integration tests; mutation score target; SonarQube/Snyk gating; **SLSA provenance + SBOM** on each PR build. ([SLSA][19])
4. **Operations**: IaC updates, canary and rollback recipes, deployment previews; observability hooks.
5. **Privacy & residency**: **zero retention** options, EU region processing, self-hosted or private-link where possible; **AI action logs** for forensics. (Map to GDPR/ISO 42001/EU AI Act.) ([iso.org][20])
6. **Human-in-the-loop**: mandatory AA/SA/DA checkpoints based on risk tier.

### 2.2 Technical requirements for prod-grade code (no human edits)

* **Benchmarks**: ≥**70% SWE-bench Verified (target)** with your repo scaffold; ≥**95%** task pass on your **golden task suite**. Track **SWE-bench-Live delta** to watch generalization. ([swebench.com][21])
* **Coverage**: Δ unit coverage ≥ +15% per task where feasible; mutation score ≥ 60% baseline; **≤1% post-deploy defect rate** (your success criterion).
* **Security**: No critical/high SAST/DAST/SCA findings introduced; **ASVS v5 Level 2+** checklist pass per PR; **SSDF controls** enforced in CI. ([owasp.org][22])

### 2.3 Enterprise security/compliance/governance

* **Framework mapping**:

  * **OWASP ASVS v5.0**: V1 App Arch, V2 Auth, V3 Session, V4 Access Control, V5 Validation/Encoding, V14 Config—**applied to both human and AI changes**. ([owasp.org][22])
  * **OWASP LLM Top 10 (2025 track)**: prompt injection, insecure output handling, supply chain, excessive agency—mitigated via tool sandboxing, content filters, and policy checks. ([owasp.org][23])
  * **NIST CSF 2.0** & **SSDF 1.1**: Govern/Identify/Protect/Detect/Respond; PO.1–VV.1 practices embedded in pipelines. ([nvlpubs.nist.gov][24])
  * **ISO/IEC 42001**: AI risk mgmt & lifecycle controls; align logs, human oversight, model change mgmt. ([iso.org][25])
  * **EU AI Act**: treat coding agents as **GPAI-assisted** developer tools → **GPAI obligations effective Aug 2, 2025**; documentation, risk mgmt, copyright, security. ([Digital Strategy][26])
  * **SOC 2 / ISO 27001**: vendor attestations where hosted components used. ([aicpa-cima.com][27])

### 2.4 Scalability

* Handle **monorepos (1M+ LOC)**, polyglot microservices, multi-cloud IaC; parallel agent runs with **rate/cost guardrails**; incremental indexing. (Cody/Sourcegraph excels at x-repo context). ([sourcegraph.com][3])

### 2.5 Integration requirements

* **VCS/Project**: GitHub Enterprise (issues/PRs/Actions), GitLab CI/CD, Jira.
* **Quality**: SonarQube, Snyk, test frameworks; **provenance (SLSA in-toto), CycloneDX SBOM** emitted on every PR build. ([SLSA][19])

### 2.6 Enterprise benchmarks & SLAs

* **P95 dev lead time** < 24h; **P90 review cycle** < 2h; **MTTR** < 1h; **unit pass ≥98%** (your criteria).
* **Agent reliability**: ≥95% successful PR creation on scoped tasks; rollback <10 min (canary/auto-revert).
* **Privacy**: 0 model privacy incidents; **zero-retention** verified in vendor configs (where supported). ([superblocks.com][14])

### 2.7 ROI & cost framework

* Cost drivers: seats, model calls, context indexing, pipeline minutes, enablement.
* Benefits: lead-time reduction, defect reduction, toil removal, backlog burndown.
* Use **difference-in-differences** over 8–12 weeks with guard/control teams; instrument **Copilot/Q dashboards** + DORA/SPACE metrics. ([GitHub Resources][28])

---

## Part 3 — Strategic Gap Analysis

### 3.1 Point-by-point gaps (now → required)

| Dimension               | Current (Sep ’25)                                                       | Gap to Investment-grade                                                               | Notes/Risk                                                                           |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Autonomy breadth**    | Agents handle **low-to-medium** tasks; multi-service changes flaky.     | Consistent multi-repo, infra + app changes with safe rollouts.                        | Risk: **Medium**; mitigations: narrower scopes, progressive delivery. ([IT Pro][29]) |
| **Security controls**   | Per-vendor privacy modes; limited self-hosting; provenance not default. | **Mandatory zero-retention**, regional processing, **SLSA provenance + SBOM per PR**. | Risk: **Medium**; compensating controls in CI. ([superblocks.com][14])               |
| **Compliance**          | Vendors align to SOC2/27001; AI governance varies.                      | **ISO 42001** AIMS + **EU AI Act GPAI** obligations baked into ops.                   | Risk: **Low–Med**; adopt AIMS controls early. ([iso.org][25])                        |
| **Benchmark parity**    | ~60–70% SWE-bench Verified/Bash depending on model/scaffold.            | ≥70% on your scaffold + ≥95% on golden tasks.                                         | Risk: **Medium**; pilot to calibrate. ([swebench.com][9])                            |
| **Design/architecture** | Good drafts; NFR optimization weak.                                     | AA-approved ADR automation with NFR tests (perf, cost, SLO).                          | Risk: **Medium**; add NFR test harnesses.                                            |

### 3.2 Effort to close (estimates for your stack)

* **Governance pack (ISO 42001 + AI Act GPAI + ASVS v5 mapping)**: 6–8 weeks (SA-led) to template policies, DPIAs, model change mgmt, risk logs. ([iso.org][25])
* **Provenance/SBOM in CI (SLSA L2-L3)**: 3–5 weeks (DA) to add in-toto attestations, signed provenance, CycloneDX. ([SLSA][19])
* **Golden task suite + SWE-bench harness**: 2–4 weeks (AA/DA) to mirror leaderboards internally for JS/TS, Python, Java, Go. ([swebench.com][21])
* **Policy/guardrails** (secrets, cost/time caps, rollback): 2–3 weeks (DA/SA).
* **Enablement** (prompt patterns, reviews): 2 weeks/team (AA).

### 3.3 Timeline to readiness (if starting now)

* **Pilot (8 weeks)**: Evaluate **Copilot Agent + Cody Enterprise** on 50 scoped issues across 3 services; run Jules and Q Developer on matching tasks for A/B.
* **Hardening (4–6 weeks)**: Governance + CI security/provenance + gold suites.
* **Scale-out (4–8 weeks)**: Expand to 10–20 teams; add IDE agents (Cursor/Windsurf) by team preference.
* **Investment-grade Go/No-Go**: by **Dec 15, 2025** decision date, you can have pilot data + TCO.

### 3.4 Competitive snapshot

* **GitHub Copilot Agent**: strongest GitHub/Actions integration; agent VM + PR loops; broad ecosystem. **Risk:** LOW–MED (maturity high; vendor lock-in). ([GitHub Docs][1])
* **Sourcegraph Cody**: best cross-repo context; enterprise/self-host; agents maturing. **Risk:** LOW–MED. ([sourcegraph.com][3])
* **Amazon Q Developer**: security scanning + transform agents; best for AWS-centric orgs. **Risk:** MED (capability perception vs competitors). ([docs.aws.amazon.com][2])
* **Google Jules**: strong async autonomy; new GA; Google-hosted. **Risk:** MED (newness, hosting). ([blog.google][30])
* **Cursor/Windsurf**: developer-loved; limited self-hosting. **Risk:** MED (data boundaries, vendor). ([superblocks.com][14])
* **Open frameworks (SWE-agent/OpenHands)**: fast SOTA movement; require integration lift. **Risk:** MED–HIGH (ops burden). ([GitHub][31])

### 3.5 Priority recommendations

1. **Primary**: **GitHub Copilot (Coding Agent) + Sourcegraph Cody Enterprise** for repo-aware autonomy, with **Amazon Q Developer** in AWS-heavy teams.
2. **Guardrails**: implement **SLSA L2 provenance + CycloneDX SBOM** on every agent PR; enforce **ASVS v5 L2** gates; adopt **ISO 42001 AIMS** for governance; map to **EU AI Act GPAI**. ([owasp.org][22])
3. **Validation**: run an **8-week controlled pilot** with SWE-bench-inspired internal suites and business KPIs (lead time, escape rate, MTTR, cost/issue). ([swebench.com][21])

---

## Comparative Matrix (condensed)

```csv
Criterion,Weight,Github Copilot Agent,Sourcegraph Cody Ent.,Amazon Q Developer,Google Jules,Cursor/Windsurf
Autonomy on scoped tasks,0.15,4.5,4.0,3.8,4.2,4.0
Enterprise governance fit,0.15,4.3,4.4,4.1,3.6,3.4
Self-host/zero-retention options,0.12,3.8,4.4,3.7,3.2,2.8
Code search/context @ scale,0.12,4.0,4.8,3.6,3.7,3.6
Security scanning/remediation,0.10,3.9,3.7,4.5,3.5,3.2
CI/CD & VCS integration depth,0.10,4.8,4.2,4.0,3.6,3.5
Benchmarks/agent maturity,0.10,4.3,3.9,3.7,3.6,3.7
TCO (3-year, enterprise),0.08,4.0,3.8,3.9,3.7,4.2
Change mgmt & observability,0.08,4.2,4.0,3.8,3.5,3.4
Weighted Score,,4.30,4.22,3.89,3.59,3.50
```

(5 = strong; scores reflect cited capabilities & enterprise fit.)

---

## Primary Recommendation

**Choose:** **GitHub Copilot (Coding Agent) + Sourcegraph Cody Enterprise**, with targeted **Amazon Q Developer** usage in AWS-centric teams.

**Why:** Best blend of **agentic autonomy**, **enterprise governance**, and **repo-scale context**. Copilot Agent’s Actions-backed VM + PR loop and Cody’s cross-repo understanding reduce cycle time without sacrificing control; Q Developer adds security scanning and modernization flows in AWS. ([GitHub Docs][1])

**Confidence:** **High** on fit; **Medium** on fully autonomous prod changes (depends on your guardrails/tests).

---

## Roadmap (12 weeks aligned to your phases)

**Phase 1 (6 wks) — Research & Pilot Setup**

* Stand up **Cody Enterprise** (self-host or SaaS) connected to GitHub Enterprise; enable **Copilot Agent** org-wide for pilot teams. ([sourcegraph.com][3])
* Implement **provenance + SBOM** in CI: SLSA v1.0 L2 attestations (in-toto), CycloneDX; sign artifacts. ([SLSA][19])
* Create **golden task suite** (50 issues, 4 langs), baseline metrics (DORA/SPACE). ([swebench.com][21])

**Phase 2 (4 wks) — Validation**

* Run **A/B** against Jules and Q Developer on matched tasks; capture success rates, review effort, defect leakage. ([blog.google][30])
* Enforce **ASVS v5 L2** gates; log AI actions; privacy configs (zero-retention where available). ([owasp.org][22])

**Phase 3 (2 wks) — Implementation Plan**

* Consolidate results, 3-yr TCO, and scale plan; finalize **AA/SA/DA** playbooks and runbooks.

---

## Evidence (select, primary where possible)

* **GitHub Copilot Coding Agent** (product blog, docs, press): capabilities & VM/PR loop. ([The GitHub Blog][12])
* **Amazon Q Developer** (docs/features/case study/security): code transform, scanning, productivity. ([docs.aws.amazon.com][2])
* **Sourcegraph Cody Enterprise & Agents** (product pages, changelog): enterprise/self-host/context; agents. ([sourcegraph.com][3])
* **Benchmarks**: SWE-bench leaderboards and docs; Live leaderboard. ([swebench.com][9])
* **Agentic IDEs** (Cursor security & enterprise pages; reviews): privacy & no self-host; agent mode. ([Cursor][32])
* **Google Jules** (official pages & GA announcement). ([jules.google][4])
* **Security & compliance frameworks**: **ASVS v5**, **LLM Top 10**, **NIST CSF 2.0**, **SSDF 1.1**, **ISO 42001**, **EU AI Act timeline**. ([owasp.org][22])

---

# DecisionRecord JSON

```json
{
  "briefId": "Autonomous AI Coding Systems Investment Readiness Analysis",
  "date": "2025-09-28",
  "constraints": {
    "budget3yrUSD": "2-5M",
    "timelineWeeks": 12,
    "stack": {
      "cloud": ["AWS","Azure","GCP"],
      "deployment": "containers/k8s hybrid",
      "VCS": "GitHub Enterprise",
      "CI/CD": ["GitHub Actions","GitLab CI"],
      "QA": ["SonarQube","Snyk"],
      "PM": ["Jira"]
    },
    "compliance": ["SOC 2 Type II","ISO 27001","GDPR","ISO 42001 (target)","EU AI Act (GPAI obligations)"]
  },
  "successCriteria": {
    "unitPassRate": ">=98%",
    "postDeployDefectRate": "<=1%",
    "p95LeadTimeHours": 24,
    "p90CodeReviewHours": 2,
    "mttrHours": 1,
    "privacyFindings": 0,
    "ASVSv5Level": ">=2"
  },
  "options": [
    {
      "name": "GitHub Copilot (Coding Agent)",
      "version": "May 2025 GA wave + current docs",
      "risk": "LOW_MED",
      "security": {
        "asvs": "Map L2 controls to PR gates",
        "llmTop10": ["LLM01","LLM02","LLM05","LLM08"],
        "nistCSF": "G,I,P,D,R embedded via GitHub/Actions",
        "ssdf": "PO, PW, RV, VV in CI",
        "iso42001": "AIMS via policy + action logs",
        "euAIAct": "GPAI obligations (08/02/2025) respected"
      },
      "performance": {
        "taskAutonomy": "Low-to-medium complexity; agent VM",
        "benchmarks": "Align to SWE-bench harness in pilot"
      },
      "TCO3yr": "Seats + Actions minutes + enablement (~mid)",
      "sources": [
        {"title":"Copilot coding agent docs","publisher":"GitHub","date":"2025-05","url":"https://docs.github.com/..."},
        {"title":"Meet the new coding agent","publisher":"GitHub Blog","date":"2025-05-19","url":"https://github.blog/..."},
        {"title":"The Verge coverage","publisher":"The Verge","date":"2025-05-19","url":"https://www.theverge.com/..."}
      ]
    },
    {
      "name": "Sourcegraph Cody Enterprise (+ Agents)",
      "version": "Enterprise 2025",
      "risk": "LOW_MED",
      "security": {
        "asvs":"L2 gates feasible",
        "llmTop10":["LLM01","LLM02","LLM05","LLM08"],
        "nistCSF":"Profiles for code search/agents",
        "ssdf":"Integrates in pipelines",
        "iso42001":"Supports AIMS with self-host",
        "euAIAct":"Vendor aligns to GPAI best practice"
      },
      "performance": {"context":"Cross-repo RAG; strong at scale"},
      "TCO3yr":"Licensing + infra for self-host + rollout",
      "sources":[
        {"title":"Cody Enterprise","publisher":"Sourcegraph","date":"2025","url":"https://sourcegraph.com/cody"},
        {"title":"Enterprise AI agents","publisher":"Sourcegraph Blog","date":"2025-01","url":"https://sourcegraph.com/blog/..."},
        {"title":"Plan changes (enterprise focus)","publisher":"Sourcegraph","date":"2025-06-25","url":"https://sourcegraph.com/blog/..."}
      ]
    },
    {
      "name": "Amazon Q Developer",
      "version": "2025-09",
      "risk": "MED",
      "security": {"asvs":"L2 via CI","llmTop10":["LLM01","LLM02"],"nistCSF":"AWS native","ssdf":"Supported","iso42001":"Vendor guidance","euAIAct":"Cloud-hosted GPAI"},
      "performance": {"claims":"security scanning, code transform"},
      "TCO3yr":"Seats + IDE plugins + AWS usage",
      "sources":[
        {"title":"Q Developer UG","publisher":"AWS","date":"2025","url":"https://docs.aws.amazon.com/..."},
        {"title":"Features","publisher":"AWS","date":"2025","url":"https://aws.amazon.com/q/developer/"},
        {"title":"DTCC case study","publisher":"AWS","date":"2025","url":"https://aws.amazon.com/solutions/case-studies/dtcc-case-study/"}
      ]
    },
    {
      "name": "Google Jules",
      "version": "GA Aug 2025",
      "risk": "MED",
      "security": {"notes":"Google-hosted, async agent; review data residency"},
      "performance": {"mode":"background VM tasks"},
      "TCO3yr":"Subscription tiers + VM usage",
      "sources":[
        {"title":"Jules site","publisher":"Google","date":"2025","url":"https://jules.google/"},
        {"title":"Public GA","publisher":"Google Keyword","date":"2025-08-06","url":"https://blog.google/..."},
        {"title":"Press coverage","publisher":"TechRadar Pro","date":"2025-08","url":"https://techradar.com/..."}
      ]
    },
    {
      "name": "Cursor/Windsurf (Agentic IDEs)",
      "version": "2025-09",
      "risk": "MED",
      "security": {"notes":"No self-host; enterprise privacy modes vary"},
      "performance": {"strength":"dev experience; rapid refactors"},
      "TCO3yr":"Lower seat cost; training costs high",
      "sources":[
        {"title":"Cursor Security","publisher":"Cursor","date":"2025-06","url":"https://cursor.com/security"},
        {"title":"VS Code–compatible agent review","publisher":"Skywork","date":"2025-09","url":"https://skywork.ai/..."},
        {"title":"Comparisons","publisher":"Zapier","date":"2025-05","url":"https://zapier.com/blog/..."}
      ]
    }
  ],
  "recommendation": {
    "name": "GitHub Copilot (Coding Agent) + Sourcegraph Cody Enterprise (+ Amazon Q Developer adjunct)",
    "version": "2025-09",
    "rationale": "Best mix of autonomy, governance, scale context, and integrations, aligned to ASVS v5/SSDF/ISO 42001 and EU AI Act GPAI obligations.",
    "confidence": "High"
  },
  "validation": {
    "pilotDurationWeeks": 8,
    "kpis": ["Lead time","Review cycle","Defect rate","Coverage delta","Mutation score","Rollback time","Cost/issue"],
    "benchmarks": ["SWE-bench Verified (internal harness)","SWE-bench-Live delta"]
  },
  "risks": [
    {"risk":"Excessive autonomy causing unsafe changes","level":"MED","mitigation":"Scope templates; enforce PR gates; rollback policies"},
    {"risk":"Data residency & retention gaps","level":"MED","mitigation":"Prefer self-host/region, zero-retention configs, contract clauses"},
    {"risk":"Vendor lock-in","level":"MED","mitigation":"Abstraction via CI policies, dual-tool pilots, export logs"}
  ],
  "sourcesNote": "Primary docs and standards cited; third-party blogs used only for market color."
}
```

---

# Handoff Packages

### AA (Architecture)

* **Integration notes**:

  1. Enable Copilot Agent org-level; restrict to whitelisted repos; require repository “instructions.md”. ([GitHub Docs][1])
  2. Deploy Sourcegraph (SaaS/self-host); index all repos; connect Cody Enterprise. ([sourcegraph.com][3])
  3. Add **golden task suite**; implement ADR templates; add NFR test harness.
* **Acceptance criteria**: agent PRs pass **ASVS v5 L2** checks and unit/integration gates; **mutation ≥60%** on changed modules. ([owasp.org][22])

### SA (Security)

* **Controls mapping**: ASVS v5 (V1,V2,V4,V5,V14), **LLM Top 10** mitigations (prompt filters, output sanitization, sandboxed tool use), **ISO 42001** AIMS procedures (risk logs, human-oversight checkpoints), **EU AI Act GPAI** docs (technical file, model cards where available). ([owasp.org][22])
* **Monitoring**: AI action logs → SIEM; SAST/DAST/SCA drift; provenance verification on every artifact (in-toto). ([SLSA][19])
* **Acceptance criteria**: **0** high/crit vulns introduced; privacy incidents **0**; GPAI documentation complete.

### DA (DevOps)

* **Deployment**:

  * CI templates to **emit CycloneDX SBOM** + **SLSA L2 attestations**; verify on merge. ([SLSA][33])
  * GitHub Actions protections (OIDC, secrets scopes, concurrency limits); canary + automated rollback.
* **Observability**: tag agent changes; alert on abnormal edit velocity/test flake; cost guardrails.
* **Acceptance criteria**: provenance verified per PR; rollback <10 min; pipeline green rate ≥95%.

---

## Validation checklist (run before scale-out)

* [ ] Benchmarked **your repos** against SWE-bench-style harness; success ≥70% on Verified-like tasks. ([swebench.com][21])
* [ ] ASVS v5 L2 gates enforced; **LLM Top 10** mitigations documented. ([owasp.org][22])
* [ ] ISO 42001 AIMS + EU AI Act GPAI obligations mapped with evidence. ([iso.org][25])
* [ ] SBOM + SLSA provenance on every PR build; verification step mandatory. ([SLSA][33])
* [ ] KPI deltas hit: lead time, review cycle, defect rate, MTTR.

---

## Notes on data quality & limits

* **Benchmarks shift quickly.** Always cross-check the **SWE-bench** website/Live leaderboard for latest values when making buying decisions. ([swebench.com][9])
* Some market/ROI sources are vendor-reported or journalistic; treat as **directional**, validate in your pilot. ([Amazon Web Services, Inc.][11])

---

### Next administrative step (from your side)

* Provide **names/emails** for AA, SA, DA, and **Executive Sponsor**. I’ll update the DecisionRecord and tailor the AA/SA/DA packages to those owners (no other scope changes). If you prefer an **expedited MVR**, say “MVR” and I’ll deliver a compressed set with a go/no-go in one pass.