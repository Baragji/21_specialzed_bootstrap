---
canonical_source: "01_Reboot_V2/docs/03_technical_debt_27082025/01_roadmap_deviation_270825.md"
golden_pack_selection: "true"
spec_coverage: ["data_state", "guardrails", "operations", "sandbox", "security"]
selection_score: "55.4"
selection_reason: "High-scoring supplementary content (Score: 55.4)"
word_count: "2675"
cluster: "agentic"
title: "1) Comprehensive codebase audit (inventory, wiring, deviations)"
canonical_id: "01-reboot-v2-1-comprehensive-codebase-audit-inventory-wiring"
---
Alright — here’s the **hard-evidence, zero-hand-waving** audit you asked for. Every statement about “what’s in your codebase and what’s running” is backed by concrete files or execution reports you provided; external claims are cited to vendor docs.

---

# 1) Comprehensive codebase audit (inventory, wiring, deviations)

## 1.1 What is **running now** (from your own acceptance logs)

* **Scaffold service (`hello`)**

  * Runtime: FastAPI `0.111.0` on Uvicorn `0.30.0` (pinned) — `services/hello/requirements.txt`.&#x20;
  * Image: built from `python:3.12-slim` — `services/hello/Dockerfile`.&#x20;
  * Compose module: `infra/modular/hello/compose.yml`, port **8091**, **real HTTP healthcheck** hitting `GET /health`; network: `core_net`.&#x20;
  * **Evidence of Up/healthy + host curls succeeding** in **Step 26** acceptance.&#x20;

* **Dify** (stack up; you asked “Dify is up, what now?”)

  * Local override exposes: `api` **5001**, `web` **3000**, `plugin_daemon` **5003** (debug/remote install only), healthcheck added; **explicit note** to keep service-to-service `PLUGIN_DAEMON_URL=http://plugin_daemon:5002`.

* **Orchestrator (Hono, Node)**

  * Package: `orchestrator/package.json` — `hono ^4.5.7`, `@hono/node-server ^1.11.2`, TS `^5.4.5`.&#x20;
  * Code: `orchestrator/src/server.ts` implements `GET /health` and **`POST /v1/workflows/run` call to Dify with a strict workflow-ID guard** via `EXPECTED_WORKFLOW_ID`. Returns 409 on mismatch and includes upstream metadata; **guarded run proof** included (workflow\_run\_id, status `succeeded`).

* **Redis**

  * Image: `redis:7-alpine`, `requirepass infini_rag_flow`, AOF enabled, healthcheck via `PING` — `infra/modular/redis/compose.yml`.&#x20;

* **MinIO**

  * Image: `minio/minio:latest`, ports **9000/9001**, healthcheck `/minio/health/ready`, creds in compose (`rag_flow` / `infini_rag_flow`) — `infra/modular/minio/compose.yml`.&#x20;
  * Your **backend** service (not the orchestrator) contains **presign endpoints** (`/uploads/presign`, `/uploads/url`, port 8088) for S3/MinIO — the code excerpt appears in your “Updated\_Codebase.xml” evidence.&#x20;

* **Elasticsearch**

  * Image: `docker.elastic.co/elasticsearch/elasticsearch:8.14.3`, single-node, xpack security disabled, healthcheck `_cluster/health` — `infra/modular/elastic/compose.yml`.&#x20;

* **Milvus**

  * There are **two modes captured**: ARM64 pin + **external etcd** variant (`user.yaml`) with thorough health validation and STOP gates in your step docs. The files include `override.pin-arm64.yml`, `user.yaml`, and step logs describing successful health.

* **RocketMQ**

  * **Compose module exists**; **dashboard image is pinned by digest** (see `rocketmq-dashboard@sha256:72cb…` block). The companion “broker boot fix brief” documents pinning/configure-by-file and a deterministic validation plan (ports 9876/10911/10912, dashboard 8080, broker success logs).
  * The **module presence and bring-up steps** are in Codebase.md task docs; exact “broker” image tag is not shown in the extracted lines here (verify directly in `infra/modular/rocketmq/compose.yml` in your repo).&#x20;

* **RAGFlow**

  * Compose and **Nginx reverse proxy** configs exist in `infra/modular/ragflow/` with `nginx/*.conf`; ports/proxy rules are specified. Current extracts show infra configs but **no MCP registration**.

> **Summary of “Up now”** (with evidence): **hello**, **Dify**, **orchestrator (Dify-guarded)** are verified; Redis/MinIO/Elastic/Milvus/RocketMQ modules exist with concrete compose + step docs; **Keycloak** module exists but was explicitly de-scoped; **backend** presign endpoints exist in code and in earlier acceptance flow.

## 1.2 Current integration points (actual)

* **Orchestrator → Dify**: `POST {DIFY_API_URL}/v1/workflows/run` with `Bearer ${DIFY_API_KEY}`, `response_mode: 'blocking'`, **guarded** by `EXPECTED_WORKFLOW_ID`.&#x20;
  *(Dify workflows/run is the correct endpoint; if no `workflow_id` is specified, Dify uses the default published one, which explains your guard logic.)* ([GitHub][1], [docs.dify.ai][2])
* **Backend → MinIO**: custom FastAPI endpoints presign PUT/GET and rewrite host for presign GET; see code tail showing `uvicorn.run(... port=8088)`.&#x20;
* **Hello service**: internal service on `core_net`, exposed on host `8091`, used as a minimal probe service (no auth).&#x20;

## 1.3 Deviations from the research roadmap

* **AgentScope not present** in orchestrator deps or code; orchestrator is Hono-only.
  *(AgentScope is a multi-agent orchestration framework; your current code does not import nor initialize it.)* ([GitHub][3], [doc.agentscope.io][4])
* **MCP (Model Context Protocol)**: No MCP client/server configuration in orchestrator or Dify config captured here; research requires **two-way MCP** and **tool registration**.  ([code.visualstudio.com][5])
* **WASM-first (SpinKube)**: No SpinKube manifests or `spin.toml` present; current execution is **container-first**. Research specifies Wasmtime LTS + policy-gated execution.  ([SpinKube][6], [fermyon.com][7])
* **Event streaming (RocketMQ) app wiring**: infra exists, **app-level producer/consumer not implemented** in orchestrator code.&#x20;
  *(Official Node client is available for later wiring.)* ([GitHub][8], [npm][9])

---

# 2) Orchestrator architecture analysis (Hono vs Hono+AgentScope)

**What you actually shipped:** a **minimal Hono service** exposing `/health` and a Dify forwarder with **workflow-ID pinning**; **no AgentScope graph, no SSE multiplexer, no event bus binding**. Files prove this: `orchestrator/src/server.ts`, `orchestrator/package.json`.

**How this differs from the **specified** architecture:**
The roadmap requires **Hono + AgentScope**, streaming (SSE), and multi-agent orchestration with MCP tool access. Your implementation is **single-hop API proxying** to Dify without **AgentScope** runtime, **no MCP**, **no SSE fan-out**, **no event-driven lanes**.  ([GitHub][3], [doc.agentscope.io][4])

**Technical debt introduced (concrete):**

* **No multi-agent topology**: cannot route tasks across planner/coder/tester or perform handoffs/hierarchies; this must be built later or migrated to AgentScope. ([doc.agentscope.io][4])
* **No tool governance via MCP**: tool discovery/registration and per-tool policy are missing; all “tools” are opaque inside Dify flows. ([code.visualstudio.com][5])
* **No SSE session model**: you can’t stream token/log events to clients or multiplex agent events. (Hono supports SSE; you just haven’t implemented it.)&#x20;
* **No event bus connectors**: orchestrator ignores RocketMQ; can’t publish job life-cycle to topics or consume results asynchronously.&#x20;

**Why this was done (factual):**
Per your **own step notes**, you prioritized getting **Dify-guarded E2E** first (“Step 25b green”) and **then** adding a live service (Step 26). That established a **thin MVP** before multi-agent/event wiring.&#x20;

---

# 3) Dify integration deviation assessment

**What is used now (provable):**

* `POST /v1/workflows/run` with **blocking** response mode; **guarding** on `workflow_id`.&#x20;
* Dify **App API key** model — consistent with docs (“Developing with APIs” shows Bearer key usage). ([docs.dify.ai][2], [docs.gitguardian.com][10])

**What the roadmap requires but is **not configured**:**

* **Two-way MCP support** (Dify as a client of MCP servers and/or exposing MCP tools to VS Code agent mode). No evidence of MCP tool registration in Dify.&#x20;
* **Tool registration/management**: Not present; your override mentions **plugin\_daemon** port **5003** for remote plugin install/health, but there’s no recorded tool catalog or MCP tool wiring.&#x20;
* **Flow composition** as primary orchestrator: You’re manually orchestrating in Node and calling one Dify workflow, rather than composing flows within Dify for cross-tool execution.&#x20;

**Why flow composition isn’t leveraged today (evidence-based):**
Because the orchestrator is **hard-wired** to call a **single workflow** via REST; nothing in the current code adjusts or chains flows at runtime, nor registers/queries tools from MCP registries.&#x20;

---

# 4) MCP server gap analysis

**Roadmap expectation:** RAGFlow running **with an MCP Server** and **VS Code Agent Mode** connected to MCP tools.&#x20;

**In repo / current state:**

* **RAGFlow**: compose + nginx present; **no MCP server registration surfaced** in the provided extracts.&#x20;
* **VS Code Agent Mode**: no repo config (no `.vscode` MCP settings, no server manifests). (Agent Mode in VS Code **does** consume MCP.) ([code.visualstudio.com][11])
* **Dify ↔ MCP**: not configured (no tool registry records provided).

**Impact:** without MCP servers, **agents lack tool surfaces** (repo ops, KB, code runner, etc.), blocking the “**autonomous coding**” loop that requires IDE/KB/tools under MCP governance. ([code.visualstudio.com][5])

---

# 5) WASM-first execution status

**Roadmap target:** **SpinKube** + **Wasmtime LTS** with **policy-gated** egress; container fallback only for native deps.  ([SpinKube][6])

**Repo reality:** no `spin.toml`, no `SpinApp` CRs, no Spin operator manifests → **container-first** posture today.&#x20;

**Implications:**

* **Security**: you do not have **deny-by-default** egress at the runtime layer that SpinKube offers (`allowed_outbound_hosts`).&#x20;
* **Scaling & latency**: you miss the **cold-start/footprint** and **multi-tenancy safeties** of wasm; container runners remain heavier. ([fermyon.com][7])

---

# 6) Scaffold service — technical rationale vs objectives

**What it is:** a **real, independently buildable** service with a **Compose healthcheck** and host-verified endpoints. It **proves the pipeline can create/run a production-shaped workload** (image build, health, networking).

**Alignment:**

* **Pro:** Exercises the **automation pipeline** (scaffold→containerize→health→expose), which is required for a **“Fully Autonomous AI Coding System.”** It forms a baseline for orchestrator fan-out and later **AgentScope** control.&#x20;
* **Con:** On its own it does **not** deliver multi-agent autonomy; it’s a **fixture** to validate orchestration/runtime, not a substitute for AgentScope + MCP wiring.

**Relationship to AgentScope:**
Once AgentScope is added to the orchestrator, this service is the **first managed micro-agent target** (e.g., a “code-scaffold tool” endpoint), and can be **exposed via MCP** as a callable tool. (Missing today.)  ([doc.agentscope.io][4])

---

# 7) Systematic deviation root-cause analysis

| Spec requirement (source)                                | Actual decision & where                                                                  | Deviation cause                                                           | Debt introduced                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Hono + AgentScope**, multi-agent graph, SSE (Roadmap)  | Hono-only orchestrator that proxies to Dify; `server.ts` + package.json.                 | “Get E2E green fast” (Step 25b), then scaffold a real service (Step 26).  | No agent graph; no SSE; later migration needed to AgentScope. |
| **Two-way MCP** (Dify + VS Code Agent Mode)              | No MCP config in orchestrator or Dify; RAGFlow MCP not registered.                       | Scope de-prioritized while stabilizing Dify + infra.                      | Missing tool governance; IDE/agent do not see tools.          |
| **Event streaming via RocketMQ** (app-level)             | RocketMQ infra present (dashboard pinned), but **no producer/consumer** in orchestrator. | Staged rollout: infra first, app wiring later.                            | No async job telemetry; no event-driven flows.                |
| **WASM-first (SpinKube)** (Roadmap)                      | No Spin/Wasmtime artifacts; container-first.                                             | K8s/SpinKube not yet bootstrapped locally.                                | Security/latency benefits of WASM absent.                     |
| **Zero-trust IAM (Keycloak, PKCE)** (Roadmap)            | Keycloak module exists but acceptance deferred; SPA PKCE step parked.                    | You explicitly postponed it to unblock pipeline MVP.                      | Public endpoints unauthenticated; must fence later.           |

*(External capability references: AgentScope multi-agent features, VS Code Agent Mode + MCP, RocketMQ client, SpinKube.)* ([doc.agentscope.io][4], [code.visualstudio.com][5], [GitHub][8], [SpinKube][6])

---

# 8) Production-readiness compliance audit

**Reliability (99.9%)** — Partial. You have **healthchecks** across services (hello, elastic, minio, redis, frontend) and **compose isolation**, but **no HA**, no **orchestrated restarts** beyond Docker Compose, no **multi-AZ**, no **SLO monitors**.

**Security (zero-trust)** — Not met. Keycloak/PKCE **deferred**; orchestrator & hello endpoints are **unauthenticated**; no service-mesh policies; secrets are in env/.env.&#x20;

**Performance (sub-second)** — Unproven. No perf baselines or **load tests** checked in; no **OTel tracing** or **profiling**. *(Hono can be fast; you have not measured.)*&#x20;

**Scalability (horizontal)** — Not met. Compose only; **no K8s**, **no HPA/KEDA**, **no topic-based scaling** for RocketMQ consumers.&#x20;

**Observability** — Missing. No **OpenTelemetry** setup, no **LLM tracing** (OpenLLMetry/Phoenix), no log shipping/metrics dashboards. *(Roadmap requires it.)*&#x20;

---

## Deliverable A — Current vs. Spec architecture (diagram)

**Current (evidence-based)**

```
[Browser/Operator]
      |
      v
[Orchestrator (Hono, Node)]
  - /health
  - POST /run_task  -->  Dify API http://api:5001/v1/workflows/run (Bearer ${DIFY_API_KEY})
  - EXPECTED_WORKFLOW_ID guard
      |
      +--> (no SSE)
      +--> (no RocketMQ producer/consumer)
      +--> (no MCP)

Infra on core_net:
  - Dify (api:5001, web:3000, plugin_daemon:5002/5003)   [override.local.yml]
  - Redis 7 (pass=infini_rag_flow)
  - MinIO (9000/9001)
  - Elastic 8.14.3
  - Milvus (ext-etcd variant available)
  - RocketMQ (compose + dashboard pinned; app wiring TBD)
  - hello-svc (8091, /health) [scaffold service]
```

**Specified (roadmap target)**

```
[VS Code Agent Mode] <---- MCP ----> [Dify (MCP tools, Flow Composition)]
       ^                                     ^
       |                                     |
      MCP                                  MCP
       |                                     |
[AgentScope Orchestrator (Hono+SSE)]
  - multi-agent planner/coder/tester
  - SSE streaming to clients
  - Event bus (RocketMQ) for jobs/logs
  - Runtime selector: WASM-first (SpinKube, Wasmtime LTS), containers as fallback
  - IAM: Keycloak OIDC/PKCE
  - Observability: OTel + LLM tracing (OpenLLMetry/Phoenix)
```

&#x20;([doc.agentscope.io][4], [code.visualstudio.com][5], [SpinKube][6])

---

## Deliverable B — Detailed **gap analysis** & **remediation steps** (actionable, evidence-linked)

1. **AgentScope orchestration (missing)**

   * **Gap:** Hono-only service; no AgentScope graph/SSE.&#x20;
   * **Remediate:** Add deps `@modelscope/agentscope`, create role graph (planner/coder/tester), implement `GET /events` SSE streaming, persist sessions, and define tool router. *(AgentScope refs).* ([GitHub][3], [doc.agentscope.io][4])
   * **Debt impact:** blocks multi-agent autonomy and deterministic retries. **Severity: High**.

2. **MCP (tools) end-to-end (missing)**

   * **Gap:** No MCP servers registered; Dify/VS Code Agent Mode not wired.
   * **Remediate:**
     a) Stand up **RAGFlow MCP Server** (as per your research doc) and configure in Dify and VS Code settings.  ([code.visualstudio.com][5])
     b) Define MCP tool contracts for **code-scaffold**, **repo ops**, **KB**.
   * **Debt impact:** tools are opaque/unmanaged; autonomy limited. **Severity: High**.

3. **Flow composition in Dify (underused)**

   * **Gap:** Single `workflows/run` call; no composed flows.&#x20;
   * **Remediate:** Model multi-step flows in Dify (tool calls via MCP) and expose specific workflow IDs; **keep EXPECTED\_WORKFLOW\_ID guard** to pin versions. *(Dify endpoint behavior.)* ([GitHub][1])
   * **Debt impact:** orchestration burden remains in Node; difficult to reuse flows. **Severity: Medium**.

4. **RocketMQ app wiring (missing)**

   * **Gap:** Infra exists; orchestrator has **no** producer/consumer.&#x20;
   * **Remediate:** Add `rocketmq-client-nodejs` producer (`jobs.events`) and consumer (`jobs.results`); use your **broker.conf** fix brief; validate via dashboard and log patterns.  ([GitHub][8], [RocketMQ][12])
   * **Debt impact:** no async/streamed progress → poor resilience & UX. **Severity: Medium-High**.

5. **WASM-first (SpinKube) (absent)**

   * **Gap:** No Spin/Wasmtime; container-first.&#x20;
   * **Remediate:** Initialize `spin.toml`, create `SpinApp` CR, install Spin Operator; move **untrusted code exec** to Wasm with **egress allow-list**.  ([SpinKube][6])
   * **Debt impact:** larger attack surface and heavier runtime. **Severity: High**.

6. **Zero-trust IAM (deferred)**

   * **Gap:** Keycloak module present but acceptance parked; no auth at orchestrator/hello.&#x20;
   * **Remediate:** Re-enable **PKCE S256** for SPA and protect orchestrator endpoints with OIDC (Hono middleware or `openid-client`), map service accounts for internal calls.
   * **Debt impact:** open endpoints; cannot meet enterprise security. **Severity: High**.

7. **Observability (missing)**

   * **Gap:** No OTel traces/metrics/logs; no LLM tracing.
   * **Remediate:** Add **OpenTelemetry SDK** to orchestrator; export to **OTel Collector**; add **OpenLLMetry/Phoenix** for LLM spans; instrument RocketMQ client.
   * **Debt impact:** blind ops; cannot hit 99.9% with confidence. **Severity: High**.

---

## Deliverable C — Technical debt assessment (quantified by blocking effect)

* **High, blocking autonomy:** AgentScope (+SSE), MCP wiring, WASM-first, Zero-trust IAM, Observability.
* **Medium-High:** RocketMQ app wiring.
* **Medium:** Dify flow composition & version pinning formalization.
  (*Each “High” item directly prevents “Fully Autonomous AI Coding System” operation described in your roadmap.*)&#x20;

---

## Deliverable D — **Prioritized roadmap** to realign to spec (surgical, no ambiguity)

**P0 — Lock current E2E & artifacts (today)**

* Tag orchestrator image + lock `EXPECTED_WORKFLOW_ID` in `.env` (already validated). Keep Dify keys per-app. **No code changes.**&#x20;

**P1 — AgentScope + SSE (orchestrator)**

* Add `@modelscope/agentscope`; implement `planner→coder→tester` demo with **SSE** endpoint `/events`. Update compose to expose SSE. *(AgentScope docs)* ([doc.agentscope.io][4])

**P2 — MCP end-to-end (RAGFlow MCP + VS Code Agent Mode + Dify)**

* Stand up **RAGFlow MCP Server** and **register** it in Dify and VS Code Agent Mode (settings). Validate with a trivial MCP tool call from IDE.  ([code.visualstudio.com][5])

**P3 — Dify flow composition**

* Model the multi-step flow inside Dify; orchestrator passes parameters + enforces `workflow_id`. Verify `/v1/workflows/run` returns the **same** `workflow_id` as pinned. ([GitHub][1])

**P4 — RocketMQ app wiring**

* Add producer/consumer in orchestrator; topics: `jobs.events`, `jobs.results`. Validate with dashboard + broker logs per your brief.  ([GitHub][8], [RocketMQ][12])

**P5 — WASM-first execution (SpinKube)**

* Add `spin.toml`, create a `code-runner-wasm` component with `allowed_outbound_hosts`, deploy via `SpinApp` CR. Route untrusted execution through WASM.  ([SpinKube][6])

**P6 — Zero-trust IAM**

* Re-enable Keycloak PKCE acceptance test (you parked it), then add OIDC to orchestrator routes. (Use Hono OIDC or `openid-client`.) **Block merges** until green. *(Keycloak PKCE references already in your notes.)*&#x20;

**P7 — Observability**

* Add **OTel** to orchestrator and RocketMQ client; set up Collector + dashboards; add **LLM tracing** (OpenLLMetry/Phoenix). **Make SLOs visible.**&#x20;

---

## Documented assumptions (explicit)

* “Up” status for **Dify** and **hello** is based on your own step evidence and your statement “Dify is up.”
* I did **not** assume RocketMQ broker image tags; only the dashboard digest is visible. Where a tag is not in the provided excerpts, I called it out as **verify in file**.&#x20;
* Backend presign endpoints are **present** (code proof), but I made **no claim** they’re currently running without corresponding `ps` output.&#x20;

---

### Appendices — key external references used

* **Dify API** (App API key & `/v1/workflows/run` usage semantics, workflow\_id behavior). ([docs.dify.ai][2], [GitHub][1])
* **AgentScope** (multi-agent orchestration). ([GitHub][3], [doc.agentscope.io][4])
* **VS Code Agent Mode + MCP** (client & server wiring). ([code.visualstudio.com][11])
* **RocketMQ** (Node client, compose quickstart). ([GitHub][8], [npm][9], [RocketMQ][12])
* **SpinKube / Wasmtime** (WASM-first ops). ([SpinKube][6], [fermyon.com][7])

---

If you want me to turn **P1** into a **commit-ready patch** (files changed + exact commands + STOP gates), say **“Ship P1”** — I’ll deliver the diff and the acceptance script in the same, unambiguous style you enforced.

[1]: https://github.com/langgenius/dify/issues/23189?utm_source=chatgpt.com "feat: Support specifying workflow version via workflow_id ..."
[2]: https://docs.dify.ai/guides/application-publishing/developing-with-apis?utm_source=chatgpt.com "Developing with APIs"
[3]: https://github.com/agentscope-ai/agentscope?utm_source=chatgpt.com "AgentScope: Agent-Oriented Programming for Building ..."
[4]: https://doc.agentscope.io/?utm_source=chatgpt.com "AgentScope"
[5]: https://code.visualstudio.com/docs/copilot/chat/mcp-servers?utm_source=chatgpt.com "Use MCP servers in VS Code"
[6]: https://www.spinkube.dev/?utm_source=chatgpt.com "SpinKube"
[7]: https://www.fermyon.com/blog/webassembly-in-azure-with-azure-kubernetes-service-and-spinkube?utm_source=chatgpt.com "WebAssembly in Azure with Azure Kubernetes Service and ..."
[8]: https://github.com/apache/rocketmq-client-nodejs?utm_source=chatgpt.com "apache/rocketmq-client-nodejs"
[9]: https://www.npmjs.com/package/rocketmq-client-nodejs?utm_source=chatgpt.com "rocketmq-client-nodejs"
[10]: https://docs.gitguardian.com/secrets-detection/secrets-detection-engine/detectors/specifics/dify_apikey?utm_source=chatgpt.com "Dify API Key | GitGuardian documentation"
[11]: https://code.visualstudio.com/blogs/2025/04/07/agentMode?utm_source=chatgpt.com "Agent mode: available to all users and supports MCP"
[12]: https://rocketmq.apache.org/docs/quickStart/03quickstartWithDockercompose/?utm_source=chatgpt.com "Run RocketMQ with Docker Compose"
