# AI Agent Instructions: Autonomous Coding System Roadmap Creator

## MISSION BRIEFING

You are tasked with creating a comprehensive roadmap to build a fully autonomous AI coding system capable of executing complete FAANG-level development pipelines. This system must take any user prompt and autonomously deliver production-ready software with enterprise-grade quality, security, and operations.

## KNOWLEDGE BASE FOUNDATION

You have access to a golden pack knowledge base containing:
- **30 documents** (151,294 words total)
- **Complete SPEC coverage** across 12 technical categories
- **Proven architectures**: UMCA (Unified Multi-Agent Coding Architecture), AVEL framework
- **Implementation evidence**: Live code analysis, execution logs, architectural audits

### Key Reference Priorities (by selection score):
1. **AVEL Guardrail Build Plan (62.0)**: Integration patterns, validation pipelines
2. **Observability & SAST Plan (61.2)**: Enterprise monitoring and security
3. **Autonomy R0 Deliverables (61.2)**: Core autonomous capabilities
4. **Report Orchestrator (58.8)**: Complete architectural audit with 1,765 lines of analysis
5. **Dify Implementation Guide (19,887 words)**: Largest implementation reference

## ROADMAP REQUIREMENTS

### Start Conditions (Hard Constraints)
- **Default Stack**: `frontend=Next.js+TypeScript`, `services=Node.js+TypeScript`, `containers=Docker`, `orchestration=Kubernetes`
- **Frozen Stack**: Changes require an explicit Gate decision with evidence and a rollback plan
- **Environments**: local → CI → staging → prod; promotion requires **Gate PASS** with attached evidence bundle
- **Out-of-Scope**: non-web embedded targets, native mobile without web backends (unless explicitly added by evidence)
- **Per-phase cost cap**: The agent must propose and adhere to a **€ cap per phase** (Phase 0 suggest €50) and report `€ used / cap`

### Standards & Evidence Policy (Version-Locked)
**Required Standards** (must cite in every phase):
- **OWASP ASVS 5.0** control IDs in acceptance criteria (Default target: **ASVS 5.0 Level 2**; justify deviations per phase)
- **NIST SSDF SP 800-218** + **SP 800-218A (AI-specific)** tasks mapped to deliverables  
- **SLSA v1.1** provenance & verification (replaces v1.0)
- **RFC 9457** Problem Details for all service errors
- **ISO/IEC 42001** alignment notes for AI governance

**Evidence Requirements**:
- **Evidence Window**: 2024-01-01 → present
- **Source Quality**: ≥2 independent primary sources per major claim
- **Recency Rule**: Prefer latest approved spec versions

### Non-Functional Targets (SLOs)
Define defaults (overridable by evidence):
- **API Latency**: p50 ≤ 300ms, p95 ≤ 900ms (staging), p95 ≤ 700ms (prod)
- **Availability**: ≥ 99.9% (monthly), error budget 43m
- **Build Time**: CI ≤ 10min; **flake rate** ≤ 1%
- **Cost Guardrail**: Per-phase TCO ceiling (agent calculates, must show BOM)

## STOP & ROLLBACK RULES

**STOP-ON-UNCERTAINTY:** Missing citation, failed gate, or unmet acceptance **must stop the roadmap at that phase**. List blockers and propose exactly **one** minimal fix path before continuing.

**Rollback triggers (numeric):** invalid `manifest.jsonl`, missing `traceId`, test flake >1%, or evidence fields (`path, sha256, bytes, timestamp, source`) missing.

### Target Architecture: FAANG-Pipeline Autonomous System
The end goal is a system that can:
- Accept natural language requirements
- Generate complete technical specifications
- Design enterprise architecture
- Implement full-stack solutions
- Execute comprehensive testing
- Deploy to production environments
- Monitor and maintain systems
- Handle incident response autonomously

### Development Approach: AI-Agent Focused
All instructions must be optimized for AI consumption with:
- Explicit, structured guidance
- Clear validation checkpoints
- Concrete implementation patterns
- Evidence-based decision criteria

## PHASE STRUCTURE REQUIREMENTS

Create a roadmap with these phase characteristics:

### Phase -1: Foundation Assessment
- Current state analysis
- Capability gap identification
- Infrastructure readiness
- Knowledge base validation

### Phase 0: Core Architecture
**Phase 0 / Item 1 — demo-l0 (Executable Proof)**
- **Command**: one command prints `READY {traceId}` → runs **one real test** → writes **evidence**
- **Evidence**: `evidence/run-{traceId}/console.txt`, `evidence/manifest.jsonl` (JSONL lines with `path, sha256, bytes, type, source, timestamp`)
- **Pass criteria**: exit 0; "1 test passed"; `READY {traceId}` present in `console.txt`
- **Stop rule**: any failure → stop, fix, rerun before proceeding

Additional Phase 0 requirements:
- UMCA system implementation
- AVEL framework integration
- Basic orchestration patterns
- Fundamental guardrails

### Phase 1-N: Progressive Capability Building
Each phase must include:
- **Specific deliverables** with acceptance criteria
- **AVEL validation** (Analysis-Validation-Execution-Logging)
- **SPEC category coverage** mapping
- **Risk mitigation** strategies
- **Evidence requirements** for progression

## CRITICAL IMPLEMENTATION PATTERNS

### 1. UMCA Architecture (from knowledge base)
- **Master Coordinator Agent (MCA)**: Central orchestration
- **Specialized Agents**: Planner, Coder, Critic roles
- **Task Graph Management**: Resource conflict resolution
- **Quality Gates**: Non-bypassable validation checkpoints

### 2. AVEL Framework (highest scoring pattern)
Every phase must implement:
- **Analysis**: Comprehensive requirement understanding
- **Validation**: Quality gate enforcement
- **Execution**: Atomic, rollback-capable operations
- **Logging**: Complete audit trail and evidence

### 3. Enterprise Standards (universal coverage)
All phases must address:
- **Security**: OWASP ASVS v5, ISO/IEC 42001 compliance
- **Operations**: Incident playbooks, disaster recovery
- **Observability**: OpenTelemetry instrumentation
- **CI/CD**: SAST, secrets management, signed artifacts

## SPECIFIC INSTRUCTIONS FOR ROADMAP CREATION

### 1. Phase Definition Structure
For each phase, provide:
```markdown
## Phase X: [Phase Name]

### Objective
[Clear, measurable goal]

### Prerequisites
[What must be completed before this phase]

### Key Deliverables
1. [Specific deliverable with acceptance criteria]
2. [Implementation patterns from knowledge base]
3. [SPEC category coverage requirements]

### AVEL Implementation
- **Analysis**: [What to analyze and how]
- **Validation**: [Quality gates and success criteria]
- **Execution**: [Step-by-step implementation]
- **Logging**: [Evidence and audit requirements]

### RACI Matrix (Per Phase)
- **MCA**: Accountable
- **Planner**: Responsible  
- **Coder**: Responsible
- **Critic/QA**: Validates
- **Ops**: Consulted
- **Human/You**: Informed

### Gate Checklist (Required for Phase Completion)
- [ ] **ASVS_5_PASS** (list control IDs covered)
- [ ] **SSDF_TASKS_DONE** (map SSDF task IDs to deliverables)
- [ ] **SLSA_V11_ATTESTED & VERIFIED** (include verification commands)
- [ ] **RFC9457_ERRORS_TESTED** (contract tests + example JSON payloads with required fields: `type`, `title`, `status`, `detail`, `instance`. Note: `type` SHOULD be a resolvable URI even if it 404s to enable centralized problem registries)
- [ ] **OTEL_TRACES_VISIBLE** (trace IDs/screenshots + span counts)
- [ ] **NO_MOCKS_ATTESTATION** (explicit statement of real implementation)

### Artifacts & Evidence Schema
- **Directory Structure**: `evidence/{phase}/`
- **Manifest**: `evidence/manifest.jsonl` with entries:
```json
{"path":"...", "sha256":"...", "bytes":123, "type":"sbom|attestation|report|log", "source":"build|scanner|generator", "timestamp":"..."}
```
- **Required Artifacts**:
  - SBOM: CycloneDX JSON format, digitally signed
  - SLSA v1.1 in-toto attestation with verification commands
  - Security scan reports with remediation evidence

### Data & Security Requirements
- [ ] **EU-only processing** (if applicable)
- [ ] **No vendor training on our data** attestation
- [ ] **PII handling** compliance documented
- [ ] **ISO/IEC 42001** alignment notes completed

### Risk Mitigation
[Identified risks and mitigation strategies]

### Success Metrics
[Quantifiable success indicators aligned with SLOs]

### Progression Criteria
[Requirements to advance to next phase]
```

### 2. Knowledge Base Integration
Reference specific documents by:
- **File name and line numbers** for implementation details
- **SPEC coverage mapping** for technical requirements
- **Evidence patterns** from execution logs
- **Architectural decisions** from ADR documents

### 3. AI-Agent Optimization
Structure all guidance for AI consumption:
- Use explicit schemas and data structures
- Provide concrete code examples where available
- Include validation scripts and test patterns
- Specify exact file structures and naming conventions

### 4. Current AI Landscape Awareness
While leveraging the knowledge base foundation:
- Acknowledge that AI capabilities evolve rapidly
- Include validation steps for current tool capabilities
- Build flexibility for emerging technologies
- Design for continuous learning and adaptation

## EXPECTED DELIVERABLES

### Primary Output: Complete Roadmap Package (exactly three)

1. **Roadmap.md** (Phases −1 → N) in **AVEL** per phase + **Gate Checklist** + **Evidence Artifacts**
2. **QuickStart_Phase-1minus.md** (this week's concrete steps)  
3. **Risk_Register.md** (risks, triggers, mitigations, owners, rollback)

## VALIDATION REQUIREMENTS

Your roadmap must:
1. **Reference the knowledge base**: Cite specific documents and line numbers
2. **Address all 12 SPEC categories**: Map coverage across phases
3. **Implement AVEL patterns**: Show Analysis-Validation-Execution-Logging
4. **Target AI agents**: Optimize for AI consumption and execution
5. **Maintain enterprise focus**: Address FAANG-level requirements

### Additional Critical Requirements:

* **Start Conditions**: Default stack (Next.js+TS; Node.js+TS; Docker→K8s), envs (local→CI→staging→prod), explicit out-of-scope list.
* **Standards (version-locked)**: ASVS **5.0**, SSDF **SP 800-218** + **800-218A (AI)**, SLSA **v1.1**, RFC **9457**, ISO/IEC **42001**. Cite IDs/sections in each phase's acceptance criteria.
* **Evidence Policy**: Window **2024-01-01 → present**, **≥2 primary sources** per claim; prefer latest approved specs.
* **SLOs**: latency p50/p95, availability, build time, flake rate, cost ceiling—numbers must appear in phase metrics.
* **Artifacts**: `evidence/{phase}/` + `evidence/manifest.jsonl` (path, sha256, bytes, type, source, timestamp). SBOM (CycloneDX), SLSA v1.1 in-toto attestation, verification commands included.
* **Gate Checklist**: ASVS5 pass, SSDF tasks, SLSA v1.1 verified, RFC9457 contract tests, OTel traces present, **No-Mocks attestation**.
* **Data & Residency**: EU-only processing toggle, "no vendor training on our data," ISO/IEC 42001 alignment note.
* **RACI**: MCA(A), Planner(R), Coder(R), Critic/QA(V), Ops(C), Human/You(I) per phase.

## SUCCESS CRITERIA

The roadmap succeeds if an AI agent can:
- Execute Phase -1 with minimal human intervention
- Progress through phases with clear validation
- Achieve autonomous coding capability by final phase
- Maintain enterprise-grade quality throughout
- Adapt to evolving AI capabilities

## EXECUTION COMMAND

Create a comprehensive roadmap document that transforms the golden pack knowledge into an executable plan for building a fully autonomous AI coding system. Focus on practical implementation while leveraging the proven patterns and architectures documented in the knowledge base.

Begin with Phase -1 and provide clear progression through to full autonomy, ensuring each phase builds systematically toward the ultimate goal of a system that can autonomously execute complete FAANG-level development pipelines.