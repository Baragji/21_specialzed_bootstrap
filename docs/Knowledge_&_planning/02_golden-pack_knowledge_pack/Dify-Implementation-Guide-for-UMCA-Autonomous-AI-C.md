---
canonical_source: "Dify_run/Dify_Implementation_Guide.md"
golden_pack_selection: "true"
spec_coverage: ["guardrails", "operations", "orchestration", "security", "ux_surface"]
selection_score: "55.2"
selection_reason: "High-scoring supplementary content (Score: 55.2)"
word_count: "19865"
cluster: "agentic"
title: "Dify Implementation Guide for UMCA Autonomous AI Coding System (MCA-led)"
canonical_id: "dify-run-dify-implementation-guide-for-umca-autono"
source_path: "Dify_run/Dify_Implementation_Guide.md"
first_seen: "2025-09-26"
tags: "['ai-as-dev', 'agentic', 'mcp', 'rag', 'eval_guardrail']"
ai_signals: "['agentic', 'mcp', 'rag', 'eval_guardrail', 'ci_gate', 'observability', 'governance', 'playbook', 'research']"
duplicates_of: "null"
summary: "**Owner:** Research AI (RA) under MCA direction **Objective:** Determine and build the optimal configuration of **Dify** (apps, workflows, agents, tools, RAG, MCP integrations) to implement the UMCA a..."
---

# Dify Implementation Guide for UMCA Autonomous AI Coding System (MCA-led)

**Version:** 2.0  
**Date:** 2025-09-11  
**Owner:** Research AI (RA) under MCA direction  
**Objective:** Determine and build the optimal configuration of **Dify** (apps, workflows, agents, tools, RAG, MCP integrations) to implement the UMCA autonomous AI coding system **from scratch**. The **MCA** (Master Coordinating Agent) will orchestrate **7 specialist agents** via Dify. If any 2025-era frameworks surpass Dify for critical capabilities, provide evidence and a pivot plan.

## 0\) Non-Negotiable Operating Rules

1. **Evidence before claims:** All recommendations are backed by primary sources (official docs, code, issue threads) and verified tests. No unsupported assumptions.

2. **UMCA-specific mapping:** Every finding ties to UMCA’s requirements (the autonomous coding spec and MCA orchestration), not generic demos.

3. **Concrete Dify assets:** Present exact Dify components (app types, workflow nodes, connections, variables) and how they interconnect. No abstract placeholders.

4. **Build from zero:** Assume an empty Dify workspace. The guide details creating every app, agent, workflow and loading all system prompts from scratch.

5. **MCA-centric control:** The MCA remains the single top-level orchestrator; specialist agents only handle domain-specific subtasks. RA (Research Agent) coordinates research steps but does not override MCA’s authority.

6. **Pivot clarity:** If Dify cannot meet an essential feature (e.g. long-lived stateful memory, complex tool chaining), present a stronger alternative (LangGraph, AutoGen, or MCP-native orchestrator) with evidence and a minimal migration path.

## 1\) Research Scope (Deep Dive Targets)

**Core Dify Capabilities:** Dify offers a visual **Workflow builder** with diverse nodes for logic and control flows: conditional branches (IF/ELSE)[\[1\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=IF%2FELSE), iterative loops[\[2\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=A%20Loop%20node%20executes%20repetitive,maximum%20loop%20count%20is%20reached), code execution (embedded Python/NodeJS)[\[3\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Code%20Execution), template transformations (via Jinja2)[\[4\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Template), variable aggregation and assignment[\[5\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Variable%20Aggregator), and calling sub-workflows or tools within a workflow[\[6\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Allows%20sending%20server%20requests%20via,generating%20images%2C%20and%20other%20scenarios). Dify supports three application types – **Chatflows, Workflows, and Agents** – which can be combined. An **Agent node** (introduced in 2025\) allows an LLM to autonomously choose tools via plugin-defined strategies (e.g. ReAct, function calling)[\[7\]](https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning#:~:text=Recently%2C%20Dify%20officially%20introduced%20a,type%E2%80%94Agent%20Strategy%E2%80%94which%20we%E2%80%99ll%20explore%20below)[\[8\]](https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning#:~:text=,of%20%E2%80%9CThink%E2%80%93Act%E2%80%93Observe%E2%80%9D). For knowledge integration, Dify’s built-in **Knowledge Base** enables Retrieval-Augmented Generation: documents are chunked and indexed (vector and keyword) for semantic search, and a **Knowledge Retrieval** node fetches relevant text by similarity or hybrid search[\[9\]](https://ofeng.org/posts/how-to-rag/#:~:text=1). Dify handles chunking intelligently (including parent-child hierarchy to preserve context)[\[10\]](https://ofeng.org/posts/how-to-rag/#:~:text=Chunking%20is%20the%20process%20of,It%20has%20several%20benefits), uses either vector DB or SQL for retrieval, and can apply re-ranking for precision[\[11\]](https://ofeng.org/posts/how-to-rag/#:~:text=3). **Session state** in chat apps is maintained by conversation history, while workflows can carry state via variables or persistent storage (through plugin APIs)[\[12\]](https://legacy-docs.dify.ai/plugins/schema-definition/persistent-storage#:~:text=the%20request%20returns%20the%20data%2C,and%20the%20task%20ends)[\[13\]](https://legacy-docs.dify.ai/plugins/schema-definition/persistent-storage#:~:text=). Dify supports **streaming responses** in conversational apps (by enabling SSE mode in API calls), allowing real-time token-by-token output to UIs. It also provides run logs and live debugging for workflows[\[14\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Dify%20Workflow%20is%20widely%20used,increasing%20latency%20and%20response%20times), which helps monitor progress in real time.

**Integrations & Tools:** Dify readily integrates with a wide range of model providers and external services via its plugin system[\[15\]](https://github.com/langgenius/dify-plugins#:~:text=Dify%C2%A0is%20an%20open,transition%20from%20prototype%20to%20production)[\[16\]](https://github.com/langgenius/dify-plugins#:~:text=). **Model providers:** Out-of-the-box connectors exist for OpenAI (GPT-4/3.5, GPT-5 when available), Anthropic Claude (e.g. Claude 2 “Opus”), Google’s PaLM (Gemini), Azure OpenAI, AWS Bedrock, and open-source models (via HuggingFace, Replicate, local deployments like XInference, OpenLLM, LocalAI, Ollama)[\[17\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=,194). This allows a multi-vendor model strategy: you can configure multiple LLM **providers** in one workspace and choose per-node which model to call. Dify even supports **multiple credentials** per provider for load balancing and failover (enterprise feature) – distributing requests across API keys to avoid rate limits[\[18\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=exceed%20rate%20limits%20and%20affect,thereby%20ensuring%20stable%20business%20operations)[\[19\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=Model%20Load%20Balancing). For external tools: Dify’s **Tools** mechanism lets workflows call HTTP APIs or use community/official plugins. Many common integrations (Google/Bing search, databases, email, etc.) are available via the **Marketplace**[\[20\]](https://github.com/langgenius/dify-plugins#:~:text=Dify%20Marketplace%20is%20a%20vibrant,encourages%20innovation%20and%20resource%20sharing). Notably, Dify v1.6 introduced native **MCP (Model Context Protocol)** support, meaning Dify can connect to any MCP-compliant tool server or expose its own apps as MCP endpoints[\[21\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=AI%20applications%20are%20quickly%20moving,build%20and%20hard%20to%20scale)[\[22\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=Configure%20an%20MCP%20Server%20as,a%20Tool). For example, one can add a Linear or Notion MCP server in Dify’s Tools, instantly gaining dozens of pre-defined actions (create issue, query DB, etc.)[\[23\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=On%20the%20Tools%20page%2C%20select,more%20than%208%2C000%20authorized%20apps)[\[24\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=2,name%2C%20and%20a%20server%20identifier). This drastically simplifies connecting to external services (like project trackers, web browsers, or a CI system) without custom coding. Dify also supports **HTTP Request** nodes for arbitrary REST calls[\[25\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=HTTP%20Request), and **Function/Code Execution** nodes for custom Python/JS logic if needed[\[3\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Code%20Execution). Storage and file integration can be done via the **File Upload** feature (for knowledge bases or passing file data in workflows)[\[26\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,53)[\[27\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,Tool%20Configuration) or via plugins (e.g. an S3 plugin or the SSH plugin for file ops on a server).

**Advanced Orchestration Patterns:** Dify’s workflow system is powerful enough to implement complex agent-of-agent designs. Workflows can **call other workflows as subroutines** (using the Tools node to invoke a sub-workflow as if it were a tool)[\[6\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Allows%20sending%20server%20requests%20via,generating%20images%2C%20and%20other%20scenarios). This enables building a master workflow that delegates tasks to specialized sub-workflow “agents,” exactly the pattern UMCA needs. Workflows can include **loop structures** to handle iterative refinement or retries: the **Loop node** allows repeating a set of steps until a condition is met or a max count reached[\[28\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Termination%20Condition)[\[29\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Caps%20execution%20at%2010%20iterations%2C,regardless%20of%20other%20conditions). Loop nodes maintain **loop variables** that persist across iterations (for counters, aggregated results, etc.)[\[30\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Variables), and you can define a termination expression (e.g. tests\_passed \== true) or use an explicit **Exit Loop** trigger inside the loop[\[31\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Exit%20Loop%20Node). Dify also supports **parallel branches** within workflows – you can have multiple branches from a node execute concurrently and then join results[\[32\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Dify%20v0,faster%20and%20with%20greater%20flexibility)[\[33\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=The%20branches%20will%20execute%20in,the%20documentation%20for%20detailed%20instructions). This is useful for multi-task scenarios (e.g. run multiple test suites in parallel, or query multiple models simultaneously for comparison). Parallelism can be combined with conditions and loops (e.g. conditional parallel branches based on state)[\[34\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Conditional%20branch%20parallelism%20runs%20different,example%20shows%20this%20setup)[\[35\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=existing%20company%20info%20and%20interview,questions). Additionally, Dify’s **Agent node** (with a custom strategy plugin) could be used to let an LLM dynamically decide which sub-agent to invoke, but in our design we likely stick to explicit routing logic under MCA’s control for predictability. Dify supports **nested workflows** and long chains, but we must be mindful of runtime limits (see below). State from one workflow run does not automatically persist to future runs (except via knowledge base or persistent store), so maintaining a long-term memory or cumulative state requires writing to a DB/knowledge base or carrying state in a looping workflow execution. Dify’s plugin SDK allows building custom **tool plugins** (for any REST API) and **extension plugins** (lightweight HTTP endpoints), which can be used to integrate bespoke services (like a code execution sandbox or CI pipeline) cleanly into the workflow[\[36\]\[37\]](https://github.com/langgenius/dify-plugins#:~:text=).

**Limits and Constraints:** There are practical limits to consider. **Node and token limits:** Each LLM call node will be limited by the model’s context length (e.g. GPT-4 up to 8K or 32K tokens) and the Dify platform may impose its own payload limits (the docs don’t state a fixed number, but large contexts will affect performance). Dify workflows historically executed sequentially; v0.8 added parallelism to mitigate latency for complex flows[\[14\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Dify%20Workflow%20is%20widely%20used,increasing%20latency%20and%20response%20times). Still, extremely long workflows or deep recursion could hit performance or time limits – we should plan to use the Loop node with a reasonable max iterations (and possibly break very large tasks into separate runs). **Concurrency:** Dify can handle multiple workflow instances in parallel, but heavy concurrent usage might require scaling the self-hosted deployment (e.g. adding worker replicas). **File sizes:** The knowledge base ingestion can handle large documents by chunking them (with a default chunk size, adjustable)[\[10\]](https://ofeng.org/posts/how-to-rag/#:~:text=Chunking%20is%20the%20process%20of,It%20has%20several%20benefits), but extremely large code repositories may need to be split into multiple knowledge base entries or processed incrementally. **Memory and cross-run state:** Without writing to a database or using the persistent storage interface, data does not persist once a workflow run ends. We will leverage the knowledge base for persistent context (e.g. the project spec, accumulated artifacts) and use the **Variable Aggregator** to gather outputs from branches into a single state within a run[\[5\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Variable%20Aggregator). **Cost and rate limits:** Multi-model strategies require careful cost control – Dify’s load balancing (enterprise) helps distribute calls to avoid hitting a single API’s rate limit[\[18\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=exceed%20rate%20limits%20and%20affect,thereby%20ensuring%20stable%20business%20operations). If using high-cost models (like GPT-4 or Claude-2) for every step, costs can balloon; we will mitigate by using smaller models for routine tasks and reserving big models for complex coding steps, as suggested. Dify does not have built-in cost monitoring per workflow, so that must be managed externally. **No fine-grained memory beyond context:** The system can’t *remember* arbitrary long histories except via what we explicitly provide (prior outputs, knowledge base content, or loop variables). So any iterative improvement loop must feed the previous result back into the next prompt explicitly. Lastly, **time-consuming operations:** Running a full test suite or building code could take longer than typical API calls. If an external tool call takes too long, we must ensure Dify doesn’t time out. (The HTTP Request node will wait for a response – possibly we consider asynchronous patterns or polling if needed, or increase any timeout settings on that node).

**Capabilities Summary:** In sum, **Dify natively covers**: multi-step workflows with conditional logic, looping until conditions are met, calling sub-agents or external tools, RAG (context retrieval) over provided docs, multi-model integration, and streaming outputs. **Via built-in or plugin tools**, it covers: external API calls (HTTP/MCP), code execution (through either a code node for small scripts or an external sandbox plugin), file and repo operations (likely via custom HTTP tools or the SSH plugin for server file access), and monitoring (integrations with observability tools like Langfuse or custom logging endpoints[\[21\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=AI%20applications%20are%20quickly%20moving,build%20and%20hard%20to%20scale)[\[38\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=Image)). **Not feasible or requiring workarounds**: Long-term autonomous operation without persistent storage (we’ll need to explicitly save state), extremely fine control over tool use beyond what we program (unless using the Agent node with a custom strategy), and true parallel coding by multiple agents at once (though parallel branches can simulate this, ultimately one workflow instance will coordinate sequentially or in limited parallel). Any missing primitives (e.g. complex UI interactions or real-time user input during workflow) can be handled by orchestrating Dify apps via an external interface if needed. Overall, Dify appears capable of implementing the UMCA system’s core loop with careful design and possibly some custom tooling – we next map each UMCA requirement to specific Dify features.

## 2\) UMCA → Dify Capability Mapping (What & How)

The table below maps each major requirement of the UMCA autonomous coding system (from the spec) to Dify features, noting feasibility and implementation approach. ✅ \= fully supported natively, ⚠️ \= partially or via workaround, ❌ \= not feasible in Dify (pivot needed):

| UMCA Need | Dify Feature(s) | Supported? | How to Implement (Nodes/Config) | Notes / Workarounds |
| :---- | :---- | :---- | :---- | :---- |
| **Task planning & dependency management** (Planner agent breaks project into tasks) | ✅ **Workflow** logic using LLM \+ control nodes (IF/ELSE, Loop, Template) | ✅ *Yes* | Use an LLM node (Planner prompt) to generate a task list; parse with Template/Parameter Extractor; use **Loop** or **Iteration** nodes to iterate through tasks[\[2\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=A%20Loop%20node%20executes%20repetitive,maximum%20loop%20count%20is%20reached)[\[39\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop). Within MCA workflow, maintain a task queue variable and route to next agent based on dependencies (IF conditions). | The Planner’s output can be structured (JSON) for easy parsing[\[40\]](https://github.com/langgenius/dify-plugins#:~:text=These%20plugins%20integrate%20various%20AI,to%20Quick%20Start%3A%20Model%20Plugin). Dify’s Loop node can handle iterative planning refinement or reprioritization mid-run. |
| **Multi-language code generation** (Coder agent writing code in different languages) | ✅ **LLM nodes** (with language-specific system prompt) \+ **External code execution tool** | ✅ *Yes* | For each coding task, an LLM node generates code (system prompt instructs language/framework). Use **HTTP Request** node to call a **code-runner API** (or use Dify’s SSH plugin) to execute the code and capture output. If the code-run returns errors, loop back for fixes. | Use provider-specific models: e.g. OpenAI GPT-4 for complex logic, or a code-specialized model. We can route tasks to different models via IF (e.g. if language \== Python use one model, else another). Ensure the code-runner environment has all necessary compilers/interpreters. |
| **Automated testing & quality gates** (Critique agent runs tests, ensures standards) | ✅ **Loop** \+ LLM \+ external test tool | ✅ *Yes* | Implement a **test loop**: call a **QA workflow** that runs unit tests via HTTP (or a Code Execution node for small tests). Use a **Loop node** in MCA that repeats the Code Generation \-\> Test sequence until tests pass or max attempts[\[28\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Termination%20Condition)[\[29\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Caps%20execution%20at%2010%20iterations%2C,regardless%20of%20other%20conditions). The Critique (QA) agent’s LLM can analyze test failures and provide feedback for the Coder. | Dify’s Loop node can use a condition like tests\_passed \== true to exit when quality gate is met[\[28\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Termination%20Condition). We’ll maintain a failure\_reason variable; if tests fail, MCA triggers a fix from Coder agent. |
| **State persistence across steps** (Memory of plan, code, and results) | ⚠️ **Variables** (in-workflow) \+ **Knowledge Base or plugin storage** (across runs) | ⚠️ *Partial* | Within a single workflow run, use **Variable Aggregator** nodes to collect outputs (e.g. updated code, test results) into a shared state[\[5\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Variable%20Aggregator). Use **Variable Assigner** to update loop variables (like cumulative repo\_state) each iteration. For long-term storage (persist after run), write important data to a Knowledge Base (e.g. an “Evidence KB”) or use a plugin with persistent KV storage[\[12\]](https://legacy-docs.dify.ai/plugins/schema-definition/persistent-storage#:~:text=the%20request%20returns%20the%20data%2C,and%20the%20task%20ends)[\[13\]](https://legacy-docs.dify.ai/plugins/schema-definition/persistent-storage#:~:text=). | Dify doesn’t automatically persist state between separate runs – we must explicitly save it. We plan to store final artifacts in a Git repo (via RepoFS tool) and log intermediate decisions (via an **HTTP log** tool). Knowledge Base can serve as a memory for the spec, requirements, and even previous reasoning if needed. |
| **RAG over spec & repo content** (agents must reference spec.md, existing codebase) | ✅ **Knowledge Base \+ Knowledge Retrieval** node | ✅ *Yes* | Create a **KB\_SPEC** knowledge base containing the project spec and design docs, and a **KB\_CODE** (or use KB\_SPEC for code too) containing current repository files (indexed text). Each agent’s workflow can include a **Knowledge Retrieval** node to pull relevant context for its prompt[\[41\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Knowledge%20Retrieval). For example, the Coder agent retrieves any relevant file snippets when modifying code, and the Planner/Critique agents retrieve spec sections or acceptance criteria. | Dify’s knowledge indexing supports large docs by chunking (with parent-child context)[\[10\]](https://ofeng.org/posts/how-to-rag/#:~:text=Chunking%20is%20the%20process%20of,It%20has%20several%20benefits). We should set metadata (e.g. doc type or section) and use it to filter queries[\[42\]](https://legacy-docs.dify.ai/guides/knowledge-base/integrate-knowledge-within-application#:~:text=Integrate%20Knowledge%20Base%20within%20Application,filter%20documents%20using%20metadata%20fields). Ensure to update the code KB after each major code generation (could automate by re-indexing changed files via API). |
| **Multiple model providers & failover** (choose models by task, handle failures) | ✅ **Multi-provider config** \+ **Conditional IF/ELSE** routes \+ (opt) **Parallel nodes** | ✅ *Yes* | Configure all required model APIs (OpenAI, Anthropic, etc.) in Dify’s **Model Providers** settings. In workflows, use separate LLM nodes for different models, or use an **IF/ELSE** node to route to a specific model based on task type or if one model fails (capturing errors as conditions). For example, use GPT-4 for code generation, but if it’s unavailable or times out, an IF branch can call Claude as fallback. We can also run two models in parallel and compare outputs (though automated selection of “better” output may need a judging LLM). | Dify easily integrates multiple models in one app[\[16\]](https://github.com/langgenius/dify-plugins#:~:text=). Automatic failover isn’t built-in, but we implement it with error-handling logic: e.g., after an LLM node, check a status variable; on failure, route to alternate model node. Dify Enterprise offers **Model Load Balancing** which can distribute calls across keys and perhaps models[\[43\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=Configure%20Model%20Load%20Balancing%20and,for%20the%20same%20model), but for differing model types, manual logic is needed. We will also keep temperature low for deterministic planning and higher for creative coding as needed (configurable per node). |
| **Real-time streaming of progress** (so user can see status/logs in real time) | ⚠️ **Streaming UI** (Chat app or Console logs) \+ **Webhook/HTTP callbacks** | ⚠️ *Partial* | Dify’s **Chatflow** can stream LLM responses token-by-token to the user interface if response\_mode: "streaming" is enabled (especially with OpenAI models). For our autonomous workflow, we can provide a monitoring interface: for example, an **Answer node** in the MCA workflow could stream a high-level progress update. Additionally, use an **HTTP Request** node to call a webhook (or an “Evidence” logging service) after each major step, which the user could monitor. Dify also provides **Run Logs** visible in the console for each workflow execution[\[14\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Dify%20Workflow%20is%20widely%20used,increasing%20latency%20and%20response%20times). | Because this system is largely backend autonomous, we might expose a minimal front-end: e.g. a Dify Chatflow that triggers the MCA workflow and streams important messages (like “Plan created”, “Code compiled with 2 errors”, etc.). Or simply rely on Dify’s run history and a custom dashboard reading from the evidence log. Real-time feedback is achievable but may require a custom front-end subscribing to events (potentially reading from the evidence log or using Dify’s API to get partial results). |
| **Evidence collection & reporting** (bundle prompts, code, test results for review) | ⚠️ **HTTP logging tool** \+ **File Writing** (RepoFS or Dify file dataset) | ⚠️ *Partial* | Implement a custom **Evidence Service** (could be a simple HTTP endpoint or even using the Knowledge Base as storage). Use an **HTTP Request** node at key points to send data (prompt texts, LLM outputs, code diffs, test outputs) to this service for recording. Also, use the **HTTP (RepoFS)** tool to write important artifacts to the repository (e.g. saving a test\_report.md or design\_architecture.md). Dify workflows can write to files if a tool is set up (the workflow itself doesn’t have direct file system access, so a connector is needed). | Dify doesn’t natively “bundle” all intermediate results in one package, so we create our own logging mechanism. We could use the Dify **Dataset** feature or persistent storage to record JSON blobs of each step, but an external logging API gives more flexibility (and can compute hashes, etc.). Ensure sensitive data is handled properly. The final report can be assembled by the MCA agent at the end (MCA’s last action could be to summarize the engagement and point to artifacts). |
| **Agent-of-agents orchestration** (MCA coordinating multiple specialist agents, possibly in sequence or loops) | ✅ **Nested Workflows** (Workflow calling sub-workflows as “tools”) \+ **MCA master workflow** | ✅ *Yes* | Use Dify’s **Tools node** to call each specialist agent’s workflow from the MCA’s workflow[\[6\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Allows%20sending%20server%20requests%20via,generating%20images%2C%20and%20other%20scenarios). The MCA app is a **Workflow** that contains logic to select which agent to invoke next (via IF/ELSE nodes or a Question Classifier node mapping “what’s needed next”). Each agent is implemented as its own workflow app (with a defined Start and End schema), which MCA calls and awaits result. The MCA’s workflow can loop, adjusting the shared state and next action each iteration until completion criteria are met. | This is a core design for our system. Dify fully supports one workflow invoking another (the sub-workflow runs in the same context and returns its outputs to the master). We must carefully define each sub-workflow’s input/output schema to mesh together. The **Agent node** feature in Dify is another way (one agent node could possibly replace the explicit IF \+ Tools call by letting an LLM decide), but we prefer deterministic orchestration logic given UMCA’s specification. |

*(Additional areas such as UI generation, progress tracking, deployment/DevOps actions, etc., are covered in the detailed design below, mapping to Security Agent, DevOps Agent, etc. All essential needs appear implementable with Dify, with only minor workarounds for persistence and monitoring.)*

## 3\) Target UMCA Design in Dify (MCA orchestrating 7 agents)

**Overview:** We will implement the UMCA (Universal Multi-Agent Coding Assistant) architecture in Dify as a collection of **8 Workflow apps** – one for the **MCA (master coordinator)** and one for each specialist agent: Research, Architecture, Implementation, Quality, Security, Database, Deployment. The MCA workflow directs the sequence, calling each agent’s workflow as needed, and looping until all gates are satisfied (e.g. code passes tests and meets spec). Shared knowledge bases provide context (specification documents, coding standards, prompt templates), and custom tools connect to external services (code execution sandbox, repository interface, etc.). All apps live in a single Dify **Workspace** (e.g. named “UMCA”), allowing them to share knowledge bases and tools.

### 3.1 Asset Registry (to be created in Dify)

* **Dify Workflow Apps (8 total):**

* UMCA\_MCA – **Master Coordinator**: The top-level orchestrator workflow (MCA agent logic). Decides which specialist agent to invoke next, manages the overall loop of plan → code → test → refine, and aggregates the global state and evidence.

* UMCA\_RA – **Research Agent**: Gathers information, clarifications, or external research needed (e.g., reading the spec or relevant technology docs).

* UMCA\_AA – **Architecture Agent**: Designs the high-level architecture and API contracts based on the spec and requirements.

* UMCA\_IA – **Implementation Agent**: Writes the actual code for a given task/module. Potentially uses code tools to create files or diffs.

* UMCA\_QA – **Quality (Test) Agent**: Generates and/or runs tests, verifies code correctness, coverage, and quality gates.

* UMCA\_SA – **Security Agent**: Reviews code for security issues, or sets up security-related features (like authentication, encryption).

* UMCA\_DBA – **Database Agent**: Handles database schema design, migrations, or data-related tasks in the project.

* UMCA\_DA – **DevOps/Deployment Agent**: Prepares deployment scripts, CI/CD configurations, and ensures the project can be deployed.

Each of these is a **Workflow-type application** in Dify, chosen over Chatbot-type because we need fine control of logic and tool use. Each app will have its own **system prompt** (the role instructions from the UMCA spec for that agent) and a tailored workflow to carry out its function (some might be simple one-LLM-call flows, others more involved with tools).

* **Shared Knowledge Bases:**

* KB\_SPEC: Contains the UMCA spec document and any relevant project requirement docs. This allows all agents to retrieve context about overall goals, constraints, and definitions. For instance, the Architecture agent will pull design constraints from the spec, the Implementation agent might pull function descriptions or acceptance criteria, etc.

* KB\_PROMPTS: A knowledge base to store canonical prompt texts and guidelines. We will load each agent’s role description here as documents (or in KB\_SPEC), so that agents can reference each other’s directives if needed. Also include any general prompting best practices or style guides (e.g. “use the company’s coding styleguide” could be a document).

* KB\_CODEBASE (optional): If the codebase becomes large, we can index the repository files in a knowledge base for retrieval. Alternatively, for simplicity, agents might directly read/write code via tools without a retrieval step. But having an index of the code could help the Research or Quality agent answer questions like “where is a certain function used”. (This KB would need updates as code changes; we might not implement initially, focusing on direct file access via tools).

* **Tool Integrations:**

* HTTP\_CodeRunner: A custom **HTTP Request tool** pointing to a code execution service (which we will set up outside Dify). This service provides endpoints to compile/run code and run tests in a sandbox environment. For example: **POST** /execute (with code or reference to code), **GET** /fs/read (to read file contents or results), **POST** /fs/write (to write a file/diff), **GET** /results/\<id\> (to fetch execution results or logs). We’ll configure this in Dify’s Tools with base URL \= the code runner server, and define endpoints. The tool will be used by Implementation (to run code/tests) and possibly by QA (to run test suites). Authentication (if needed) can be handled via a secret API key header configured in Dify (e.g. Authorization: Bearer {{secrets.CODE\_RUNNER\_TOKEN}}).

* HTTP\_RepoFS: A custom **HTTP tool** for repository operations. This would interface with a Git service or a simple repo server API to read/write files and commit changes. Endpoints might include: /repo/read?path=X, /repo/write (with file content or patch), /repo/commit (to create a commit with accumulated changes), /repo/branch (to create or switch branches). This tool allows agents to fetch the latest code and push their changes. The Implementation agent will use it to write code files; the Architecture agent might use it to write design docs (e.g. ARCHITECTURE.md); QA agent could create a TEST\_REPORT.md, etc. (Alternatively, we might avoid direct git integration initially and just use the code runner’s filesystem if it’s shared. But a proper Git integration ensures version control).

* HTTP\_EvidenceLogger: A lightweight **HTTP tool** to record evidence and progress. This could have endpoints like /log (append an event or note), /snapshot (to save a file or artifact for later review), /finish (to finalize and perhaps bundle a report). The actual implementation could be as simple as writing to a database or cloud storage. The MCA will call this after each major step (or each loop iteration) to record what happened, and at the end to summarize.

* **MCP Integrations:** If any exist for our needs, we prefer them for efficiency. For instance, if there’s an MCP server for Git or code execution, we could use that instead of custom HTTP. As of mid-2025, Dify supports adding **MCP Servers** directly[\[44\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=outside%20servers,is%20built%20in%20both%20directions). However, MCP is most useful if a standard toolset exists (e.g. a “GitHub API MCP” or “Docker MCP”). We will check the marketplace: one relevant find is an **SSH plugin** (which could let us run shell commands on a server via an agent)[\[45\]](https://dify.ai/blog/building-ssh-plugin-with-cursor-a-codeless-approach-to-server-management#:~:text=SSH%20Plugin%20Overview)[\[46\]](https://dify.ai/blog/building-ssh-plugin-with-cursor-a-codeless-approach-to-server-management#:~:text=Installation). The SSH plugin could potentially handle code execution and file ops in one, by giving the AI an authenticated shell on a sandbox server – but that requires quite a bit of free-form autonomy and careful prompting. Instead, our plan sticks to more controlled HTTP endpoints. Still, we list MCP as an option: e.g. adding a **Zapier MCP** could give access to hundreds of apps (for example, if we wanted to create a Jira ticket or Slack message as part of deployment, Zapier’s MCP could do that)[\[22\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=Configure%20an%20MCP%20Server%20as,a%20Tool)[\[23\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=On%20the%20Tools%20page%2C%20select,more%20than%208%2C000%20authorized%20apps).

*(In implementation, if official Dify plugins exist for some of these (like a Git plugin, or a “Filesystem” plugin), we will leverage them to avoid reinventing the wheel. But for completeness, we assume custom HTTP tools as placeholders.)*

### 3.2 Orchestration Pattern

The core control flow follows the UMCA spec’s intent: **MCA** is the only top-level decision-maker, deciding which agent should act at each step and looping until the project is completed satisfactorily. Here’s how the orchestration works in Dify terms:

* **MCA Master Workflow (UMCA\_MCA app):** This workflow is triggered with an input called, say, project\_brief (the high-level goal or user request for the coding project). It maintains a state object (which may include the list of pending tasks, the current development state, and results from each agent) and a current\_gate indicating what milestone or criteria is being worked on. The MCA uses a **Template node** at the start to inject the latest status into the MCA system prompt (ensuring the MCA agent is aware of progress so far). Then an **IF/ELSE** or a **Question Classifier** node decides which specialist agent to invoke next, based on current\_gate or contents of state. For example, initially current\_gate \= "planning" leads to calling the Research agent (if needed) then the Architecture agent. After architecture is done, current\_gate might become “implementation”, etc. We can encode this logic with nested IF nodes (one per stage) or a classifier that maps a question like “Which agent needed?” to one of the roles. The chosen branch then uses a **Tools node** to **Call the corresponding sub-workflow** (e.g., call UMCA\_AA for architecture)[\[6\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Allows%20sending%20server%20requests%20via,generating%20images%2C%20and%20other%20scenarios). We pass in the necessary inputs (which come from state). For instance, we give the Architecture workflow the project\_spec and any outputs from Research. The sub-workflow (agent) runs and returns its outputs (e.g., architecture artifacts and a status flag). The MCA workflow receives those outputs and uses a **Variable Aggregator** to merge them into the global state[\[5\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Variable%20Aggregator). Then, perhaps via another Template or logic, MCA updates current\_gate (e.g., after architecture done, set current\_gate \= "implementation"). At this point we likely enter a **Loop** structure: for implementation, we expect multiple cycles of code and test. So MCA’s workflow can have a Loop node encapsulating calling Implementation → calling QA → checking results. The **Loop termination condition** might be tests\_passed \== true AND all\_requirements\_met \== true (or simply a boolean project\_done flag)[\[28\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Termination%20Condition). Inside the loop, the sequence is: call Implementation agent (pass current to-do item), then call QA agent to run tests, then use an IF node to check if QA returned success or not. If not, the loop iterates (maybe adjusting some attempt\_count or giving the Implementation agent the feedback on next iteration). If yes, exit loop. Similar loops can be set for other refinement cycles (security review loop could iterate until no high-severity issues remain, etc., though these might just be one-shot calls after QA passes). The MCA workflow thus orchestrates in stages: Plan/Design stage (linear sequence of RA \-\> AA), Implementation/Test stage (loop of IA \<-\> QA), then possibly SA, DBA, DA in sequence, and finally a closure. Throughout the MCA workflow, after each agent call, we include an **HTTP\_EvidenceLogger** node to log what happened (e.g., log “Architecture designed modules A, B, C”). In case any agent returns an error (e.g., tool failure or model error), the MCA can catch it: Dify allows adding **Error Handling** for nodes[\[26\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,53)[\[47\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,55). We will configure error paths to perhaps retry (for transient issues) or escalate (if a provider fails, maybe try an alternate model via the logic we discussed). The MCA’s End node will output the final state (which could include something like repo\_url for the completed code, a summary report, etc.). Importantly, because we want MCA to be the single entry point, we might publish UMCA\_MCA as an **MCP server** as well (making the whole system callable via MCP by other clients, if needed)[\[48\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=The%20Model%20Context%20Protocol%20,is%20built%20in%20both%20directions)[\[49\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=Any%20Dify%20agent%20or%20workflow,as%20a%20standard%20MCP%20endpoint), or simply use Dify’s REST API to trigger it.

* **Sub-Workflows (Specialist Agents):** Each agent’s workflow is relatively self-contained, focused on its task, but they all follow a general pattern: they take input from MCA, use an LLM (with the agent’s system prompt) possibly augmented by a Knowledge Retrieval node, optionally call a tool (if that agent needs to act on external systems), then return a result. For example:

* *Research Agent (UMCA\_RA)*: Start node inputs might be research\_question or clarification\_needed plus maybe the project\_spec. The workflow could perform a **Knowledge Retrieval** from KB\_SPEC or an external search via a plugin if truly needed (though likely all needed info is in the spec). Then an **LLM node** with system prompt “You are ResearchAgent…” takes the question and retrieved context, and produces an answer or a list of findings. A Template node could format the findings with citations if required (since RAG typically provides source links[\[50\]](https://ofeng.org/posts/how-to-rag/#:~:text=The%20last%20step%20is%20to,generate%20the%20most%20relevant%20response)). End node outputs something like research\_findings and open\_questions.

* *Architecture Agent (UMCA\_AA)*: Inputs: the spec/goals, maybe research findings, and constraints. It might do a Knowledge Retrieval (to recall any architecture patterns from KB\_PLAYBOOKS if we have one with common architectures). Then an **LLM node** (prompt: “You are ArchitectureAgent…”) that produces design artifacts – e.g., a list of modules, an API interface (maybe as OpenAPI spec or pseudo-code), and design rationale. Following that, it can use **HTTP\_RepoFS** to write an ARCHITECTURE.md file and perhaps an openapi.yaml if API defined. Alternatively, it returns the content to MCA and MCA will call RepoFS (but it’s simpler for the agent to directly act via a tool node in its workflow). The AA End outputs e.g. arch\_summary and file paths of artifacts created.

* *Implementation Agent (UMCA\_IA)*: Inputs: likely a specific task or module to implement (from the plan), plus the relevant spec context and the architecture outputs. The IA workflow might be the most involved. It uses an **LLM node** (prompt: “You are ImplementationAgent, write code for X module following spec and architecture.”). The model could be GPT-4 or a code-specific model; its output could be code or a diff. We then use **HTTP\_RepoFS** to write the code to the repository (e.g., create/modify a file). After writing, we call **HTTP\_CodeRunner** – first perhaps a compilation or static analysis (if needed), then running the test suite relevant to that module. We capture the results (via the tool’s response). Then an **IF** node checks if tests passed. If yes, we proceed to output success (perhaps including the diff or commit id). If no, the Implementation agent might actually attempt a self-correct before returning: for example, the workflow could include another LLM step where it takes the error log and generates a hypothesis fix (this encroaches on QA agent’s role though). To keep roles clean, better the Implementation agent simply returns the error or indicates “needs\_fix” and MCA will decide to loop. So IA End might output impl\_status (success/fail) and details like error\_log if any.

* *Quality Agent (UMCA\_QA)*: Inputs: possibly just a trigger that code is ready to test (and maybe what tests to run or quality criteria). QA might have an LLM step to generate additional tests or to assess coverage (e.g., “Are there any missing test cases for the implemented code?”). If tests need generation, QA could write new test files via RepoFS. Then QA uses **HTTP\_CodeRunner** to run the full test suite. After execution, QA’s workflow evaluates results: e.g., parse test output, calculate coverage (if tool provides it). If tests failed, QA outputs tests\_passed \= false along with failure details (which MCA will use to loop back to IA). If all tests passed and coverage is acceptable, QA outputs tests\_passed \= true (and maybe coverage stats, test report path, etc.).

* *Security Agent (UMCA\_SA)*: Inputs: the current codebase or particular components. This agent might run a static security scan tool. For example, we could integrate an open-source security analyzer via HTTP (or run a shell command via the SSH plugin). The SA’s LLM could also review code for vulnerabilities. Likely: SA retrieves relevant code (maybe via RepoFS read), LLM identifies any issues or confirms best practices, and possibly if issues found, it returns a report and we loop with Implementation for fixes. Security may be a one-time check at the end unless specified otherwise.

* *Database Agent (UMCA\_DBA)*: Inputs: requirements for data or a need to set up database schema. LLM might produce an ERD or SQL migrations. It can write those to the repo (SQL files or migration scripts). Possibly also verify connections (depending on spec).

* *Deployment Agent (UMCA\_DA)*: Inputs: likely the final codebase and target environment info. This agent could create Dockerfiles, CI config (like GitHub Actions workflow), deployment scripts. It uses LLM to generate those and writes via RepoFS. It might also trigger a test deployment via CodeRunner or output instructions.

Each agent’s workflow will have a **System Prompt** pre-defined (we will load it as the “System” role content in the LLM node or as part of the prompt template) containing the role guidelines from the spec.md (for example, Implementation Agent’s prompt includes “you output only code and minimal explanation”, etc. as per spec). These can be stored and version-controlled in KB\_PROMPTS for easy editing, and then retrieved or copy-pasted into the LLM node configs.

**Model assignments:** We will assign models to each agent considering their task: e.g. Research might use a model good at summarization (Claude 2 or GPT-4), Architecture might use GPT-4 (for consistency in understanding spec) or a reliable model for planning, Implementation might alternate between GPT-4 (for complex logic) and a code-tuned model like CodeX or StarCoder for actual code if available via Dify. Quality could perhaps use a smaller model since it mainly runs tests and reports (or an LLM for reasoning over failures). Security might use GPT-4 with a security checklist prompt. These choices will be configurable in Dify’s model settings for each LLM node. Multi-model usage within one workflow is possible by adding parallel branches or conditional nodes (but each LLM node uses one provider at a time).

**Data flow and state:** The state that MCA manages can be a JSON object (Dify’s Template/Code nodes can manipulate JSON). For instance, after architecture, state might get a field architecture\_done: true and a list of modules to implement. MCA will then loop over each module in that list for Implementation (this could be done with an **Iteration** node: iterate over the list of modules calling the IA workflow for each)[\[51\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Iteration). Alternatively, handle modules one by one with a loop that pops from a task list. Using Dify’s **Iteration node** is clean if tasks are independent; if sequential due to dependencies, the Loop with state tracking is better. We likely do sequential for simplicity. After each module is implemented and tested via loop, we mark it done in state. Once all modules are done and tests pass, then MCA moves to Security and Deployment (if these are required gates). The final output of MCA could be a structured summary of what was done, or simply a signal that “Project completed at commit X in repo Y”.

In summary, the MCA orchestrator workflow in Dify will closely mirror a flowchart of the UMCA process: a series of agent calls with conditions and loops, all realized with Dify’s nodes. The key advantage of Dify here is that all these branches, loops, and tool calls are defined visually/logically – we aren’t relying on the LLM to manage control flow (which reduces uncertainty). The MCA’s logic is explicit, fulfilling the spec’s emphasis on the MCA’s deterministic control.

## 4\) Step-by-Step: Build the System From Zero in Dify

This section is a **runbook** for implementing the above design in a fresh Dify installation. It covers setting up the environment, configuring model providers, creating each workflow, and connecting tools. Each step specifies the exact actions in Dify’s interface or API, down to node configurations and any values to fill. (In practice, one would perform these steps in the Dify web console or via the Dify API/CLI if available for automation. Exporting the resulting apps as JSON is recommended for version control once done.)

### 4.1 Environment & Providers Setup

1. **Deploy Dify:** If not already running, deploy Dify in your environment. For a self-hosted setup (recommended for full control and privacy), use the official Docker Compose deployment[\[52\]](https://docs.dify.ai/en/getting-started/install-self-hosted/readme#:~:text=Dify%2C%20an%20open,using%20either%20of%20these%20methods). This requires minimal configuration – mostly setting environment variables for the database and specifying a URL. Verify that the Dify web interface is accessible and that you can create a workspace. *(Alternatively, you can use Dify Cloud (cloud.dify.ai) for initial testing, but for production autonomy, self-hosting is preferred to avoid external dependencies on Dify’s SaaS. The spec calls for “production-ready with zero configuration and complete control,” which self-hosting satisfies.)* Ensure your Dify instance has adequate resources (memory, etc.), as running multiple LLM calls and tools can be intensive.

2. **Configure Model Providers:** In the Dify workspace (once logged in, select your team/workspace), go to the **Model Providers** or **Providers** settings. Add API credentials for all the models we plan to use:

3. Add OpenAI (for GPT-4/GPT-3.5) by entering the OpenAI API key. Choose the default model (e.g., gpt-4-0613) for now; we can override per node.

4. Add Anthropic if needed (enter the API key and choose Claude 2 or Claude Instant).

5. Add any others: e.g., Google PaLM (needs an API key and project ID), or Azure OpenAI (endpoint URL & key), etc., depending on availability and our chosen stack. Also, if using local models, configure them: for example, if we have an Ollama server or LocalAI, integrate those via their plugin (the legacy docs have guides[\[17\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=,194)).

6. Confirm that each provider shows as “connected”. Dify supports multiple providers concurrently, and you will be able to select which model to use in each LLM node of a workflow. *(We won’t use any provider-specific features beyond text generation, except possibly function calling if we design agents to output JSON. Dify’s LLM node does support OpenAI function calling, but in this context it might not be needed.)*

7. If desired, set up **Model Load Balancing** for providers we might stress (this is optional and may require enterprise mode). E.g., for OpenAI, you could add multiple API keys and enable round-robin load balancing[\[43\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=Configure%20Model%20Load%20Balancing%20and,for%20the%20same%20model)[\[53\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=Enabling%20Load%20Balancing), to reduce hitting rate limits when the system runs many calls in a loop.

8. **Create Workspace “UMCA” (if not already):** Within Dify, create a new workspace or project called “UMCA” to contain all the apps and knowledge bases. (In Dify, a workspace is a logical container; you might also manage things at a team level – ensure all needed components are under the same team for access to shared resources like knowledge bases and plugins.)

9. **Set up Knowledge Bases:** Go to the **Knowledge** section and create the three knowledge bases we identified:

10. KB\_SPEC: Enable text data import. Upload the spec.md (the full specification of UMCA that defines agent roles and overall flow) as the main document. Also upload any relevant reference material (for example, if there is a coding standards document or a high-level product requirements doc). After uploading, choose a **Chunking strategy**: since the spec is structured, we can try using the **Parent-Child chunking** mode[\[10\]](https://ofeng.org/posts/how-to-rag/#:~:text=Chunking%20is%20the%20process%20of,It%20has%20several%20benefits) which preserves hierarchy (so that agents can retrieve an entire section context). Dify will split the docs into chunks (\~500 tokens by default, configurable) and index them. For retrieval method, enable **Hybrid (Vector \+ Keyword)** for best results[\[9\]](https://ofeng.org/posts/how-to-rag/#:~:text=1). Set “top-k” (number of results) to maybe 5 or 10 to retrieve ample context – this can be tuned later.

11. KB\_PROMPTS: We will store agent role definitions here. For each of the 8 agents (MCA \+ 7 specialists), create a document that contains its full system prompt (role, instructions, examples if any). Also include any global guidelines (e.g., “All agents must output YAML for certain things” if that’s a rule, etc.). These will serve as reference but more so we might directly copy them into the workflow LLM nodes. The Knowledge base can still be used if an agent wants to look up another agent’s remit (though that’s unlikely needed).

12. KB\_PLAYBOOKS: This KB is optional but can hold general “playbooks” or patterns for tasks. For instance, we might include a “repository initialization guide”, “typical CI/CD pipeline template”, “common security checklist”, etc. The idea is to give agents like Deployment or Security some known patterns to draw from. If we have such documents, upload them here (with appropriate chunking). If not, this can be left empty or filled later as we refine the system.

13. Verify each knowledge base indexing completes. Note the **Knowledge Base IDs** or names, as we’ll use them in Knowledge Retrieval nodes. Also consider enabling **Metadata filters** if needed; for example, we could tag certain chunks as belonging to a specific agent or section. Initially not needed, but it’s available.

14. **Set up Secrets/Variables:** In the workspace settings, add any **Environment Variables or Secrets** needed for tools. For example, define CODE\_RUNNER\_TOKEN with the API key for the CodeRunner service (if it requires one), GIT\_TOKEN if the RepoFS tool will use an API that needs auth, etc. Dify allows referencing these in HTTP nodes as {{secrets.VAR\_NAME}}. Also note we might define some **global variables** in Dify (accessible in workflows) for frequently used values like project\_id or repository URL. Under **Variables**, we can predefine such keys if needed.

At this point, the environment is ready: models are configured, knowledge bases loaded, and any required credentials stored. Next, we proceed to create the tool connectors.

### 4.2 Create Tools (HTTP and MCP connectors)

We will add the three custom HTTP tools (CodeRunner, RepoFS, EvidenceLogger) through Dify’s **Tools** interface. In the Dify console, go to **Tools** and click **“Add Tool”**. For each tool, we provide a name, type, and details as follows:

* **Add Tool: HTTP\_CodeRunner**

* **Type:** HTTP Request (since Dify v1.x, you might see categories like built-in tools, plugin tools, MCP, etc. Choose HTTP or “API-based tool”).

* **Name:** “CodeRunner” (for our reference; the system might display it as such in the Tools node selection).

* **Base URL:** e.g. http://localhost:5000 (assuming we have a local service; or a proper URL if remote). This is the root of the code execution API.

* **Endpoints configuration:** We need to define the specific endpoints as sub-tools or specify them when using in workflows. In Dify’s HTTP tool config, typically you can save predefined endpoints: e.g.

  * **Execute Code:** Method POST, Path /execute. This endpoint should accept parameters like the file or command to run. We may not fix the payload here; instead we’ll craft the JSON in the workflow’s HTTP Request node. But note if the API expects JSON like {"code": "...", "language": "python"}, we will supply that later.

  * **Read File:** GET, Path /fs/read?path={file\_path} (if the code runner offers file read). Or if the code runner returns all results in the execute response, we might not need a separate read.

  * **Write File:** POST, Path /fs/write (to create/overwrite a file; likely payload contains path and content). This could be used by Implementation agent to write code in the sandbox directly (instead of via RepoFS to git). We might not use this if we go through git, but it’s available.

  * **Run Tests:** Possibly same as execute (just the command would be run tests). If needed, define an endpoint specifically for tests, e.g. POST /execute?tests=all.

* **Authentication:** If the CodeRunner API requires a header token, set it: e.g. Header Authorization: Bearer {{secrets.CODE\_RUNNER\_TOKEN}}. If basic auth, provide that.

* Save the tool. (In workflows, this tool will be accessible via the HTTP Request node by selecting this base URL and specifying the rest path and payload.)

* **Add Tool: HTTP\_RepoFS**

* **Type:** HTTP Request.

* **Name:** “RepoFS” (short for repository file system).

* **Base URL:** e.g. http://localhost:4000 (if we have a custom service or perhaps an MCP if using one; adjust accordingly).

* **Endpoints:**

  * GET /repo/read: Read a file from the repo. Likely requires query params like path and perhaps branch. We’ll plan to call it with ?path=...\&branch=....

  * POST /repo/write: Write content to a file. Body to include file path, content (and maybe branch if needed).

  * POST /repo/commit: Commit the staged changes. Possibly include a commit message in body.

  * (If using a simpler approach, we might skip explicit commit calls and just write to a working branch, then commit at the end. But it’s good to have the endpoint.)

  * POST /repo/branch: create new branch or switch (if we want each run to have its branch). Might not use initially.

* **Auth:** Possibly an API token for the repo service or Basic Auth. Use {{secrets.GIT\_TOKEN}} if needed. Or if it’s a local git on disk, maybe not needed.

* Save the tool.

*Note:* If we instead decided to use GitHub’s API directly, we could use the **MCP GitHub plugin** (if one exists). But a custom minimal service might be easier to control. The RepoFS approach ensures the AI writes code to the repository that persists beyond the sandbox. We’ll assume this tool is functional.

* **Add Tool: HTTP\_Evidence** (Evidence Logger)

* **Type:** HTTP Request.

* **Name:** “EvidenceLogger”.

* **Base URL:** e.g. http://localhost:3000 (if we spin up a simple logging server or even use a Google Sheet via Zapier MCP, etc. But let’s assume a custom service for now).

* **Endpoints:**

  * POST /log: To append a log entry. We’ll post JSON containing at least a timestamp, agent name, event description, and maybe a reference ID.

  * POST /artifact: To upload an artifact or file reference (if needed). Or this could be part of /log.

  * GET /report: Maybe not needed within the workflow, but an endpoint to retrieve the whole log or final report (used outside Dify to get the summary).

* No auth or a simple token via header {{secrets.EVIDENCE\_TOKEN}} depending on implementation.

* Save the tool.

* **(Optional) Add MCP Tools:** If using any, e.g., Tools \> **MCP** \> Add MCP Server. For instance, **Zapier**: base URL https://mcp.zapier.com, name “Zapier”, server id “zapier”. If configured, it would provide thousands of possible actions as individual nodes. Or **Linear**: base URL of Linear’s MCP, etc., as per Dify’s documentation[\[22\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=Configure%20an%20MCP%20Server%20as,a%20Tool). For our immediate needs, we skip this because we have direct tools. But keep in mind if later we want, say, Slack notifications or external issue tracking, an MCP integration can be added on the fly.

After adding, ensure these tools show up in the Tools list. We might test one quickly: e.g., using the Dify **Test Tool** function (if available) to ping an endpoint. Or we’ll test during workflow runs.

Now, the stage is set to build the workflows for each app. We will create each app and define its workflow nodes. The following sub-sections provide the blueprint for each app’s workflow.

### 4.3 Create Workflow Apps (MCA & Agents)

For each of the 8 roles, create a **Workflow Application** in Dify. In the Dify UI: **Create Application** \-\> choose **Workflow** type (not Chatbot or Agent, since we want a custom node flow). Name the app UMCA\_\<Role\> accordingly (e.g., “UMCA\_MCA” etc. to keep them grouped). In each workflow editor, we will add nodes as per the design. Remember to set the **System Prompt** for any LLM nodes (this can be done by editing the LLM node and entering the system message; you might retrieve the text from KB\_PROMPTS or copy from spec). Also configure the **Start** and **End** nodes with proper schema (input/output variables). Use JSON schema or key definitions so that when MCA calls a sub-workflow, it knows what inputs to provide and can parse outputs.

We detail each workflow structure below. (In text form, we describe the node sequence. When implementing, you will drag nodes and connect them on the canvas. Indentation/bullets here indicate nested or branched structures.)

**A) UMCA\_MCA – Master Coordinator Workflow**

* **Start Node:** Define inputs for MCA. Key inputs might include:

* project\_brief (string) – A description of what needs to be built (provided by user or higher-level system).

* initial\_spec (string, optional) – Could be the content of spec.md if we want to pass it directly (though we have it in KB, passing might not be needed).

* Possibly no more, as MCA can fetch spec from KB. But we might include repo\_url if re-running on an existing project, or an ID. For initial run, not needed.

* **Variables Initialization:** (This could be done via a **Variable Assigner** node or a small **Code Execution** node) – Initialize a state object. For example, state \= { tasks: \[\], completed: \[\], current\_task: null, arch\_done: false, impl\_attempt: 0, tests\_passed: false, ... }. Also could initialize current\_gate \= "planning". We might also initialize an evidence\_id or session ID for logging. (Alternatively, the Start node could accept an input run\_id generated externally; if not, MCA can generate one via a Code node using Python’s uuid library).

* **System Prompt Setup:** Use a **Template node** to assemble the MCA’s prompt. For instance, template could be:

* {{\#system}}   
  You are MCA, the master coordinator agent. You ensure the autonomous coding process proceeds correctly.   
  Current state: {{ state }}   
  Current gate: {{ current\_gate }}   
  Goals: {{ project\_brief }}   
  (Remember: Only decide which agent to call next and any instructions for it. Do not solve tasks yourself.)   
  {{/system}}  
  {{\#user}}   
  Next step?   
  {{/user}}

* However, since we are not really chatting with MCA, we might not need an LLM call for MCA’s decision – we can use logical nodes instead. So MCA might not even use an LLM for itself. The MCA is essentially implemented by the workflow graph (IF/ELSE). We might still include a system message for consistency or if we wanted to log MCA’s reasoning. But MCA’s “thinking” can be implicit.

* **Choose Next Agent:** Insert a **Conditional Branch (IF/ELSE) node** to decide what to do based on current\_gate (and possibly state). We can add multiple IF conditions: e.g.,

* IF current\_gate \== "planning": go to branch that calls Research (RA) and Architecture (AA).

* ELSE IF current\_gate \== "implementation": go to branch that calls Implementation (IA) and then QA (loop).

* ELSE IF current\_gate \== "security": branch to call SA.

* ELSE IF current\_gate \== "deployment": branch to call DA.

* (We can also handle a gate "done" or none to just end).  
  Dify’s IF node allows multiple conditions and an Else fallback[\[1\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=IF%2FELSE). We’ll likely nest or chain these if many. For clarity, one could also use a **Question Classifier node** if it’s easier: define categories like “planning stage” \-\> RA/AA, “coding stage” \-\> IA, etc. But straightforward if logic is fine.

* **Planning Branch:** (Executed if current\_gate \== planning)

* **Call Research Workflow:** Add a **Tools node** configured to call the UMCA\_RA workflow. Dify’s Tools node will list custom tools and also sub-workflows we can call[\[54\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Tools). Choose the UMCA\_RA application (which we will have created, even if empty for now – so we might need to create stubs for each first). Provide the required inputs. For RA, suppose Start requires research\_query and maybe targets. We set research\_query \= "Any clarifications or info needed to start?" or use the project\_brief as context. The RA agent might on its own decide what to research (this could be optional – if our spec is clear, RA might not do much. But we include it for completeness).

* **Call Architecture Workflow:** After RA returns (we get findings), we proceed to call UMCA\_AA via another Tools node. Input to AA: give it brief (the project brief or refined spec) and constraints (maybe from RA findings or from spec), etc. AA will produce architecture outputs (e.g. an arch\_doc or module list, and possibly write files via RepoFS inside it).

* **Update State:** Once AA returns, use a **Variable Aggregator** node to merge RA and AA outputs into state. E.g., state.architecture \= arch\_doc, state.modules \= module\_list, etc., and mark state.arch\_done \= true.

* **Set Next Gate:** Add a **Variable Assigner** or small **Code node** to set current\_gate \= "implementation". (This could also be done as part of the aggregator if it allows setting constants.)

* **Log Evidence:** Use **HTTP\_Evidence \-\> /log** node to record that planning is done and architecture artifact created. Payload might include event="arch\_done", modules=... etc.

After this branch, we can loop or directly go to implementation. We should connect this branch flow into the next stage. Possibly we don’t even need to re-check IF after this, we can fall through to the Implementation loop if we design accordingly. However, Dify’s workflow might require designing the sequence explicitly. An alternative design is to not use one big IF, but rather sequence: first do planning, then a loop for implementation, etc., controlling via loop nodes and conditions internally. To keep it simpler: We might structure MCA as sequential nodes, using loops where appropriate, rather than one giant IF. The spec’s table implied separate steps though. Actually, better:

We can remove the IF for planning vs implementation by structuring as such: \- First do RA and AA sequentially (no IF, since at start it’s always needed). \- Then enter an **Implementation Loop** node for coding until tests pass. \- Then call SA, then DA sequentially. This assumes we always do those stages. If some projects might skip security or DB, we could add conditions around those calls. Given our context, let’s assume all are used.

So, revise structure for clarity: \- No initial IF for planning: just do RA \-\> AA. Then set current\_gate \= "implementation". \- Then a **Loop node** for Implementation & QA. \- After loop, optionally call SA, DBA, DA in sequence (could put IF checks if e.g. no DB changes needed, etc., based on state).

* **Implementation Loop:** Add a **Loop Node** from the node menu (in Dify’s interface, this is a special node)[\[2\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=A%20Loop%20node%20executes%20repetitive,maximum%20loop%20count%20is%20reached). Configure it as:

* Loop **Termination Condition:** We can use an expression like {{ tests\_passed \== true }} or a more complex one if multiple criteria. Dify’s loop condition syntax allows referring to variables updated in the loop. We will have a loop variable tests\_passed that the QA agent sets. Also set a **Maximum Loop Count**, e.g. 5 (to avoid infinite loops if something goes wrong)[\[55\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=%60x%20,01)[\[56\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=The%20loop%20can%20be%20terminated,the%20loop%20will%20immediately%20exit).

* **Loop Variables:** Define loop-scoped variables that persist: e.g. iteration (starting at 1), tests\_passed (start false), and maybe latest\_error (start empty). The Loop node in Dify allows listing variables and initial values[\[30\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Variables). Each iteration, these can be updated. For example, we’ll set iteration \= iteration \+ 1 on each loop via a Variable Assigner inside loop.

* Inside the Loop node, we will place the sequence for one coding cycle:

  1. **Implementation Agent call:** Tools node calling UMCA\_IA. Inputs: likely task \= next\_task. We need to decide what “task” to give. If architecture provided a list of modules, we could iterate that. Alternatively, implement everything in one go (not realistic for big projects, better modular). For now, if we have state.modules array from AA, we might actually put the Loop over that array (Dify’s **Iteration node** could loop over modules list[\[51\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Iteration), but here we use Loop differently). Perhaps simpler: treat each loop iteration as handling one module at a time, and the loop runs through each until none left. To do that:

  2. We could maintain state.remaining\_modules list. On each iteration, pass task \= state.remaining\_modules\[0\]. Implementation agent works on it. After returning, remove it from list. If list becomes empty and tests pass, loop ends.

  3. Or have Implementation agent handle the next unimplemented part; this requires some planning in code. Possibly we rely on Planner to assign tasks, but let's not overcomplicate – assume one big implementation loop for now (Implement entire codebase then fix until tests pass). Inputs to IA also include the spec (from KB or state) and architecture outputs (state.architecture). IA returns status and possibly indicates if code is done.

  4. **Evidence log:** Right after calling IA, log via Evidence tool that “Code generated for X, committing and running tests.” Perhaps include a diff or commit ID if available.

  5. **QA Agent call:** Tools node calling UMCA\_QA. Inputs: perhaps just a signal to run tests, or specify which module’s tests to run (if doing module by module). The QA agent will run all tests and return pass/fail and maybe a report.

  6. **IF Node – check test results:** Add an IF/ELSE: IF QA.tests\_passed \== false (meaning tests failed), go to ELSE branch which will loop (basically do nothing special except allow loop to iterate again). In that branch, we might capture latest\_error \= QA.error\_log into a variable (for Implementation agent to use next time). Also increment an attempt\_counter. The IF’s true branch (when tests\_passed is true) will connect to an **Exit Loop** node, which we drag inside the loop. Dify’s **Exit Loop** node, when reached, breaks out of the loop immediately[\[57\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Exit%20Loop%20Node). We place Exit Loop perhaps on the IF true path (if tests\_passed true, exit). If the loop condition is properly set as tests\_passed, this might be redundant, but including an explicit exit ensures immediate break once tests\_passed flips.

  7. **Variable updates inside loop:** Use a **Variable Assigner** to update loop variables at end of iteration: e.g., set iteration \= iteration \+ 1; set tests\_passed \= QA.tests\_passed (so that when tests eventually pass, the loop condition will see it). Also if using latest\_error, update it. This node should be connected such that it runs after QA regardless of pass/fail (maybe on the ELSE branch leading back into loop). Actually, in Dify you might incorporate those updates partly via the aggregator when getting QA outputs. But you can also set loop variable mapping in the loop node config. We can experiment, but logically ensure that on each iteration end, tests\_passed is updated from the QA result.

  8. The Loop node encloses the above. On exiting the loop (either via success or max count), it will continue to the next node after the loop structure.

* **Post-Implementation (after loop):** At this point, code passes all tests (or we hit max attempts). We now proceed to any remaining stages:

* **Security Agent:** Tools node calling UMCA\_SA. Provide input like maybe a list of sensitive files or just the whole repo. SA returns maybe security\_issues list or a pass flag. If significant issues found, theoretically we could loop with Implementation to fix them. But to keep scope, we might just log them or fix manually. If we wanted full autonomy, we could treat each security issue as a task and loop again with IA. This is advanced; for now assume security check mostly passes or is advisory. We can at least log if issues are found. If none or after fixes, continue.

* **DB Agent:** Tools node calling UMCA\_DBA if applicable. (If the project involves database, this would produce migration scripts etc. If our spec doesn’t need it, we might skip. Put an IF: if state.requires\_db \== true, call DBA.) After DBA, optionally commit DB scripts to repo via RepoFS if not done inside.

* **Deployment Agent:** Tools node calling UMCA\_DA. Input: any deployment constraints or target environment info (could be none, so agent will assume defaults like Docker). DA returns e.g. deploy\_scripts\_created \= true and maybe triggers a test deployment. After DA, one could even have a final test run of the deployment pipeline, but that’s likely beyond our current test harness.

* **Wrap up and Final Log:** Once all agents done, use **HTTP\_Evidence /log** to mark the project as completed (include final commit hash perhaps). Then perhaps collate a summary: We might use a **Template node** to generate a final summary text from the state (like “Project complete. Features implemented: X. All tests passed. Deployed via Y.”). This summary can either be returned as the MCA’s output or just logged.

* **End Node:** Define outputs of MCA. Maybe output project\_status \= "completed", repo\_url or commit\_id of final code, and possibly the evidence\_log\_url if one wants to retrieve the full log, or a summary\_report. We can output any relevant info for the user here.

*(Important: Connect all nodes properly. In Dify’s UI, the Start goes into Template (optional) \-\> flows into RA call \-\> flows into AA call \-\> flows into aggregator \-\> flows into setting gate \-\> flows into Loop \-\> inside loop flows as described \-\> after loop flows into SA \-\> DBA \-\> DA \-\> finally to End. Use connectors to handle branches: e.g., after QA IF node, on test passed branch go to Exit Loop, on else (fail) branch go to variable assigner then loop repeats. The design ensures no node is left hanging.)*

Configure **Error Handling** for critical nodes: for each HTTP Request and Tools call (which calls sub-workflows), set up a simple retry on failure (maybe 1 retry on network error). If a sub-workflow errors (like model call fails due to rate limit), MCA could catch that and maybe wait a moment then retry. Dify allows adding error boundaries – for example, you can attach a fallback path if a Tools node fails. We could add a generic handler that logs the error and uses an Exit Loop or abort mechanism. For now, note this but focus on the main flow.

**B) UMCA\_RA – Research Agent Workflow**

* **Start Node:** Define inputs such as research\_query (string) – the question or topic to research. Possibly targets (maybe a list of sources to check, or an indicator like “spec” vs “external”). But likely just a query.

* **Knowledge Retrieval (optional):** If the question is about the project (most likely it is, e.g., “clarify requirement X”), then performing a retrieval on KB\_SPEC is useful. Add a **Knowledge Retrieval** node, select KB\_SPEC (and KB\_PLAYBOOKS if relevant). In the node config, bind the query to research\_query variable. Set top-k \= 3 or 5\. This node outputs something like retrieved\_content.

* **LLM Node:** Add an **LLM (Large Language Model) node**[\[58\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Large%20Language%20Model%20). Configure system prompt from RA’s role: e.g., “You are the Research Agent. Your job is to answer questions or gather information from documentation. Provide clear, concise answers with sources if possible.” Set the user prompt as the research\_query (or you can incorporate the retrieved context as well). Actually, Dify can automatically inject knowledge results into context if you specify it: ensure the LLM node’s context includes the output of the Knowledge Retrieval node[\[59\]](https://legacy-docs.dify.ai/guides/workflow#:~:text=Knowledge%20Retrieval%20%C2%B7%20Question%20Classifier,transformation%2C%20iteration%20nodes%2C%20and%20more). For example, in the LLM node settings, you map the {{retrieved\_content}} into the prompt (or enable the checkbox to include retrieved text). The model chosen can be something like GPT-3.5 or Claude Instant to save cost, since this is straightforward Q\&A.

* **Template (format output):** (Optional) Use a Template node to structure the LLM’s answer. For instance, if we want to add citations, and the LLM just gave some text, we might not have source attributions since we didn’t fine-tune that. Another approach: we could instruct the LLM to output relevant source document titles (since Dify’s retrieval might give references). If the knowledge retrieval supplies metadata (like document name or section), we can append that. To keep it simple, maybe skip fancy citations; just have the LLM answer. Or we could instruct it like “When you use info from the spec, cite (Spec Section X)”. Up to design; skipping to keep short.

* **End Node:** Define outputs: findings (string with the answer), and possibly unanswered (if LLM couldn’t find something) or next\_actions if RA suggests something to do. But likely just findings.

This RA workflow is straightforward: it basically responds to MCA’s query. Connect Start \-\> (Knowledge Retrieval) \-\> LLM \-\> End. (If knowledge node is used, ensure to connect Start to it, then to LLM. If no retrieval needed for trivial queries, RA could just echo spec’s known info. But we include it for completeness.)

**C) UMCA\_AA – Architecture Agent Workflow**

* **Start Node Inputs:** e.g. project\_spec (string or could be large – maybe better to have AA just retrieve from KB\_SPEC rather than pass entire spec), requirements (if any specific focus), constraints (like “must use Python”). For simplicity, maybe just project\_spec as text. Or even just a project brief ID and let the agent retrieve details itself. But since spec is in KB, an approach: pass a short summary or the high-level brief as input (the agent can fetch details via retrieval).

* **Knowledge Retrieval:** Could retrieve from KB\_SPEC any sections relevant to architecture or constraints (for example, search for “architecture” keyword). But possibly unnecessary as the spec is not huge; an LLM can take it if within token limits. But safe to do retrieval for up to 4-5 chunks to not overload the prompt. Add node if needed.

* **LLM Node:** System prompt from AA role: “You are Architecture Agent. Design the software architecture… output should include module breakdown, interfaces, etc.” User prompt can be something like: “Project brief: {{project\_spec}}. Design an architecture fulfilling all requirements.” If retrieval was used, include those context bits too (like any non-functional requirements). The model: GPT-4 or Claude would be good here for quality. Temperature low to focus on accuracy. Possibly use function calling to output a JSON of modules? But easier to get markdown text.

* **HTTP Request Node (RepoFS \- write files):** After the LLM yields the architecture description, we want to persist it. Use the **HTTP\_RepoFS** tool to write a file. For example, Path: /repo/write. In the node, set method POST, body JSON: {"path": "ARCHITECTURE.md", "content": \<text from LLM\> , "message": "\[UMCA\] Add architecture design"}. This call will create or update the file in the repository. We assume our RepoFS API handles commit if a message is provided. (Alternatively, we could accumulate changes and commit later, but simpler to commit as we go with a clear message prefix “\[UMCA\]”).

* **(Optional)** Another HTTP call: if we want an OpenAPI spec, we could prompt the LLM to also produce openapi.yaml content for any APIs and write that similarly. This depends on project.

* **End Node Outputs:** e.g. architecture\_doc (maybe just a confirmation like “Architecture document written to repo.”) or module\_list (if we parsed one). Actually, it would be useful to parse out the module list so MCA knows what to implement. We can have the LLM output a structured list of module names (like in markdown or JSON). If the output is well-structured, we could use a **Parameter Extractor** node in between that reads the architecture text and extracts module names (using maybe a regex in a Code node or the Parameter Extractor LLM node). But to avoid complexity, maybe instruct the LLM to output JSON of modules in addition to the doc. Dify’s **JSON Schema** output support could enforce this[\[40\]](https://github.com/langgenius/dify-plugins#:~:text=These%20plugins%20integrate%20various%20AI,to%20Quick%20Start%3A%20Model%20Plugin). For now, let’s say output: module\_specs (text describing modules) and (optional) module\_list (array). If not easily extracted, MCA can parse the architecture text later in its loop.

* Connect nodes: Start \-\> (Knowledge if used) \-\> LLM \-\> RepoFS write \-\> End. Add error handling on RepoFS call (if fails, maybe retry or output an error status).

**D) UMCA\_IA – Implementation Agent Workflow**

* **Start Inputs:** Could be task\_description (string) – describing what to implement (e.g. “Implement the User Authentication module”), and possibly architecture\_context (text of that module’s spec from architecture), and current\_code (maybe a snippet or path if modifying an existing file). We might also include error\_feedback if this is a retry after a test fail (so the agent knows what to fix). To keep general: inputs: task and feedback (feedback can be empty if first attempt).

* **Knowledge Retrieval (optional):** If the spec is large or codebase is large, IA might retrieve the spec section relevant to this task. For instance, search KB\_SPEC for the module name or requirement. Could also retrieve KB\_CODEBASE for an existing file if modifying. But initial implementation presumably creates new files, so skip code retrieval. (If re-running to fix, IA could retrieve the error log or relevant code from knowledge? Probably not needed as we pass feedback directly.)

* **LLM Node (Code Generation):** System prompt from IA role: “You are Implementation Agent. You write code for the given task. Provide the complete code, and minimal commentary in markdown, or a unified diff if modifying existing code, as specified.” We have to decide output format: The spec suggests the Implementation agent might produce code with minimal explanation. Possibly it could produce a diff format that the RepoFS tool can apply, especially if modifying multiple files. But applying diff is complex unless RepoFS supports patch. Simpler: one file at a time. Or have the LLM just output the file content for a specific file it knows it should create. Actually, architecture likely defined module names and file names. Maybe we give it a specific file path to fill. In one cycle, focusing on one module \= likely one main file or directory. If a module has multiple files, Implementation might need to handle multiple outputs – Dify’s LLM node cannot directly output multiple separate files easily unless as one big text with markers. Alternative approach: have Implementation agent do one file at a time (then call itself multiple times). But that complicates orchestration. Possibly better to let the LLM output a code block per file within one output, then use a small script to split them. E.g., “Output in the format: filename.py\\n\<code\> for each file.” Then a Code Execution node can parse that and call RepoFS multiple times. This is an advanced formatting task. If time is short, we may cheat by focusing on single-file tasks. But a robust solution could handle multiple. For now, assume each task corresponds to one file or one logical unit. We’ll instruct the LLM to output code for that unit. If it needs to create multiple files (like class and a test file), perhaps mention them. We might handle the test file creation in QA agent though.  
  The user prompt to the LLM will include the task description, any architecture context (like “module X should have A, B, C functions”), and if feedback (error from last attempt) is provided, include that: “Note: In previous attempt, the following issues were found: {{feedback}}. Fix these.” This way, on retries, the LLM knows to adjust code.  
  Choose model: GPT-4 or similar for best output. Temperature moderate (0.2-0.3) to keep deterministic.

* **RepoFS Write (Code):** If the LLM output is directly the code text for a file, use **HTTP\_RepoFS** to write it. E.g., path from the task (if we know file name, we might include it in task or architecture context). Possibly ask LLM to explicitly state the file name. Or we decide file path in workflow: e.g., if task “User Auth module”, file path “src/auth.py”. Could even be part of IA input. For now, maybe pass file\_path as an input too. If not, parse from LLM output: could do a Template to extract a first line like “File: X”. But let’s assume we know or set a convention. Implement by calling RepoFS /repo/write with content \= LLM output.

* **Code Execution (build/tests):** Now call **HTTP\_CodeRunner** to run any build or tests for this module. For example, if it’s Python, we might run flake8 (lint) and pytest tests/test\_auth.py. So configure HTTP\_CodeRunner:

* Method POST, Endpoint /execute. Body might include {"command": "pytest \-q", "cwd": "/"} (depending on API). Or maybe CodeRunner has a specific “run tests” endpoint that automatically runs all tests. In our plan, QA does full test suite, but IA might do a quick sanity run. Perhaps skip here to avoid duplication. Alternatively, the Implementation agent might compile code (for languages like C++) or run a quick self-check. But since QA will handle testing thoroughly, IA could just rely on QA feedback. For quality, let’s still compile: if language needs compilation (C/Java), do compile command. If interpreted, maybe skip. This step is optional. We include a node calling CodeRunner to ensure code doesn’t have syntax errors. If it returns an error, we could decide to fix immediately instead of waiting for QA. But to keep roles distinct, perhaps let QA catch it. This is a design choice: We could tighten the loop by having IA itself iterate on compile errors (before handing to QA). That would mean IA’s workflow could loop internally if CodeRunner returns an error (like syntax fail). But since the MCA loop anyway will catch test failure, it might catch compile errors as test failure. So no separate internal loop, just one try per iteration. So this node just returns success or error. If error, we could append that to IA output so that MCA treats it as feedback for next loop.

* **End Node Outputs:** IA should output something like: impl\_status and error\_log.

* If code generation succeeded (file written) and (if we ran compile) no error, then impl\_status \= "ok", error\_log \= "". Possibly also output files\_changed if needed.

* If compile or self-test failed, then impl\_status \= "error" and error\_log \= \<log from CodeRunner\>.

* If we skip running here, then assume always "ok" from IA perspective and let QA catch issues. But better to capture obvious errors early. Also, IA could output a commit\_id if RepoFS commit occurred, but probably RepoFS write already committed with a message. Maybe RepoFS returns commit id which we could capture. We can forward that in output for logging.

Nodes connection: Start \-\> (Knowledge retrieval optional) \-\> LLM \-\> RepoFS write \-\> (CodeRunner execute optional) \-\> End. With some logic: If CodeRunner returns error, we might not want to proceed to End immediately with success. Actually we handle it by including in output for QA to see or for MCA to decide. Possibly set impl\_status based on CodeRunner response (we can do that in a small Code node: e.g., if response contains "error", set impl\_status \= "error"). This can be done by connecting CodeRunner to a Python Code Execution node that processes results and then to End. If CodeRunner fails, that node still passes output. Alternatively, use IF: IF compile error \-\> set impl\_status "error", else "ok". But we can simply always output and let QA fail on tests anyway. Possibly simpler: treat compile error as tests failing (since tests likely won’t run). The QA agent will see if code didn’t even run. So maybe not complicate here; just output error log.

**E) UMCA\_QA – Quality Assurance Agent Workflow**

* **Start Inputs:** Possibly none, or a marker of what to test. If we only run full test suite, QA just needs to know to proceed. If we modularize, maybe pass a module\_name to focus tests on that area. However, typically we’d run all tests to ensure nothing else broke. So no specific input needed except maybe expected\_pass if we want to enforce a threshold or coverage target (could be in spec). For now, no required input – QA knows to run tests on current codebase.

* **LLM (optional test generation):** If part of QA’s responsibility is to ensure tests exist for all features, QA might first check if tests are missing. Could do: use an LLM to analyze state.modules and see if there's a test file for each. If missing, generate one. This is a complex subtask and might not be necessary if we assume either tests are pre-written (maybe spec included some, or the Implementation agent wrote basic tests if prompted). If we want full autonomy, QA can generate tests using the spec. That would be another LLM call: “Generate a unit test for module X given its spec.” Possibly better to do this earlier (maybe Implementation could also produce a test stub). But including here: If we decide, we can do a Knowledge Retrieval from spec for requirements, then LLM to generate test code, then RepoFS to write it (e.g., tests/test\_auth.py). This is optional and can complicate things. Perhaps assume tests either exist or Implementation wrote some. We skip test generation to focus on running tests.

* **HTTP Request (Run Tests):** Use **HTTP\_CodeRunner** to run the test suite. E.g., endpoint /execute with command pytest \-q. This will run all tests and return results. We expect a JSON or text output indicating pass/fail counts. If the CodeRunner service returns structured data (say it could return {"passed": 10, "failed": 2, "errors": \[...details...\]}), that’s ideal. If just text, we parse it.

* **Variable/Condition check:** After getting test results, use an **IF** or a small **Code Execution** node to determine the outcome. E.g., in Python, parse the output to see if any failures. If failures \> 0, set a variable tests\_passed \= false, else true. Also perhaps gather a summary of failures for feedback. The Code node can output tests\_passed boolean and failure\_details (like first error message or stack trace truncated).

* **LLM (optional analysis):** Another optional step: have the QA agent LLM analyze the failure and suggest what might be wrong. This can be fed back to Implementation. But since the Implementation agent can interpret raw error, it might not need translation. However, if error is low-level (like “TypeError X”), the LLM could say “Likely cause: function Y returns None.” This could speed up fixes. This is a nice-to-have. If adding: input to LLM would be the error log, system prompt “You are QA, analyze error and give brief hint to developer.” Output some hints. Then include that in QA’s end output as feedback. We must ensure not to do too much, as the Implementation agent itself might be capable of using error directly. We can include it though to follow the idea of Critique agent providing suggestions.

* **End Node Outputs:** At minimum: tests\_passed (bool or string) and error\_log (string, possibly empty if passed). Also could output coverage if we measured it, or feedback hints as described. For simplicity, outputs: tests\_passed and error\_log. If tests passed, error\_log can be “”. If failed, error\_log contains summary of failures (or entire log if not huge).

Nodes: Start \-\> (optional LLM test gen) \-\> (RepoFS writes test if did generation) \-\> CodeRunner execute tests \-\> Code node parse results \-\> (optional LLM analysis) \-\> End.

**F) UMCA\_SA – Security Agent Workflow**

* **Start Inputs:** possibly none or just context that code is ready.

* **LLM Node:** System prompt: “You are Security Agent. Analyze the code for vulnerabilities or security concerns. Focus on areas like input validation, authentication, etc.” The LLM will need to read the code to do this effectively, which might be too much to feed. Perhaps better to run a tool. For demonstration: maybe run a simple static analyzer. If using Python, we could run bandit (security linter) via CodeRunner. For web, maybe some known scans. So perhaps do:

* **HTTP (Security Scan):** Use **HTTP\_CodeRunner** with command like bandit \-r . (scan repo). Get output (list of issues).

* **LLM (Summary):** Have LLM read that output and produce a human-friendly summary and possibly fix suggestions.

* **Output:** security\_passed bool (if no serious issues) and security\_report text. If issues, we could set passed \= false and include report.

* If security\_passed \== false, MCA could loop back to IA to fix issues. But this might be too advanced, as fixing security issues could be non-trivial. If time, could attempt one loop: If false, call Implementation with feedback \= security\_report. Otherwise continue. We might include this logic.

* For building, it's enough to output and log.

**G) UMCA\_DBA – Database Agent Workflow**

* **Start Inputs:** Possibly the spec or an indication of what to do (like if spec says "set up database for user accounts").

* **LLM Node:** System prompt: “You are Database Agent. Design the database schema or data structures needed.” It might produce SQL or instructions.

* **RepoFS Write:** Write any SQL migration or schema.sql etc.

* **(Optional)** could run the SQL on a test DB via another tool, but likely out of scope.

* **End Outputs:** e.g. db\_scripts\_created \= true or db\_schema summary.

**H) UMCA\_DA – Deployment Agent Workflow**

* **Start Inputs:** Possibly target environment (if any), else none (just assume docker).

* **LLM Node:** System: “You are Deployment Agent. Prepare deployment configuration.” Could prompt for Dockerfile, docker-compose, or CI pipeline YAML.

* **RepoFS Write:** Save Dockerfile, etc., to repo.

* **(Optional)** CodeRunner to build the Docker image to ensure it works. If CodeRunner has Docker, we could do docker build . as a test. But that might be heavy. Perhaps skip.

* **End Outputs:** deploy\_ready \= true or similar, plus list of files created.

*(We have combined some roles; if spec doesn’t require separate DBA or SA, these could be no-ops or integrated into others. But we include for completeness.)*

After setting up each workflow as above, double-check each for correctness: \- All Start inputs and End outputs match what MCA expects to send/receive. \- Insert knowledge retrieval nodes where appropriate (especially in LLM heavy tasks to avoid missing context). \- Ensure each LLM node has the correct system prompt loaded (copy from spec or KB\_PROMPTS), and adjust parameters (max tokens, temperature, etc.). \- Save each application as you go.

### 4.4 Shared Conventions & Configurations

To ensure the multi-agent workflows work together, maintain these conventions:

* **JSON I/O Schemas:** Use structured outputs where possible. For instance, if the Architecture agent can output a list of modules, consider outputting valid JSON or YAML that we can parse. Dify’s workflows support defining expected output format and using it in later nodes[\[50\]](https://ofeng.org/posts/how-to-rag/#:~:text=The%20last%20step%20is%20to,generate%20the%20most%20relevant%20response). For simplicity, we might parse via Template or code nodes. But consistency is key: define clear fields like tests\_passed as boolean, not sometimes “yes”/“no”. Possibly enforce these via the system prompts (“Output tests\_passed: true/false exactly”).

* **Variable Passing:** The MCA workflow uses a state variable to track cumulative info. However, passing a large state object between nodes might be unwieldy. Instead, break out key pieces: e.g., after architecture, store module\_list in a variable and iterate over it; after each implementation, mark module as done. We might not always literally pass one state object around if Dify doesn’t handle complex objects well – instead use multiple simpler variables. The **Variable Aggregator** node helps gather outputs from parallel branches, but we use it also after sequential calls just to collect outputs into a unified context for next step[\[5\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Variable%20Aggregator). Ensure variable names are consistent (case-sensitive).

* **Prompt Injection and Knowledge:** Each agent’s system prompt likely references the overall spec or previous steps (“given the design from architecture agent”). Where needed, feed that info: e.g., Implementation’s prompt can include a short recap like “Architecture summary: {{ state.architecture\_summary }}” to ensure it aligns with the design. We can prepare such a summary in state after AA – maybe have AA output a one-liner summary or just the module list, and include that for IA’s context. The knowledge base will serve as a safety net if an agent needs additional info, but having key points directly in the prompt is more effective (to avoid an agent missing something because it didn’t explicitly query KB).

* **Tool Authentication:** We set secrets earlier. Confirm that each HTTP node is configured to use them (the Dify UI likely has a field for headers or you include in the payload). E.g., for RepoFS if using an API token, ensure each call includes that. One strategy: if using a custom service, you can restrict by IP and skip auth in early development.

* **Streaming outputs:** When running the system interactively, it might be helpful to see partial output from LLMs. In Dify, chat apps can stream; workflows typically execute then return, but if you preview a workflow run in the console, you see node-by-node logs. We might not explicitly enable streaming on LLM nodes in the workflow (there may be a toggle “stream” – if it exists, we can turn it on especially for ones that produce long code, so we can observe progress). For the final user interface, if we wrap MCA in a Chat app or expose via API, we might want a streaming response summarizing progress. We could implement that by MCA periodically sending messages via the Answer node or evidence logger. This is an enhancement outside core logic.

* **Testing and Debugging Mode:** Initially, it helps to use smaller models (for speed/cost) and perhaps simpler tasks to debug flows. Dify’s **Debug** mode (v1.5+) allows running a workflow step by step and seeing outputs of each node[\[60\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Release%20Dify%201.5.0%3A%20Real,Yan%20%C2%B7%20Jun%2025%2C%202025). Use this during construction: for example, after wiring RA and AA, run MCA with a dummy brief to see if it flows properly to AA’s end. Dify also provides a **Run History** and **Logs** to inspect past runs[\[61\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,57)[\[62\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=). Use those to refine any step where the outputs aren’t as expected.

* **Exports:** Once each workflow app is built and tested, use Dify’s **Export** feature (if available in UI or CLI) to export the JSON definition of the app. This yields a .json with all nodes, connections, prompts, etc. Save these for version control (deliverable). It’s wise to do an export at this stage in case any UI mishap occurs.

At this point, we have configured all components of the system. Next, we outline how to validate the entire pipeline end-to-end and ensure it meets the spec.

## 5\) Validation Plan (Ensuring the Pipeline Works)

After building, a comprehensive test of the autonomous AI coding pipeline is needed. We will perform the following validation steps:

1. **Cold Start End-to-End Run:** Initiate the UMCA\_MCA workflow with a simple project brief to simulate a real scenario. For example, use: “Brief: Create a CLI to-do list application with add/list functionality (in Python).” This is a contained task that will exercise planning, coding, and testing. Trigger the MCA workflow with this input (through the Dify UI “Run” function or via API call to the workflow endpoint). Observe the workflow as it executes through nodes:

2. Confirm it calls Research (maybe RA finds nothing extra needed, quick return).

3. Then Architecture agent should outline, say, two modules (task management and CLI interface) and create an ARCHITECTURE.md in the repo. Check the repository (or the RepoFS logs) to see that file content and commit message.

4. MCA then enters implementation loop. Implementation agent should generate code for the first module (e.g., a Python file for managing tasks) and commit it. CodeRunner then runs tests – initially, probably none or failing because tests not exist. QA might detect missing tests. If QA has logic to generate tests, it might create a test file for that module. The loop then iterates – Implementation might be triggered to implement the second part or fix issues.

5. Continue until QA passes. Ideally, by iteration 2 or 3, all required functionality is implemented and tests pass.

6. MCA then calls any remaining agents (if we included security, etc.). With a simple CLI app, security agent might just okay it. Deployment agent might create a Dockerfile.

7. The MCA ends. During this run, record each step’s outputs. Dify’s run log should show each node’s result. Use that to verify things like: Did the Implementation agent output code properly? Did RepoFS actually write files? Did QA correctly catch the error and provide it back? This initial run might not succeed fully on first attempt (the agents’ LLM prompts may need tweaking if outputs are not as expected, e.g., maybe Implementation printed explanation we need to suppress, or QA needed to parse test output differently). We will refine prompts or parsing accordingly.

8. **Artifact Verification:** Inspect the repository after the run:

9. Ensure all expected files (ARCHITECTURE.md, code files, test files, config files) are present and contain plausible content.

10. Run the tests manually (outside of Dify, on the code) to double-check that they indeed pass as the AI claimed. This ensures our code execution integration was accurate.

11. If using the evidence logger, fetch the log (via its API or DB) to see that all major events were logged (planning done, each iteration result, final result). Make sure data like error messages and commit IDs were captured.

12. If any discrepancies (e.g., Dify thought tests passed but in reality they didn’t), adjust where needed (maybe our test parsing logic was flawed).

13. **Edge Case Testing:** Try scenarios to push limits:

14. **Large Input/Spec:** Provide a more complex spec (if available) to see if knowledge retrieval and prompt handling scale. Check that chunking didn’t omit crucial info. Possibly simulate with a spec that has 50 requirements to see if Planner enumerates them.

15. **Parallel Requests:** If possible, fire two MCA runs concurrently (in separate threads or via Dify’s API) to see if resource contention occurs (especially with CodeRunner or repo if they share state). The system should ideally handle sequentially, but if parallel, ensure they use separate branches or IDs to not conflict. This tests concurrency limits.

16. **Failure Injection:** Intentionally break something to test resilience. For example, revoke the OpenAI API key and run – MCA should catch the LLM error at some node and either retry with a different model or fail gracefully. Or have CodeRunner throw an exception unexpectedly – see if MCA loop stops or continues (we might need to adjust error handling logic to avoid infinite hang). Another approach: put a bug in the test to ensure it fails first time (which it likely will anyway). See that the loop indeed triggered and second attempt fixed it.

17. **Max Loop Count scenario:** Force a failure that won't be fixed to see if our max loop count breaks out properly. E.g., ask for a feature that is impossible so tests never pass. On hitting iteration 5, MCA should exit the loop. Right now, we didn’t specify what to do at max loops – probably log “Max attempts reached, aborting.” We might add that in MCA loop config or check after loop if tests\_passed false then output a “failure” status. Check that works.

18. **MCP integration test (if used):** If we configured something like an MCP tool (Zapier etc.), test an agent calling it. For instance, use Zapier MCP to send a Slack message in Deployment agent indicating completion. See if it’s called properly (this is optional but nice to try if time permits).

19. **Performance & Token Usage:** During runs, note the latency of each phase and token consumption:

20. The longest will likely be Implementation’s code generation (especially if code is long) and the test execution (depending on code complexity). Ensure the LLM nodes have appropriate token limits set (in Dify LLM node config, you can set max tokens for output; we might set e.g. 1500 for code gen, 500 for others).

21. If using OpenAI, watch the usage logs to estimate cost per run. If it’s very high, consider where to optimize (maybe use 3.5 for some steps instead of 4, etc.).

22. Also ensure we’re not hitting any rate limits by spacing out calls (the sequential nature helps). If we did parallel things, consider adding slight delays or using the load balancing to distribute calls.

23. **Quality of Outputs:** Evaluate the final outputs against expectations:

24. The architecture doc: Is it coherent and did it help Implementation? If not, adjust AA prompt to be more structured (e.g., ensure it lists modules clearly).

25. The code: Does it meet the spec and is it reasonably well-formatted? If we saw the Implementation agent returning a lot of English explanation in code output, we need to enforce more code-only format (maybe with system prompt or by post-processing out non-code).

26. The tests: Are they thorough? If QA created tests and they were trivial, maybe instruct QA to aim for certain coverage.

27. The logs: Are they detailed enough to audit the process? If not, maybe log more info or include prompt texts in evidence for debugging.

28. **Full System Behavior:** Confirm that the system indeed ran autonomously with minimal or no human intervention, and that the MCA orchestrated properly:

29. Did MCA always call the correct next agent? If at any point an agent output was mis-routed (e.g., maybe Implementation finished all modules and tests passed, but MCA still tried to loop), then our condition logic needs fixing. Fine-tune those IF conditions or loop break logic accordingly.

30. If multiple modules were intended, ensure MCA either looped for each or handled them. If not, we might iterate tasks differently.

Record results of these validation runs. Specifically capture: \- Time taken for each stage. \- Number of iterations required for implementation. \- Any errors encountered and fixes applied. \- Final outcome (working code? any remaining issues?).

Using the above, prepare a **Validation Report**. This report (deliverable) will list the scenario, steps that occurred (with timestamps and perhaps truncated logs), and success/failure of each agent. For instance: “Iteration 1: Implementation wrote X, 5 tests failed; Iteration 2: fixed 4 tests, 1 still failing; Iteration 3: all tests passed. Security issues: 2 low-risk noted, not fixed in this run. Deployment: Dockerfile built successfully.” This ensures transparency and helps identify any weak links to optimize.

## 6\) Optimization and Tuning

After initial validation, we will likely iterate on prompt tuning and configurations to improve performance, cost, and reliability:

* **Intelligent Agent Routing:** Currently, MCA uses a static IF/ELSE or fixed sequence of calls. We can make this smarter for flexibility. For example, use a **Question Classifier node** at MCA start that looks at the project brief to categorize project type (web app, script, etc.), and then maybe skip unnecessary agents (if it’s a simple script, perhaps no separate database agent needed). Also, we could use a Template node to decide order of agents dynamically (though our scenario is mostly linear). Another idea: incorporate a lightweight **Classifier** before Implementation to decide which model to use – e.g., if code task is small, use a cheaper model; if complex algorithm, use GPT-4. Dify’s Question Classifier can label tasks which we can map to model choices[\[63\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Image)[\[64\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=a,scrape%20webpage%2C%20summarize%20company%20info). We can also configure multiple LLM nodes (one per provider) and use conditions to select one. This ensures, for instance, if OpenAI is down, route to Anthropic automatically.

* **RAG Quality:** Fine-tune knowledge base parameters:

* If agents seem to not be using spec details fully, consider increasing top\_k retrieval or adjusting chunk size. Possibly some sections of spec might not appear in retrieval because of how query is phrased; we could add specific metadata filters to ensure relevant parts are always included (e.g., tag spec sections by agent type: Architecture agent always pull “Architecture Guidelines” section). Use the Retrieval Test tool in Dify to manually test queries[\[65\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,81)[\[66\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,85). If results are irrelevant, try hybrid search or tweak the query formation in Template (like ensure we include key terms).

* If knowledge results are too verbose (maybe including irrelevant paragraphs), we can limit tokens or do a quick summary of retrieved content via a Code node before feeding to LLM.

* For codebase, if we integrate KB\_CODEBASE, use metadata like file paths and only retrieve relevant files (Dify supports filtering by metadata fields like path or tag when querying the knowledge base[\[67\]](https://legacy-docs.dify.ai/guides/knowledge-base/integrate-knowledge-within-application#:~:text=Metadata%20Filtering,filter%20documents%20using%20metadata%20fields)). This prevents giving the Implementation agent the entire codebase context unnecessarily.

* Re-ranking: Dify supports rerankers (like Cohere) to improve retrieval[\[11\]](https://ofeng.org/posts/how-to-rag/#:~:text=3). If we find retrieval precision is an issue (maybe the wrong parts of spec returned), enabling a reranker or manually boosting certain docs could help.

* **Cost and Latency Optimization:**

* Use lower-tier models where suitable: For instance, Research agent could probably use GPT-3.5 instead of GPT-4, saving cost. Quality agent’s analysis of errors could be done by a smaller model or not at all (the raw error might suffice).

* Only use expensive models for the truly complex tasks (Architecture and Implementation). We can configure that easily by selecting model per LLM node.

* If some tasks are taking too long (for example, code generation might be slow with a huge context), consider splitting them: e.g., implement half the modules at a time. This can be done if we see performance issues – the Planner agent could break tasks more, and MCA loop through smaller tasks, which could be faster overall due to parallel or smaller context for each.

* The new parallel features in Dify could also be leveraged: for instance, Implementation agent could generate code while in parallel another branch generates a unit test (just an idea). Or run multiple tests in parallel. Our design didn’t heavily use parallel because of sequential dependencies, but as a tuning step, one could parallelize within QA: run different test suites concurrently if large.

* Streaming: enabling streaming on LLM might reduce latency perceived by user, but doesn’t change actual completion time. It might help to start processing output sooner though. If Dify’s API allows partial stream, maybe not vital for backend flows.

* **Loop thresholds:** If we find the Implementation-QA loop usually resolves by 2-3 tries, consider capping at, say, 3 attempts instead of 5 to save cost/time. Or implement logic: if by 3rd attempt the improvement is minimal, break out and fail (diminishing returns). That would require tracking quality of fixes (maybe track how many tests still failing and if it’s not improving, stop). This level of nuance might be future work.

* **State and Memory Management:** Over many iterations, variables like error logs could become large. While each loop currently overwrites latest\_error, if we wanted to keep a history, it could blow up context. It’s better to summarize or keep only the latest. We should ensure that by final stages, we don’t carry around huge chunks of data unnecessary. For instance, once tests pass, we don’t need to carry error logs anymore. We can null them or remove from state.

* If logs or artifacts get huge, consider offloading them: our EvidenceLogger already does that externally. We might occasionally clear some variables in the workflow to keep the context slim (Dify might not have an explicit memory management, but we can choose not to include large things in prompts).

* If needed, compress content: e.g., if we had to pass a large diff to LLM, we could have an LLM summarize it first (but that’s beyond initial scope).

* **Model Fallbacks:** To guard against provider outages or model failures mid-run, we can implement fallback. For each critical LLM node:

* Use the error handling: if call fails (exception or no response), set a variable like use\_alt\_model \= true and then route to the alternate model node. We might do this by duplicating the LLM node (one for each model) and connecting via IF. Or by using the new **Agent node** with function calling (OpenAI’s function calling could possibly allow calling another model – but that’s convoluted).

* Another tactic is to wrap the LLM call in a **Loop node** with a try count: try up to 2 times. If fails first, perhaps switch model second time.

* Ensure any random failures (network, etc.) are retried at least once automatically (most APIs do, but just in case).

* **Cost monitoring**: Although Dify doesn’t have built-in cost calc, we can approximate per run. We might integrate with OpenAI’s usage API or just manually track tokens. Possibly log token counts via Evidence logger (OpenAI returns usage in response, but Dify might not expose it directly). If cost is a concern, we refine prompts to be concise (especially system prompts can be long; ensure no unnecessary repetition).

* **Output Formatting**: After initial runs, refine how agents communicate:

* If Implementation output had too much explanation, enforce format. Possibly include in prompt: “Output only code within markdown triple backticks, no additional commentary.” Or at least limit to one-line comments.

* If QA’s feedback was too verbose or not precise, adjust its prompt to be more targeted (“Provide just a list of failing tests and possible cause.”).

* Architecture agent might need formatting (list modules in bullet points, etc.) to help parse or to improve readability in the artifact.

Each tuning change should be tested with another end-to-end run to see its effect. Over a few iterations, the system will become more robust and efficient. Document each change and the rationale in an **Optimization Notes** file (deliverable), e.g., “In v2.1, switched Research to GPT-3.5, saving 80% cost with no quality loss. In v2.2, added security issue fix loop – now system automatically addresses simple vulnerabilities detected by SA.”.

## 7\) Pivot & Comparative Alternatives

**When to Pivot:** If during development we encounter a fundamental limitation in Dify that blocks a core UMCA requirement, we will evaluate alternate orchestration frameworks. Potential triggers: inability to maintain needed state, no support for long-lived processes (if our flows needed to be paused/resumed beyond a single run), or if error handling and dynamic control become too hacky in Dify’s UI. So far, Dify 1.8 appears capable. But we keep this section for due diligence.

**Candidates:** The modern alternatives might include: \- **LangChain \+ LangSmith or LangGraph**: Programmatic approach where we script the agent orchestration in Python, potentially easier for complex logic (especially if conditions and loops become easier to express in code). LangGraph Studio might provide a similar visual builder but possibly more flexible in linking agents. \- **Autogen (by Microsoft)**: A framework for creating multi-agent systems with an orchestrator and specialist agents in code. It has primitives for tool use and could possibly implement UMCA logic via Python classes (like an Orchestrator agent and sub-agents). \- **Model-Context-Protocol (MCP) Native**: Build an MCP server that directly uses something like an orchestrator code, exposing each agent as MCP tool. CrewAI or other MCP orchestrators might allow chaining tools with LLM reasoning in between.

We will do a small comparative test focusing on the critical loop (Implementation \-\> QA loop) which is the heart of autonomy: \- Implement the same loop in LangChain (with say an agent that can call a code exec tool and a test tool, and has memory for state). See how much custom coding that requires and how it handles stopping criteria. \- If possible, use Autogen’s MultiAgentManager to create an MCA agent that spawns a coder and tester agent and coordinates them. Autogen might reduce the manual state management by using LLM for orchestration, but that can be less predictable. \- Measure reliability: e.g., does the LangChain approach allow easier introspection or error recovery than Dify’s node-based approach? \- Execution speed difference: Dify’s overhead vs a pure code orchestrator might differ.

**Evidence & Outcome:** Suppose Dify struggled with fine control in the loop (maybe it was tricky to break out appropriately). A code-based orchestrator might allow a simple while not tests\_passed: do X with direct condition checks, which is straightforward. On the other hand, Dify’s new Loop node actually gave us that abstraction cleanly[\[2\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=A%20Loop%20node%20executes%20repetitive,maximum%20loop%20count%20is%20reached)[\[28\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Termination%20Condition), so it wasn’t too bad. If something like persistent memory across sessions was needed (imagine a user stops and resumes later), Dify’s workflow would have to be restarted; other frameworks might allow saving state to disk and resuming. That’s advanced.

We would compile a side-by-side table of a few key criteria: \- **Development Effort:** Dify’s no-code vs coding in LangChain (Dify likely quicker to set up, as we mostly dragged nodes; but complex parsing might be easier in code). \- **Transparency:** Dify workflows provide visual clarity and logs of each node, while code orchestrator you need to log manually but have full control. \- **Flexibility:** If mid-run we wanted to adjust something dynamically, in Dify it might be difficult unless planned; in code you can always add conditions. \- **Performance:** Possibly negligible difference for the LLM calls themselves (dominant factor). Dify’s overhead is minimal (some DB operations). If anything, code might be slightly more efficient in avoiding some context passing overhead if done cleverly. \- **Scalability:** Dify can scale by adding more worker instances but is stateful in its own DB. A pure Python solution could be containerized and scaled horizontally easily, but then you reinvent monitoring, etc. Dify being a full platform has monitoring and plugin ecosystem (marketplace of tools) which is a plus.

If a pivot is warranted (say Dify cannot handle real-time concurrency or some needed integration), we’d outline a migration plan. For example, “Pivot to LangChain: reuse the same prompts and external tools (the CodeRunner API, etc.), implement an orchestrator script that calls each agent in sequence. Use LangChain’s Memory to hold state. Migrate knowledge base by using a vector store like FAISS or Weaviate and hooking retrieval in code. This would take \~2 weeks to implement and test, and we lose the nice Dify UI but gain more control.” Provide evidence like maybe an issue or forum post where someone attempted similar and hit a wall with Dify[\[68\]](https://github.com/langgenius/dify/issues/11415#:~:text=Add%20Support%20for%20Model%20Context,our%20current%20data%20connection%20strategies) (for instance, if Dify’s openapi plugins had limits prompting such move).

In summary, we would only pivot if absolutely needed. The guide at this stage suggests Dify is suitable. The pivot section ensures we are prepared with an alternative and not locked in if a showstopper emerges.

## 8\) Deliverables

To conclude the research and implementation planning, we will produce the following deliverables, each thoroughly documented and ready for the team:

1. **Executive Summary (\<= 2 pages):** A high-level overview of the feasibility and chosen design. It will state that we achieved \~90-100% of UMCA functionality in Dify, highlight any constraints (e.g., “requires custom code runner service; limited long-term memory but mitigated via knowledge base”), and present the selected “golden combination” of features (Dify Workflows \+ custom tools \+ MCP connectors as needed). Key architecture diagrams or bullet points of the flow will be included for a non-technical stakeholder to grasp the solution.

2. **UMCA-Dify Mapping Matrix:** The table from section 2 fully completed, possibly extended with any additional items we identified (like UI front-end, monitoring, etc.). This matrix shows traceability from requirement to implementation approach with citations, so stakeholders see nothing was left unaddressed.

3. **Architecture Diagram:** A visual diagram showing all the components and their interactions. Likely a flow diagram: MCA workflow (box) calling out to seven agent workflows (boxes), each possibly calling tools (icons for HTTP services). Show knowledge bases feeding into LLM nodes. Indicate data flows (code to repo, tests to runner, logs to evidence). This can be in Mermaid (text) or a PNG. If Mermaid is feasible: we can create a sequence or flowchart. For clarity and since the user asked for it, we might produce a PNG outside of this answer (but as AI, I can’t easily embed a new custom diagram without drawing it manually in text). If needed, provide a pseudo-code block with a Mermaid that the user can render. (We may include a simple Mermaid flowchart as a starting point).

4. **Step-by-Step Implementation Guide:** Essentially, this document (section 4 and beyond) refined, which serves as a runbook for engineers to follow in building the system. It includes precise instructions, node config details, and any values that need to be plugged in (like environment variables). This ensures that someone can reproduce our setup in Dify without guesswork.

5. **Dify Exports (JSON files):** All 8 apps exported. These will be provided presumably via the user’s system (maybe attached or in a repository). In the context of our answer, we just mention that we have them as deliverables. If the user had an upload mechanism, we would attach them, but here we list them.

6. **Validation Report:** A document describing the test runs performed, including logs and outcomes. For example, it might include a snippet of the final log from evidence logger or Dify run logs showing “Iteration 2: tests passed” etc., and confirmation that the final code works. It will also list any bugs found and fixes applied during testing.

7. **Optimization Notes:** A summary of what tuning was done at the end – e.g., which model choices made, final temperature settings, final knowledge retrieval settings (chunk size, top-k), loop count, etc. Essentially the final configuration values that differ from initial defaults, along with reasoning.

8. **Pivot Brief (if needed):** If we did the comparative analysis and found a pivot advisable, this brief will contain the evidence gathered (e.g., references to Dify limitations[\[68\]](https://github.com/langgenius/dify/issues/11415#:~:text=Add%20Support%20for%20Model%20Context,our%20current%20data%20connection%20strategies)) and a high-level plan to migrate. If pivot wasn’t necessary because Dify met needs, we will state that and include the comparative insights as an appendix for future reference.

All deliverables will be written clearly and include references to the sources we consulted (Dify docs, etc.) to justify decisions. The idea is that this package not only guides implementation but also serves as documentation for future maintainers and as a proof of feasibility to decision-makers.

## 9\) Naming, Structure & Conventions

To maintain clarity across the system, we adhere to consistent naming and coding conventions:

* **Application Names:** Each Dify app is named with the prefix UMCA\_ followed by the agent role in uppercase (as listed in section 3.1). This grouping makes them easily identifiable in the Dify interface. Within each app, the main workflow can just be the default (there’s typically one workflow per app of type Workflow). We might internally refer to them by role for brevity (e.g., “RA workflow”).

* **Knowledge Bases:** Named as KB\_SPEC, KB\_PROMPTS, KB\_PLAYBOOKS exactly, so it’s clear what they contain. In prompts or logs, we might refer to “spec KB” etc., but in configuration use exact names (Dify will list them by those names when attaching to nodes).

* **Tools Names:** Use the exact names we set in section 4.2: HTTP\_CodeRunner, HTTP\_RepoFS, HTTP\_EvidenceLogger. The prefix HTTP\_ indicates these are custom HTTP integrations (not MCP or built-in). This helps if later we add an MCP tool, we might prefix with MCP (e.g., MCP\_Zapier). In Dify’s tool selection UI, they’ll appear by these names.

* **Variables and fields:** Use snake\_case for multi-word variables in workflows (e.g., tests\_passed, current\_gate). JSON keys in prompts can be snake\_case too. This is somewhat language agnostic and clear. For any file content (like JSON output), snake\_case as well to stay consistent. Keep variable names consistent across nodes to avoid confusion (Dify might auto-suggest existing ones).

* **Prompt Style:** All system prompts and user prompts will be written in a consistent manner following OpenAI style (we used triple backticks in documentation here for clarity but in Dify you just enter text; maintain role separation like we did or use \<\#system\> style if Dify expects some formatting – but typically it’s just a system prompt field). Ensure each agent’s system prompt includes its name and concise instructions, and that no two agents have conflicting instructions. They should know of the MCA in context but not overlap roles.

* **Commit Messages:** When writing to repo via RepoFS, use a standardized commit message prefix like \[UMCA\]. For example, \[UMCA\] Implement module X (by ImplementationAgent) or \[UMCA\] Add architecture design (by ArchitectureAgent). This makes it easy to see AI-made commits in history. It also implicitly logs which agent made the change. Ensure commit messages are not too long or revealing (in case repo is public).

* **File Organization:** If our repo is initially empty, agents will create files. They should follow normal project structure (which can be guided by architecture). Possibly instruct Architecture agent to propose a structure (like a src/ directory, tests/ directory). That document should guide Implementation where to put files. If any ambiguity, we might enforce via naming conventions in tasks (like include desired path in task\_description).

* **Session IDs and Logging:** If we tag logs or commit messages with a run ID, use a short unique identifier. Perhaps format like UMCA-20230911-\<shortuuid\> in evidence log to correlate all events of one run. Also prefix logs with agent name when logging (the evidence service could add that anyway based on which agent calls it, if we include agent identifier in payload).

* **Model usage notation:** In documentation, we’ll note which model each LLM node uses. Possibly in the final system we might set environment variable to easily switch model (Dify might allow referencing a provider alias). But since Dify typically binds a model at design time per node, we’ll list it in the prompt (like “(Model: GPT-4)” for clarity in docs).

* **Comments and Documentation:** Within any code we wrote (like in code nodes or external scripts for CodeRunner), include comments referencing this guide or at least meaningful descriptions so future devs see why something is done.

By following these conventions, the configuration remains transparent and easier to maintain. For example, a new team member looking at the repo will quickly identify \[UMCA\] commits as AI-generated and can refer to ARCHITECTURE.md to see rationale, etc. Consistency also reduces risk of errors (like mismatched variable names between workflows).

## 10\) Kickoff Checklist

Finally, before launching the development phase (or running the system in production mode), we verify that all prerequisites and initial steps are complete. This checklist should be run through by the implementers:

* \[ \] **Dify Deployment:** Dify is deployed and accessible (either on localhost or a server URL). The team has admin access to it.

* \[ \] **Providers Configured:** All required model API keys are set in Dify and tested (try a simple LLM call in a scratch chat to confirm each works). Particularly ensure the ones for critical tasks (OpenAI, etc.) are valid and have sufficient quota.

* \[ \] **Workspace & KBs:** The “UMCA” workspace is created in Dify. Knowledge bases KB\_SPEC, KB\_PROMPTS, KB\_PLAYBOOKS exist and documents are indexed. Verify by querying something in the UI (Dify often has a test query function for KB). If any doc failed to index (check for size issues or format issues), fix that (maybe split it up).

* \[ \] **Tools Live:** The custom HTTP endpoints (CodeRunner, RepoFS, Evidence) are up and running. E.g., ensure the code runner container is running and accessible at the configured URL. Test it manually (curl a simple command). Same for RepoFS – perhaps initialize a git repo for it to operate on, and test reading/writing a dummy file via API. The Evidence logger, ensure it accepts a test log entry and stores it (could be as simple as printing to console if it’s a dummy, but ideally store). Also, confirm the secrets (like tokens) are correct by making an authorized request.

* \[ \] **All 8 Apps Created:** In Dify’s Applications list, verify all UMCA\_MCA, UMCA\_RA, ..., UMCA\_DA are present. Open each to confirm the workflow nodes are in place as per design. No stub nodes left unconfigured (common oversight: forgetting to set the actual tool in an HTTP node, etc.).

* \[ \] **MCA \<-\> Sub-workflow Wiring:** Open UMCA\_MCA workflow and double-check each Tools node calling a sub-workflow is properly mapped to the correct app and the input/outputs are aligned. Dify usually allows mapping output variables of one node into input of next; ensure, for example, after AA call, its outputs are indeed going into the Implementation loop (via assigned variables). If using JSON schema, check that parsing happens (the Parameter Extractor nodes if any, etc., are configured with correct schema to extract). Essentially, run through the logic mentally or with a dry-run in debug mode.

* \[ \] **Initial Prompt Load:** Ensure each LLM node’s system prompt is populated with the actual content from spec (we might have copy-pasted it, but just confirm no placeholders like “TBD” left). If the spec references some external links or info not in KB, consider adding those to KB or prompt. Also confirm no one exceeded context length by too large a system prompt combined with retrieval (should be fine).

* \[ \] **Test Brief Prepared:** Have a test case ready (as in validation plan) to run immediately. The team should agree on an example project we use as baseline (maybe the to-do app example or something from spec if given). This brief will be used to do the first official run. (Optionally, prepare a couple of briefs: a simple one and a more complex one to gradually test capabilities).

* \[ \] **Team Aligned:** (Beyond technical) All team members or stakeholders know how to start/stop the system, how to monitor it (which Dify logs to look at, how to interpret evidence log), and how to intervene if something goes wrong (e.g., manually edit a file if agent stuck, or adjust a prompt). It's important because fully autonomous doesn’t mean unattended; at least in testing phase someone should watch the runs.

Once all these boxes are checked, we proceed to the initial run and monitor closely, then iterate improvements. This ensures no obvious setup step was missed (like forgetting to actually start the code runner service, a common gotcha\!).

---

**Conclusion:** With this guide, we have mapped UMCA’s ambitious autonomous coding requirements to a concrete Dify-based implementation. The combination of Dify Workflows (for structured orchestration, looping, and branching)[\[2\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=A%20Loop%20node%20executes%20repetitive,maximum%20loop%20count%20is%20reached)[\[28\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Termination%20Condition), Dify’s integrated knowledge retrieval for context[\[41\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Knowledge%20Retrieval), and custom tool plugins for executing code and managing a repo provides a powerful “engineering copilot” framework. The design keeps the **MCA** firmly in control as specified, while leveraging the strengths of specialist LLM agents in their domains. We have addressed potential pitfalls with evidence-backed solutions, and outlined how to validate and refine the system. If any limitations arise, we are prepared with alternatives, but current research suggests Dify in 2025 is up to the task of orchestrating an autonomous AI development cycle[\[21\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=AI%20applications%20are%20quickly%20moving,build%20and%20hard%20to%20scale)[\[22\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=Configure%20an%20MCP%20Server%20as,a%20Tool). The next steps are implementation and continuous testing, after which UMCA could become a reality – a major step toward AI-augmented software engineering.

---

[\[1\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=IF%2FELSE) [\[3\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Code%20Execution) [\[4\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Template) [\[5\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Variable%20Aggregator) [\[6\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Allows%20sending%20server%20requests%20via,generating%20images%2C%20and%20other%20scenarios) [\[17\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=,194) [\[25\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=HTTP%20Request) [\[41\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Knowledge%20Retrieval) [\[51\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Iteration) [\[54\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Tools) [\[58\]](https://legacy-docs.dify.ai/guides/workflow/node#:~:text=Large%20Language%20Model%20) Node Description | Dify

[https://legacy-docs.dify.ai/guides/workflow/node](https://legacy-docs.dify.ai/guides/workflow/node)

[\[2\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=A%20Loop%20node%20executes%20repetitive,maximum%20loop%20count%20is%20reached) [\[28\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Termination%20Condition) [\[29\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Caps%20execution%20at%2010%20iterations%2C,regardless%20of%20other%20conditions) [\[30\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop%20Variables) [\[31\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Exit%20Loop%20Node) [\[39\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Loop) [\[55\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=%60x%20,01) [\[56\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=The%20loop%20can%20be%20terminated,the%20loop%20will%20immediately%20exit) [\[57\]](https://legacy-docs.dify.ai/guides/workflow/node/loop#:~:text=Exit%20Loop%20Node) Loop | Dify

[https://legacy-docs.dify.ai/guides/workflow/node/loop](https://legacy-docs.dify.ai/guides/workflow/node/loop)

[\[7\]](https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning#:~:text=Recently%2C%20Dify%20officially%20introduced%20a,type%E2%80%94Agent%20Strategy%E2%80%94which%20we%E2%80%99ll%20explore%20below) [\[8\]](https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning#:~:text=,of%20%E2%80%9CThink%E2%80%93Act%E2%80%93Observe%E2%80%9D) Dify Agent Node Introduction – When Workflows Learn “Autonomous Reasoning” \- Dify Blog

[https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning](https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning)

[\[9\]](https://ofeng.org/posts/how-to-rag/#:~:text=1) [\[10\]](https://ofeng.org/posts/how-to-rag/#:~:text=Chunking%20is%20the%20process%20of,It%20has%20several%20benefits) [\[11\]](https://ofeng.org/posts/how-to-rag/#:~:text=3) [\[50\]](https://ofeng.org/posts/how-to-rag/#:~:text=The%20last%20step%20is%20to,generate%20the%20most%20relevant%20response) How to Rag \- case study from dify \- Feng's Notes

[https://ofeng.org/posts/how-to-rag/](https://ofeng.org/posts/how-to-rag/)

[\[12\]](https://legacy-docs.dify.ai/plugins/schema-definition/persistent-storage#:~:text=the%20request%20returns%20the%20data%2C,and%20the%20task%20ends) [\[13\]](https://legacy-docs.dify.ai/plugins/schema-definition/persistent-storage#:~:text=) Persistent Storage | Dify

[https://legacy-docs.dify.ai/plugins/schema-definition/persistent-storage](https://legacy-docs.dify.ai/plugins/schema-definition/persistent-storage)

[\[14\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Dify%20Workflow%20is%20widely%20used,increasing%20latency%20and%20response%20times) [\[32\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Dify%20v0,faster%20and%20with%20greater%20flexibility) [\[33\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=The%20branches%20will%20execute%20in,the%20documentation%20for%20detailed%20instructions) [\[34\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Conditional%20branch%20parallelism%20runs%20different,example%20shows%20this%20setup) [\[35\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=existing%20company%20info%20and%20interview,questions) [\[60\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Release%20Dify%201.5.0%3A%20Real,Yan%20%C2%B7%20Jun%2025%2C%202025) [\[63\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=Image) [\[64\]](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch#:~:text=a,scrape%20webpage%2C%20summarize%20company%20info) Dify v0.8.0: Accelerating Workflow Processing with Parallel Branch \- Dify Blog

[https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch](https://dify.ai/blog/accelerating-workflow-processing-with-parallel-branch)

[\[15\]](https://github.com/langgenius/dify-plugins#:~:text=Dify%C2%A0is%20an%20open,transition%20from%20prototype%20to%20production) [\[16\]](https://github.com/langgenius/dify-plugins#:~:text=) [\[20\]](https://github.com/langgenius/dify-plugins#:~:text=Dify%20Marketplace%20is%20a%20vibrant,encourages%20innovation%20and%20resource%20sharing) [\[36\]](https://github.com/langgenius/dify-plugins#:~:text=) [\[37\]](https://github.com/langgenius/dify-plugins#:~:text=) [\[40\]](https://github.com/langgenius/dify-plugins#:~:text=These%20plugins%20integrate%20various%20AI,to%20Quick%20Start%3A%20Model%20Plugin) GitHub \- langgenius/dify-plugins: All Dify Plugins listed in Dify Marketplace, plus illustrated plugin examples.

[https://github.com/langgenius/dify-plugins](https://github.com/langgenius/dify-plugins)

[\[18\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=exceed%20rate%20limits%20and%20affect,thereby%20ensuring%20stable%20business%20operations) [\[19\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=Model%20Load%20Balancing) [\[43\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=Configure%20Model%20Load%20Balancing%20and,for%20the%20same%20model) [\[53\]](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing#:~:text=Enabling%20Load%20Balancing) Load Balancing | Dify

[https://legacy-docs.dify.ai/guides/model-configuration/load-balancing](https://legacy-docs.dify.ai/guides/model-configuration/load-balancing)

[\[21\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=AI%20applications%20are%20quickly%20moving,build%20and%20hard%20to%20scale) [\[22\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=Configure%20an%20MCP%20Server%20as,a%20Tool) [\[23\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=On%20the%20Tools%20page%2C%20select,more%20than%208%2C000%20authorized%20apps) [\[24\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=2,name%2C%20and%20a%20server%20identifier) [\[38\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=Image) [\[44\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=outside%20servers,is%20built%20in%20both%20directions) [\[48\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=The%20Model%20Context%20Protocol%20,is%20built%20in%20both%20directions) [\[49\]](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support#:~:text=Any%20Dify%20agent%20or%20workflow,as%20a%20standard%20MCP%20endpoint) Dify v1.6.0: Built-in Two-Way MCP Support \- Dify Blog

[https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support](https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support)

[\[26\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,53) [\[27\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,Tool%20Configuration) [\[47\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,55) [\[61\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,57) [\[62\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=) [\[65\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,81) [\[66\]](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications#:~:text=,85) Features and Specifications | Dify

[https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications](https://legacy-docs.dify.ai/getting-started/readme/features-and-specifications)

[\[42\]](https://legacy-docs.dify.ai/guides/knowledge-base/integrate-knowledge-within-application#:~:text=Integrate%20Knowledge%20Base%20within%20Application,filter%20documents%20using%20metadata%20fields) [\[67\]](https://legacy-docs.dify.ai/guides/knowledge-base/integrate-knowledge-within-application#:~:text=Metadata%20Filtering,filter%20documents%20using%20metadata%20fields) Integrate Knowledge Base within Application \- Dify

[https://legacy-docs.dify.ai/guides/knowledge-base/integrate-knowledge-within-application](https://legacy-docs.dify.ai/guides/knowledge-base/integrate-knowledge-within-application)

[\[45\]](https://dify.ai/blog/building-ssh-plugin-with-cursor-a-codeless-approach-to-server-management#:~:text=SSH%20Plugin%20Overview) [\[46\]](https://dify.ai/blog/building-ssh-plugin-with-cursor-a-codeless-approach-to-server-management#:~:text=Installation) Building SSH Plugin with Cursor: A Codeless Approach to Server Management \- Dify Blog

[https://dify.ai/blog/building-ssh-plugin-with-cursor-a-codeless-approach-to-server-management](https://dify.ai/blog/building-ssh-plugin-with-cursor-a-codeless-approach-to-server-management)

[\[52\]](https://docs.dify.ai/en/getting-started/install-self-hosted/readme#:~:text=Dify%2C%20an%20open,using%20either%20of%20these%20methods) Introduction \- Dify Docs

[https://docs.dify.ai/en/getting-started/install-self-hosted/readme](https://docs.dify.ai/en/getting-started/install-self-hosted/readme)

[\[59\]](https://legacy-docs.dify.ai/guides/workflow#:~:text=Knowledge%20Retrieval%20%C2%B7%20Question%20Classifier,transformation%2C%20iteration%20nodes%2C%20and%20more) Workflow | Dify

[https://legacy-docs.dify.ai/guides/workflow](https://legacy-docs.dify.ai/guides/workflow)

[\[68\]](https://github.com/langgenius/dify/issues/11415#:~:text=Add%20Support%20for%20Model%20Context,our%20current%20data%20connection%20strategies) Add Support for Model Context Protocol (MCP) \#11415 \- GitHub

[https://github.com/langgenius/dify/issues/11415](https://github.com/langgenius/dify/issues/11415)