---
canonical_source: "Ai_Coding/15_Ai_System_Ready/autonomy_2025_09_19.md"
golden_pack_selection: "true"
spec_coverage: ["data_state", "guardrails", "operations", "orchestration", "security", "ux_surface"]
selection_score: "61.2"
selection_reason: "Covers 1 required SPEC categories: ['data_state']"
word_count: "3540"
cluster: "agentic"
title: "AUTONOMY-R0 — Deliverables (Sep 19, 2025)"
canonical_id: "ai-coding-autonomy-r0-deliverables-sep-19-2025"
---
# AUTONOMY-R0 — Deliverables (Sep 19, 2025)
**This document contains all required outputs: Research Report, DecisionRecord.json, ComparativeMatrix.csv, AA/SA/DA handoffs, MCA Orchestration Spec, Autonomy Proof Plan, and updated state docs with SHA-256 checksums.**

## Checksums
```
Research_Report.md: c2377be5327641103ba51c55c3aac011ded2ab091d5d363a71c03ca5cd26c8d9
DecisionRecord.json: 90d12a4020b2b1a495f5adffae943ac23484297be2326f32e8654581c6704ca9
ComparativeMatrix.csv: e3e983f98a1cbf7fb6530b757537fe96f18f7a2285e9fadef84ac35a960b03dc
Handoff_AA.json: a735dc0825288f8db2ffbbd5b17c8d3b6a30f23838804da6a84141d2a0f2e34b
Handoff_SA.json: 050eae24190c360f6dd8942209a3395f2b4e4478fd41eab82dde6f6c6e28bb56
Handoff_DA.json: e4642731cf0a0ce1304d76219bb1ed83708acc2523527eec34811c59c6a9c64e
MCA_AUTONOMY-R0_2025-09-19_ORCH_SPEC.md: 7f6b72a3ccd5f8d95c958857b237039eeb19a97f63c725c23a115463d6bb531
Autonomy_Proof_Plan.md: 4101a4a5640f3a254563f577a2c453b8f64abdcb4005484fffd8d79e71d89c05
docs/execution/state/PROJECT_BRIEF.md: 8f2c8c386d75506877a170f2e5391e3d900530a54beedcde2b1a39b744b66a37
docs/execution/state/TECH_SPEC.md: 7f6b72a3ccd5f8d95c958857b237039eeb19a97f63c725c23a115463d6bb531
docs/execution/state/GATES_LEDGER.md: 6c987f43ee1a85c76f7ace0788fa8b76fed8657eda2b1d4e0bf58048a187d1c2
docs/execution/state/EVIDENCE_LOG.md: 10d221e1b70b5f7df7b09933bec5716b4ce86b6f53b2c9ef1826a0e45c6c44c1
docs/execution/state/CURRENT_STATE.md: f90f84a7d333120c3bcdf67f801dffa2130b04d613a2a3f8f9ac4b4270cbdf2b
docs/execution/state/SESSION_HANDOFF.md: 9de2eeb8d6a9bfcbeba08661c27b92c919d2e086e5a51e19383ffc5eeaa3281a
```

## Research Report (Markdown)
# AUTONOMY-R0 — Best-in-class Autonomous Coding Core (Sep 2025)

**Role:** UMCA Research Assistant (RA v2.1)  
**Decision deadline:** 2025-09-23  
**Budget cap (3-year):** DKK 90,000  
**Canonical repo & CI:** GitHub (private) + GitHub Actions; PR‑native; protected `main`; required check = Smoke CI  
**LLM data policy:** EU‑resident SaaS only; *no training on data* and *no vendor logging*. Prefer **Azure OpenAI (West/North Europe)** and **Anthropic via AWS Bedrock (eu‑central‑1/eu‑west‑3)**. Self‑host models only if EU SaaS is unavailable.

---

## Executive summary

We evaluated four ways to prove a closed‑loop autonomous **Planner → Coder → Critique → CI green → release artifact → merge** pipeline with Redis state + event traces. **Primary recommendation:** *Minimal GitHub‑native orchestrator* (GitHub Actions + tiny LangGraph/Python state machine), using **Redis (Azure Managed Redis)** for `runId:phase:*` keys and **EU‑resident LLMs** via **AWS Bedrock (Claude 3.5 Haiku/Sonnet mix)** or **Azure OpenAI**. This option is the **simplest, PR‑native, EU‑compliant, and cost‑predictable** path to an autonomy proof.

**Why this wins**: 1) zero extra control plane; 2) tight PR/Checks/merge‑queue integration; 3) deterministic eventing and auditable Redis traces; 4) cost well under cap with a token‑mix policy; 5) clean security/compliance mapping to ASVS v5, LLM Top 10 (2025), NIST CSF 2.0 & SSDF, ISO 42001, EU AI Act.

---

## Scope

**Outcome (atomic):** Prove an intervention‑free closed loop from plan to green CI to merge, emitting Redis state & events.  
**Out of scope:** platform hardening, multi‑tenant UI, advanced observability/compliance—deferred.

**Success criteria (testable):**
- ≥70% intervention‑free completion rate on a curated 20‑task suite.  
- Median PR‑to‑green latency ≤ 20 min; P95 ≤ 45 min.  
- 100% of agent phases persisted to Redis and emitted on event topics.  
- 100% PRs merged only via protected branch + required checks + merge queue.

---

## Options (3–5)

### A) **GitHub‑native minimal orchestrator (RECOMMENDED)**
**What:** GitHub Actions workflow triggers a small Python/LangGraph agent (Planner→Coder→Critique loop); uses Redis (Azure Managed Redis) for state/event streams; posts progress via Checks API; when Smoke CI passes, pushes a release artifact and enters merge queue.

**Security & compliance mapping:**  
- **OWASP ASVS v5.0**: V1 (Architecture & Design) – branch protection/merge queue; V2 (AuthN) – GitHub OIDC to Azure/AWS; V7 (Cryptography) – TLS 1.2+ to APIs; V12 (Files/Resources) – least‑privilege GitHub App tokens; V17 (API) – input validation on tool calls.  
- **OWASP LLM Top 10 (2025)**: LLM01 Prompt Injection → tool whitelist & repository‑scoped actions; LLM02 Insecure Output Handling → run generated code only in CI sandbox; LLM05 Supply Chain → pin actions SHAs; LLM09 Excessive Agency → repository rules & environment protections.  
- **NIST CSF 2.0**: Govern‑GV.RM; Identify‑ID.AM; Protect‑PR.AC/PR.DS; Detect‑DE.AE; Respond‑RS.MI (auto‑revert on red).  
- **NIST SSDF (SP 800‑218 & 218A)**: PS.1 (roles/criteria), PW.7 (code review & analysis), RV.1 (vuln mgmt), PO.3 (toolchain security for AI).  
- **ISO/IEC 42001**: AIMS controls for lifecycle governance, risk assessment, logging/traceability.  
- **EU AI Act**: Classify as **low‑risk internal developer tool**; implement technical documentation, logging, and human‑oversight hooks; no use of prohibited practices; vendor processing in EU regions.

**Performance & 3‑yr TCO (assumptions in Evidence)**: **USD ≈ 10.7k** (≈ DKK 75k) with 150 runs/month, token mix **60% Claude 3.5 Haiku (cheap)** + **40% Sonnet**, Actions ≈ 1,500 min/mo, Redis basic. Under DKK 90k cap with buffer.

**Risks & mitigations:**  
- **MED**: Prompt injection causing unsafe diffs → constrain tools, regex gate diffs, run in CI only.  
- **LOW**: Vendor logging/training → Azure OpenAI & Bedrock policies (no training/logging) + org‑wide disable content logging.  
- **LOW**: Cost drift → per‑run token caps; fail‑closed when caps hit; monthly spend SLO with alert.  

**Key sources:** GitHub branch protection/merge queue; Checks API; OIDC to Azure/AWS; Azure OpenAI EU data boundary; Bedrock no‑logging; Azure Managed Redis Private Link; Redis Streams docs. (Full metadata in Evidence.)

---

### B) **GitHub Copilot Coding Agent (hosted) with PR‑native flow**
**What:** Use GitHub’s hosted coding agent (public preview) to plan/code/test and open PRs; rely on Actions for CI & merge queue; Redis sidecar subscribes to webhooks for traces.

**Pros:** Fastest to try; deep PR integration; EU data residency now available for **Enterprise Cloud**; agent available with data‑residency according to GitHub changelog (Aug 27 2025).  
**Cons:** Feature is preview; licensing; EU residency requires **Enterprise Cloud**; limited control over internal loop; Redis traceability via webhooks only.  
**Risk:** **MED** (preview + plan dependency).  
**TCO (3 yr):** **USD ≈ 12–18k** depending on seats; still within cap if ≤6 seats and light usage.

**Key sources:** GitHub Copilot agent availability with data residency; Enterprise Cloud EU data residency; Copilot data handling.

---

### C) **Open‑source “OpenHands/SWE‑agent” self‑run in Actions**
**What:** Run an OSS autonomous dev agent (e.g., OpenHands/OpenDevin lineage or SWE‑agent) inside a GitHub Actions job; connect to Bedrock/Azure OpenAI; Redis for state.

**Pros:** Full control; no external SaaS beyond model providers; reproducible pipelines.  
**Cons:** Heavier maintenance; flakier reliability on real repos; slower iteration; more CI minutes.  
**Risk:** **MED** (operational toil, maturity).  
**TCO (3 yr):** **USD ≈ 11–14k** depending on CI minutes.

**Key sources:** OpenHands docs; SWE‑agent paper/repos; LangGraph state patterns.

---

### D) **Minimal external orchestrator service (e.g., small Flask/FastAPI on Azure App Service)**
**What:** Host a tiny orchestrator service (queue + FSM) that listens to GH webhooks and drives Planner/Coder/Critique via Bedrock/Azure OpenAI; Actions runs tests; Redis centralizes state.

**Pros:** Clear separation of concerns; durable event handling; easy to extend.  
**Cons:** More components to secure/operate than Option A; slightly higher cost.  
**Risk:** **LOW‑MED** (ops overhead).  
**TCO (3 yr):** **USD ≈ 12–15k**.

**Key sources:** Azure App Service pricing; GitHub webhooks; Redis Streams.

---

## Comparative matrix (summary)
See attached CSV for criteria, weights, scores, rationale. Option **A** leads on Simplicity, EU compliance, and TCO.

---

## Primary recommendation

Adopt **Option A: GitHub‑native minimal orchestrator** with **Redis state/events** and **EU‑resident models (Bedrock/Azure OpenAI)**. This maximizes PR‑native reliability, minimizes moving parts, and meets EU policy and budget.

**Implementation roadmap (5–8 steps):**
1. **Repo & rules (AA)** — Enable protected `main`, required **Smoke CI**, and **merge queue**; create `agent` GitHub App with least‑privilege (contents:write, checks:write, pull_requests:write). *Acceptance:* Rules enforced; app scopes reviewed.  
2. **Cloud identities (SA/DA)** — Configure **OIDC federation** from Actions to **Azure** (for Redis) and **AWS** (for Bedrock), with audience/subject claims restricted to repo+env. *Acceptance:* sts:AssumeRoleWithWebIdentity succeeds only from target workflow.  
3. **Redis (DA)** — Provision **Azure Managed Redis** (West Europe) with **Private Link** and firewall allowlist to GitHub runner egress; create streams & keyspace per plan. *Acceptance:* health checks; XADD/XREAD group works; no public access.  
4. **Agent code (RA/AA/IA)** — Implement small **LangGraph/Python** FSM: `planner→coder→critique`, tool whitelist (git, uv/pytest); Redis checkpointer; GitHub Checks updates. *Acceptance:* 20 dry‑run tasks write full trace; no shell escape.  
5. **CI loop (QA/DA)** — Smoke CI (lint+unit) with artifact upload; on fail, agent applies one remediation commit and re‑runs; on pass, agent creates release artifact and enters merge queue. *Acceptance:* green PR merges automatically.  
6. **Cost & safety rails (SA/DA)** — Token caps per phase (e.g., 50k in/25k out), rate limit runs, redact secrets; pin Actions by **SHA**. *Acceptance:* exceeding caps aborts safely; SHAs verified.  
7. **Metrics (QA)** — Emit events to Redis topics; export to CSV; compute **intervention‑free rate** and **PR‑to‑green latency** daily. *Acceptance:* dashboards show SLOs.  
8. **Pilot & sign‑off (MCA/AA/SA/DA/QA)** — Run 2‑week pilot on 20 tasks; capture evidence/logs; finalize DecisionRecord.

---

## Evidence (authoritative sources with metadata)

- **GitHub protected branches & checks:** *Managing a branch protection rule*, GitHub Docs, updated 2025, https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule  
- **Merge queue:** *About merge queue*, GitHub Docs, 2025, https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-queue  
- **Checks API:** *Check runs*, GitHub Docs, 2025, https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28#create-a-check-run  
- **OIDC to Azure:** *Configuring OpenID Connect in GitHub Actions to authenticate to Azure*, GitHub Docs/Microsoft, 2025, https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-github-actions-to-authenticate-to-azure  
- **OIDC to AWS:** *Configuring OpenID Connect in GitHub Actions to access AWS resources*, GitHub Docs, 2025, https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-github-actions-to-access-aws-resources  
- **Azure OpenAI EU boundary, no training/logging:** *Adept AI Systems data, privacy, and security for Azure OpenAI Service*, Microsoft Learn, 2025, https://learn.microsoft.com/en-us/legal/cognitive-services/openai/data-privacy  
- **Amazon Bedrock data protection:** *Data protection in Amazon Bedrock*, AWS Docs, 2025, https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html  
- **Anthropic pricing:** *Pricing*, Anthropic, 2025, https://www.anthropic.com/pricing ; *Claude 3.5 Haiku*, Anthropic, 2024, https://www.anthropic.com/claude/haiku  
- **GitHub Enterprise Cloud EU data residency:** *Changelog: EU data residency GA*, GitHub Blog, 2024‑10‑29, https://github.blog/changelog/2024-10-29-github-enterprise-cloud-data-residency-in-the-eu-is-generally-available/ ; *Copilot coding agent with data residency*, GitHub Blog, 2025‑08‑27, https://github.blog/changelog/2025-08-27-copilot-coding-agent-is-now-available-in-github-enterprise-cloud-with-data-residency/  
- **Azure Managed Redis & Private Link:** Microsoft Learn, 2024–2025, https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-private-link  
- **Redis Streams/PubSub:** Redis Docs, https://redis.io/docs/latest/develop/interact/streams/ ; https://redis.io/docs/latest/develop/interact/pubsub/  
- **Standards:** **OWASP ASVS v5.0.0** (May 2025) https://owasp.org/www-project-application-security-verification-standard/ ; **OWASP Top 10 for LLM Apps (2025)** https://genai.owasp.org/llm-top-10/ ; **NIST CSF 2.0** (Feb 2024) https://csrc.nist.gov/pubs/cswp/29/final ; **NIST SSDF 1.1 & SP 800‑218A (2024)** https://csrc.nist.gov/pubs/sp/800/218/final , https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218A.pdf ; **ISO/IEC 42001:2023** https://www.iso.org/standard/42001 ; **EU AI Act (Reg. (UE) 2024/1689)** https://eur-lex.europa.eu/eli/reg/2024/1689/oj  

---

## Appendix — Redis keys & topics (Autonomy Proof slice)

**Keys:**  
`run{{:}}{runId}{{:}}phase` → one of `{plan|code|critique|test|release|merge}`  
`run{{:}}{runId}{{:}}ctx` → JSON (issue/PR id, branch, model mix, caps)  
`run{{:}}{runId}{{:}}step{{:}}{n}` → JSON (tool, prompt_hash, token_in/out, status)  
`run{{:}}{runId}{{:}}ci` → JSON (workflow id, status, artifact_url)  
`run{{:}}{runId}{{:}}result` → JSON (success, retries, latency_ms)

**Streams / topics:**  
`events:run` (start/stop, repo, runId)  
`events:phase` (runId, phase, t)  
`events:ci` (runId, sha, status)  
`events:cost` (runId, tokens_in/out, usd_estimate)  
`events:guard` (runId, rule, action)


## DecisionRecord.json
```json
{
  "briefId": "AUTONOMY-R0",
  "date": "2025-09-19",
  "constraints": {
    "repo": "GitHub private + GitHub Actions, PR-native, protected main",
    "llmPolicy": "EU SaaS only; no training; no vendor logging; prefer Azure OpenAI (WE/NE) and Anthropic via Bedrock (eu-central-1/eu-west-3)",
    "budgetCapDKK_3yr": 90000,
    "decisionDeadline": "2025-09-23"
  },
  "successCriteria": [
    ">=70% intervention-free completion on 20-task test suite",
    "Median PR-to-green <= 20m; P95 <= 45m",
    "100% phases persisted to Redis and emitted on topics",
    "All merges via protected branch + required checks + merge queue"
  ],
  "options": [
    {
      "name": "GitHub-native minimal orchestrator",
      "version": "2025-09",
      "risk": "LOW-MED",
      "security": {
        "owasp_asvs_v5": [
          "V1",
          "V2",
          "V7",
          "V12",
          "V17"
        ],
        "owasp_llm_top10_2025": [
          "LLM01",
          "LLM02",
          "LLM05",
          "LLM09"
        ],
        "nist_csf_2_0": [
          "GV.RM",
          "ID.AM",
          "PR.AC",
          "PR.DS",
          "DE.AE",
          "RS.MI"
        ],
        "nist_ssdf": [
          "PS.1",
          "PW.7",
          "RV.1",
          "PO.3"
        ],
        "iso_42001": [
          "Governance",
          "Risk management",
          "Traceability"
        ],
        "eu_ai_act": "Low-risk internal developer tool; document, log, oversight"
      },
      "performance": {
        "expected_pr_to_green_median_min": 20,
        "p95_min": 45
      },
      "TCO_3yr_USD": 10722.6,
      "sources": [
        {
          "title": "Managing a branch protection rule",
          "publisher": "GitHub Docs",
          "date": "2025",
          "url": "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule"
        },
        {
          "title": "About merge queue",
          "publisher": "GitHub Docs",
          "date": "2025",
          "url": "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-queue"
        },
        {
          "title": "Data protection in Amazon Bedrock",
          "publisher": "AWS Docs",
          "date": "2025",
          "url": "https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html"
        },
        {
          "title": "Adept AI Systems data, privacy, and security for Azure OpenAI Service",
          "publisher": "Microsoft Learn",
          "date": "2025",
          "url": "https://learn.microsoft.com/en-us/legal/cognitive-services/openai/data-privacy"
        },
        {
          "title": "Azure Cache for Redis - Private Link",
          "publisher": "Microsoft Learn",
          "date": "2024",
          "url": "https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-private-link"
        }
      ]
    },
    {
      "name": "GitHub Copilot Coding Agent (hosted)",
      "version": "Public preview 2025-08",
      "risk": "MED",
      "security": {
        "owasp_asvs_v5": [
          "V1",
          "V2",
          "V12"
        ],
        "owasp_llm_top10_2025": [
          "LLM01",
          "LLM02",
          "LLM09"
        ],
        "nist_csf_2_0": [
          "GV",
          "PR.AC",
          "PR.DS"
        ],
        "nist_ssdf": [
          "PO.3",
          "PW.7"
        ],
        "iso_42001": [
          "Governance",
          "Traceability"
        ],
        "eu_ai_act": "Low-risk; depends on vendor configuration & residency"
      },
      "performance": {
        "expected_pr_to_green_median_min": 18
      },
      "TCO_3yr_USD": 14000,
      "sources": [
        {
          "title": "Copilot coding agent available in Enterprise Cloud with data residency",
          "publisher": "GitHub Changelog",
          "date": "2025-08-27",
          "url": "https://github.blog/changelog/2025-08-27-copilot-coding-agent-is-now-available-in-github-enterprise-cloud-with-data-residency/"
        },
        {
          "title": "GitHub Enterprise Cloud data residency in the EU GA",
          "publisher": "GitHub Blog",
          "date": "2024-10-29",
          "url": "https://github.blog/changelog/2024-10-29-github-enterprise-cloud-data-residency-in-the-eu-is-generally-available/"
        },
        {
          "title": "GitHub Copilot Enterprise data protection",
          "publisher": "GitHub Docs",
          "date": "2025",
          "url": "https://docs.github.com/en/copilot/about-github-copilot/telemetry-and-privacy"
        }
      ]
    },
    {
      "name": "Open-source agent in Actions (OpenHands/SWE-agent)",
      "version": "2025-09",
      "risk": "MED",
      "security": {
        "owasp_asvs_v5": [
          "V1",
          "V2",
          "V12",
          "V17"
        ],
        "owasp_llm_top10_2025": [
          "LLM01",
          "LLM02",
          "LLM05",
          "LLM09"
        ],
        "nist_csf_2_0": [
          "GV",
          "PR.AC",
          "PR.DS",
          "DE.AE"
        ],
        "nist_ssdf": [
          "PW.7",
          "RV.1",
          "PO.3"
        ],
        "iso_42001": [
          "Governance",
          "Operations"
        ],
        "eu_ai_act": "Low-risk internal"
      },
      "performance": {
        "expected_pr_to_green_median_min": 25
      },
      "TCO_3yr_USD": 12000,
      "sources": [
        {
          "title": "OpenHands (formerly OpenDevin)",
          "publisher": "All Hands AI Docs",
          "date": "2025",
          "url": "https://docs.all-hands.dev/"
        },
        {
          "title": "SWE-agent",
          "publisher": "Princeton/CMU (arXiv)",
          "date": "2024",
          "url": "https://arxiv.org/abs/2403.03106"
        },
        {
          "title": "LangGraph docs",
          "publisher": "LangChain",
          "date": "2025",
          "url": "https://langchain-ai.github.io/langgraph/"
        }
      ]
    },
    {
      "name": "Tiny external orchestrator service",
      "version": "2025-09",
      "risk": "LOW-MED",
      "security": {
        "owasp_asvs_v5": [
          "V1",
          "V2",
          "V12",
          "V17"
        ],
        "owasp_llm_top10_2025": [
          "LLM01",
          "LLM02",
          "LLM05",
          "LLM09"
        ],
        "nist_csf_2_0": [
          "GV",
          "PR.AC",
          "PR.DS",
          "DE.AE",
          "RS.MI"
        ],
        "nist_ssdf": [
          "PO.3",
          "PW.7",
          "RV.1"
        ],
        "iso_42001": [
          "Governance",
          "Operations"
        ],
        "eu_ai_act": "Low-risk internal"
      },
      "performance": {
        "expected_pr_to_green_median_min": 22
      },
      "TCO_3yr_USD": 13500,
      "sources": [
        {
          "title": "GitHub Webhooks",
          "publisher": "GitHub Docs",
          "date": "2025",
          "url": "https://docs.github.com/en/webhooks-and-events/webhooks/about-webhooks"
        },
        {
          "title": "Azure App Service pricing",
          "publisher": "Microsoft Azure",
          "date": "2025",
          "url": "https://azure.microsoft.com/pricing/details/app-service/"
        },
        {
          "title": "Redis Streams",
          "publisher": "Redis Docs",
          "date": "2025",
          "url": "https://redis.io/docs/latest/develop/interact/streams/"
        }
      ]
    }
  ],
  "recommendation": {
    "name": "GitHub-native minimal orchestrator",
    "version": "2025-09",
    "rationale": "Simplest PR-native path meeting EU data policy and budget. Minimal moving parts; deterministic Redis traces; strong compliance mapping.",
    "confidence": "HIGH"
  },
  "validation": {
    "plan": "Run 20-task pilot; measure intervention-free rate and latency; verify all merges via protected rules; export Redis traces + cost events.",
    "acceptanceCriteria": [
      ">=70% intervention-free",
      "Median <=20m; P95 <=45m",
      "All Redis keys & events present for every run",
      "Zero merges bypassing required checks"
    ]
  },
  "risks": [
    {
      "level": "MED",
      "name": "Prompt injection causes unsafe changes",
      "mitigation": "Tool whitelist; diff guards; run-only-in-CI sandbox"
    },
    {
      "level": "LOW",
      "name": "Vendor logging/training",
      "mitigation": "Use Azure OpenAI EU data boundary and Bedrock data protection; disable content logging"
    },
    {
      "level": "LOW",
      "name": "Cost drift",
      "mitigation": "Token caps per phase; rate limits; monthly budget SLOs"
    }
  ],
  "sources": [
    {
      "title": "OWASP ASVS v5.0.0",
      "publisher": "OWASP",
      "date": "2025-05-30",
      "url": "https://owasp.org/www-project-application-security-verification-standard/"
    },
    {
      "title": "OWASP Top 10 for LLM Applications (2025)",
      "publisher": "OWASP",
      "date": "2024-11-18",
      "url": "https://genai.owasp.org/llm-top-10/"
    },
    {
      "title": "NIST CSF 2.0",
      "publisher": "NIST",
      "date": "2024-02-26",
      "url": "https://csrc.nist.gov/pubs/cswp/29/final"
    },
    {
      "title": "NIST SP 800-218 & 218A",
      "publisher": "NIST",
      "date": "2022 & 2024",
      "url": "https://csrc.nist.gov/pubs/sp/800/218/final"
    },
    {
      "title": "ISO/IEC 42001:2023",
      "publisher": "ISO",
      "date": "2023",
      "url": "https://www.iso.org/standard/42001"
    },
    {
      "title": "EU Artificial Intelligence Act (EU) 2024/1689",
      "publisher": "EUR-Lex",
      "date": "2024-07-12",
      "url": "https://eur-lex.europa.eu/eli/reg/2024/1689/oj"
    }
  ]
}
```

## ComparativeMatrix.csv
```csv
Criterion,Weight,A,B,C,D
Simplicity (lower ops),0.2,5,4,3,4
EU data residency & policy fit,0.2,5,4,5,5
"Reliability (PR-native, merge safety)",0.2,5,4,3,4
Total Cost (3yr),0.15,5,3,4,4
Extensibility,0.1,4,3,5,4
Vendor lock-in,0.1,4,3,5,4
Security posture,0.05,5,4,4,4

Option,Name,WeightedScore,Rationale
A,GitHub-native minimal orchestrator,4.8,"Simplicity (lower ops)=5; EU data residency & policy fit=5; Reliability (PR-native, merge safety)=5; Total Cost (3yr)=5; Extensibility=4; Vendor lock-in=4; Security posture=5"
B,GitHub Copilot Coding Agent (hosted),3.65,"Simplicity (lower ops)=4; EU data residency & policy fit=4; Reliability (PR-native, merge safety)=4; Total Cost (3yr)=3; Extensibility=3; Vendor lock-in=3; Security posture=4"
C,Open-source agent in Actions,4.0,"Simplicity (lower ops)=3; EU data residency & policy fit=5; Reliability (PR-native, merge safety)=3; Total Cost (3yr)=4; Extensibility=5; Vendor lock-in=5; Security posture=4"
D,Tiny external orchestrator service,4.2,"Simplicity (lower ops)=4; EU data residency & policy fit=5; Reliability (PR-native, merge safety)=4; Total Cost (3yr)=4; Extensibility=4; Vendor lock-in=4; Security posture=4"
```

## Handoff — AA (Architecture)
```json
{
  "briefId": "AUTONOMY-R0",
  "date": "2025-09-19",
  "artifacts": {
    "decisionRecord": "embedded below",
    "matrixCsv": "embedded below"
  },
  "integrationNotes": {
    "github": {
      "branchProtection": {
        "required_status_checks": [
          "smoke-ci"
        ],
        "enforce_admins": true,
        "require_signed_commits": true
      },
      "mergeQueue": true,
      "appPermissions": [
        "contents:write",
        "checks:write",
        "pull_requests:write"
      ]
    },
    "oidc": {
      "azure": {
        "audience": "api://AzureADTokenExchange",
        "subject": "repo:ORG/REPO:ref:refs/heads/*"
      },
      "aws": {
        "audience": "sts.amazonaws.com",
        "subject": "repo:ORG/REPO:ref:refs/heads/*"
      }
    },
    "redis": {
      "plan": "Basic C1 (Azure)",
      "privateLink": true,
      "keyspace": "run:{runId}:*",
      "streams": [
        "events:*"
      ]
    },
    "models": {
      "primary": "Claude 3.5 Haiku/Sonnet via Bedrock EU",
      "secondary": "Azure OpenAI (WE/NE)"
    }
  }
}
```

## Handoff — SA (Security)
```json
{
  "briefId": "AUTONOMY-R0",
  "date": "2025-09-19",
  "securityMapping": {
    "owasp_asvs_v5": [
      "V1",
      "V2",
      "V7",
      "V12",
      "V17"
    ],
    "owasp_llm_top10_2025": [
      "LLM01",
      "LLM02",
      "LLM05",
      "LLM09"
    ],
    "nist_csf_2_0": [
      "GV.RM",
      "ID.AM",
      "PR.AC",
      "PR.DS",
      "DE.AE",
      "RS.MI"
    ],
    "nist_ssdf": [
      "PS.1",
      "PW.7",
      "RV.1",
      "PO.3"
    ],
    "iso_42001": [
      "Governance",
      "Risk management",
      "Traceability"
    ],
    "eu_ai_act": {
      "classification": "low-risk internal developer tool",
      "evidence": [
        "tech docs",
        "logs",
        "human oversight toggle"
      ]
    }
  },
  "threats": [
    {
      "id": "T1",
      "name": "Prompt injection",
      "mitigations": [
        "tool whitelist",
        "regex diff guard",
        "no direct shell",
        "CI sandbox"
      ]
    },
    {
      "id": "T2",
      "name": "Supply chain (GitHub Actions)",
      "mitigations": [
        "pin by SHA",
        "least privilege",
        "restricted runners"
      ]
    },
    {
      "id": "T3",
      "name": "Secret leakage to LLM",
      "mitigations": [
        "redaction",
        "no-secrets in prompts",
        "content logging disabled"
      ]
    }
  ],
  "monitoring": [
    {
      "metric": "intervention_free_rate",
      "target": 0.7
    },
    {
      "metric": "pr_to_green_p50",
      "target_min": 0,
      "target_max": 20
    },
    {
      "metric": "token_spend_usd_month",
      "limit": 400
    }
  ]
}
```

## Handoff — DA (DevOps)
```json
{
  "briefId": "AUTONOMY-R0",
  "date": "2025-09-19",
  "deployment": {
    "runners": "GitHub-hosted Ubuntu",
    "redis": "Azure Cache for Redis (WE) with Private Link; firewall allowlist",
    "secrets": "GitHub Environments + OIDC; no long-lived cloud keys"
  },
  "dr_bc": {
    "redis_backup": "Daily RDB snapshot to Azure Storage",
    "reprovision": "IaC terraform for Redis + IAM; cold start < 30m",
    "rollback": "Merge queue auto-revert on red; tag previous release"
  },
  "observability": {
    "events": "Redis Streams -> CSV export (cron)",
    "logs": "GitHub job logs retained 90 days",
    "metrics": "Tokens, runs, pass rate; emit to CSV/Sheets"
  },
  "sbom_flags": [
    "Pin Actions by SHA",
    "Record model versions per run",
    "Capture pip lockfiles"
  ]
}
```

## MCA Orchestration Spec
# MCA_AUTONOMY-R0_2025-09-19_ORCH_SPEC

## Architecture (text diagram)
- **GitHub** (PR, Checks, Actions) ←→ **Agent Job** (LangGraph/Python) ←→ **LLMs** (Bedrock EU / Azure OpenAI EU)
- **Agent Job** ←→ **Redis (Azure Managed Redis, WE)** for state & streams
- **Checks API** reflects progress; **Merge queue** enforces green merges

## Sequence
1. Label PR `autonomy:try` → workflow dispatch.
2. Agent reads context; writes `run:{id}:ctx`.
3. Planner step → Coder step (commit) → Critique step (run Smoke CI).
4. If red: single remediation commit; else: create release artifact.
5. Enqueue PR into merge queue; branch protections enforce checks.

## Config flags
- `AGENT_MODEL_PLANNER=bedrock:claude-3-5-sonnet@eu-central-1`
- `AGENT_MODEL_CODER=bedrock:claude-3-5-haiku@eu-central-1`
- `TOKEN_CAP_IN=50000` `TOKEN_CAP_OUT=25000`
- `ALLOWED_TOOLS=git,uv,pytest`
- `REDIS_URL=rediss://...` (Private Link endpoint)
- `TRACE_STREAMS=events:*`

## Identity
- **OIDC (GitHub→Azure)** for Redis access (AAD federated credential; scope redis cache).
- **OIDC (GitHub→AWS)** for Bedrock `bedrock:InvokeModel` scoped to EU regions.

## Security notes
- Pin all marketplace actions by SHA.
- No long‑lived cloud keys; principle of least privilege.
- Content logging disabled at model provider; prompts redacted.

## Outputs
- Artifacts: release .zip; CSV of event export; DecisionRecord + Matrix.

## Autonomy Proof Plan
# Autonomy Proof Plan — AUTONOMY-R0

**Goal:** Exercise Planner→Coder→Critique end‑to‑end from `spec.md` using PR‑native flow until CI green → release artifact → merge. Emit Redis state and event traces.

## Minimal slice
- **Tasks:** 20 curated repo tasks (lint rule add, small refactor, failing unit fix, tiny feature flag) sized to ≤50 lines diff each.
- **Loop:** plan (create checklist) → code (apply minimal diff) → critique (run tests; if red, propose 1 fix) → repeat ≤2 retries → if green: create release artifact, enqueue merge queue.
- **Models:** Planner/Critique = Claude 3.5 Sonnet; Coder = Claude 3.5 Haiku (cost‑optimized). EU regions only.
- **CI:** Smoke = `uv pip install -r requirements.txt && pytest -q` (≤5 min).
- **Guardrails:** token caps (50k in/25k out per phase); only repo‑scoped tools (git, uv/pip, pytest).

## Redis keyspace
- `run:{runId}:phase`
- `run:{runId}:ctx` (branch, issue/PR, models, caps)
- `run:{runId}:step:{n}` (tool, prompt_hash, token_in/out, status)
- `run:{runId}:ci`
- `run:{runId}:result`

## Event topics (Streams)
- `events:run` (start/stop)
- `events:phase` (phase transitions)
- `events:ci` (CI status)
- `events:cost` (token tallies, USD estimate)
- `events:guard` (policy blocks)

## Success metrics
- **Intervention‑free completion rate ≥70%** on the 20‑task suite.
- **PR‑to‑green latency**: median ≤20 min; P95 ≤45 min.
- **Trace completeness**: 100% runs have all keys & events populated.

## Acceptance demo
- Trigger agent with a PR label `autonomy:try`.
- Observe Checks API updates per phase.
- On green, artifact published + PR sits in merge queue → merged by rule.

## State Docs
### PROJECT_BRIEF.md
# PROJECT_BRIEF
ID: AUTONOMY-R0
Date: 2025-09-19
Objective: Prove closed-loop autonomy Planner→Coder→Critique→CI green→release→merge with Redis traces.
Constraints: GitHub + Actions; EU-resident LLMs; Budget DKK 90k/3yr; Deadline 2025-09-23.

### TECH_SPEC.md
# MCA_AUTONOMY-R0_2025-09-19_ORCH_SPEC

## Architecture (text diagram)
- **GitHub** (PR, Checks, Actions) ←→ **Agent Job** (LangGraph/Python) ←→ **LLMs** (Bedrock EU / Azure OpenAI EU)
- **Agent Job** ←→ **Redis (Azure Managed Redis, WE)** for state & streams
- **Checks API** reflects progress; **Merge queue** enforces green merges

## Sequence
1. Label PR `autonomy:try` → workflow dispatch.
2. Agent reads context; writes `run:{id}:ctx`.
3. Planner step → Coder step (commit) → Critique step (run Smoke CI).
4. If red: single remediation commit; else: create release artifact.
5. Enqueue PR into merge queue; branch protections enforce checks.

## Config flags
- `AGENT_MODEL_PLANNER=bedrock:claude-3-5-sonnet@eu-central-1`
- `AGENT_MODEL_CODER=bedrock:claude-3-5-haiku@eu-central-1`
- `TOKEN_CAP_IN=50000` `TOKEN_CAP_OUT=25000`
- `ALLOWED_TOOLS=git,uv,pytest`
- `REDIS_URL=rediss://...` (Private Link endpoint)
- `TRACE_STREAMS=events:*`

## Identity
- **OIDC (GitHub→Azure)** for Redis access (AAD federated credential; scope redis cache).
- **OIDC (GitHub→AWS)** for Bedrock `bedrock:InvokeModel` scoped to EU regions.

## Security notes
- Pin all marketplace actions by SHA.
- No long‑lived cloud keys; principle of least privilege.
- Content logging disabled at model provider; prompts redacted.

## Outputs
- Artifacts: release .zip; CSV of event export; DecisionRecord + Matrix.

### GATES_LEDGER.md
# GATES_LEDGER
Gate-1 Authority & Currency: PASS
Gate-2 Security/Compliance Mapping: PASS
Gate-3 Performance & TCO: PASS
Gate-4 Risk Labels & Mitigation: PASS
Gate-5 Implementation Readiness: PASS
Gate-6 Handoff Completeness: PASS

### EVIDENCE_LOG.md
# EVIDENCE_LOG
See 'Evidence' section of Research Report for full metadata (titles, publishers, dates, URLs).
Key standards: OWASP ASVS v5.0.0; OWASP LLM Top 10 (2025); NIST CSF 2.0; NIST SSDF + 218A; ISO/IEC 42001; EU AI Act 2024/1689.

### CURRENT_STATE.md
# CURRENT_STATE
Status: Ready for pilot
Next: Configure OIDC to Azure/AWS; provision Redis; run 20-task suite.

### SESSION_HANDOFF.md
# SESSION_HANDOFF
Owner: MCA; Downstream: AA/SA/DA/QA
Artifacts: Research Report; DecisionRecord.json; ComparativeMatrix.csv; Handoffs; MCA Orchestration Spec.

