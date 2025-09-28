---
canonical_source: "Scaffold/ai-coding-system/docs/analysis/phase1_refactor/reports/report_orchestrator.md"
golden_pack_selection: "true"
spec_coverage: ["guardrails", "observability", "operations", "orchestration", "security", "ux_surface"]
selection_score: "58.8"
selection_reason: "High-scoring foundational content"
word_count: "10773"
cluster: "agentic"
title: "Report Orchestrator"
canonical_id: "scaffold-report-orchestrator"
---
Here is the complete architectural audit for `orchestrator.py` as of July 2025.

## 1. Complete Line-by-Line Listing

This section quotes every line from the source file for complete traceability. Analysis for other sections will refer to these line numbers.

> L1: """
> L2: CerebrumOrchestrator - LangGraph Workflow Coordination
> L3: 
> L4: This module implements the main Cerebrum orchestrator with LangGraph workflow
> L5: coordination for hierarchical Planner-Executor-Critic system.
> L6: """
> L7: 
> L8: import asyncio
> L9: import json
> L10: import logging
> L11: import os
> L12: import pickle
> L13: import re
> L14: import threading
> L15: import time
> L16: import httpx
> L17: from datetime import datetime
> L18: from typing import Dict, List, Optional, Any, Union, Set, Callable
> L19: from dataclasses import dataclass, field
> L20: from enum import Enum
> L21: 
> L22: try:
> L23:     import redis
> L24:     REDIS_AVAILABLE = True
> L25: except ImportError:
> L26:     REDIS_AVAILABLE = False
> L27: 
> L28: from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
> L29: from langgraph.graph import StateGraph, END
> L30: from langgraph.graph.message import add_messages
> L31: from typing_extensions import Annotated, TypedDict
> L32: 
> L33: from rich.console import Console
> L34: from rich.panel import Panel
> L35: from rich.progress import Progress, TaskID
> L36: from rich.table import Table
> L37: 
> L38: from .core.planner_agent import PlannerAgent, TaskContext, DecompositionPlan, TaskComplexity
> L39: from .core.executor_base import ExecutorAgent, ExecutionResult, ExecutionStatus
> L40: from .core.critic_agent import CriticAgent, QualityAssessment
> L41: from .types import OrchestrationTask, OrchestrationSession, OrchestrationPhase, SessionStatus
> L42: from .session_manager import SessionManager
> L43: 
> L44: # Monitoring system integration
> L45: try:
> L46:     from .monitoring import (
> L47:         MonitoringSystem,
> L48:         SystemHealthManager,
> L49:         PerformanceMetricsCollector,
> L50:         ErrorTracker,
> L51:         HealthStatus,
> L52:         ServiceHealth,
> L53:         GraphRAGCircuitBreaker,
> L54:         ExecutionError,
> L55:         TransientExecutionError,
> L56:         PermanentExecutionError,
> L57:         ResourceConflictError,
> L58:         BackendUnavailableError,
> L59:         GraphRAGUnavailableError
> L60:     )
> L61:     MONITORING_AVAILABLE = True
> L62: except ImportError:
> L63:     MONITORING_AVAILABLE = False
> L64:     # Create dummy monitoring classes for graceful degradation
> L65:     class MonitoringSystem:
> L66:         def __init__(self, orchestrator): pass
> L67:         async def get_unified_monitoring_data(self): return {}
> L68:         def get_monitoring_summary(self): return {}
> L69:     class SystemHealthManager:
> L70:         def __init__(self, orchestrator): pass
> L71:         async def get_comprehensive_health(self): return {}
> L72:     class PerformanceMetricsCollector:
> L73:         def __init__(self, orchestrator): pass
> L74:         def record_session_metrics(self, session): pass
> L75:         def get_performance_analysis(self, hours=24): return {}
> L76:     class ErrorTracker:
> L77:         def __init__(self, orchestrator): pass
> L78:         def record_error(self, error_type, message, context=None): pass
> L79:     class GraphRAGCircuitBreaker:
> L80:         def __init__(self, failure_threshold=5, recovery_timeout=60): pass
> L81:         async def call(self, func, *args, **kwargs): return await func(*args, **kwargs)
> L82:         def get_status(self): return {"state": "CLOSED"}
> L83:     # Re-export error classes that might be used
> L84:     class ExecutionError(Exception): pass
> L85:     class TransientExecutionError(ExecutionError): pass
> L86:     class PermanentExecutionError(ExecutionError): pass
> L87:     class ResourceConflictError(ExecutionError): pass
> L88:     class BackendUnavailableError(TransientExecutionError): pass
> L89:     class GraphRAGUnavailableError(TransientExecutionError): pass
> L90: 
> L91: # Event capture integration
> L92: try:
> L93:     from ..event_capture.event_types import EventType, OrchestratorEvent
> L94:     from ..event_capture.orchestrator_hooks import (
> L95:         setup_event_capture_hooks,
> L96:         capture_task_start,
> L97:         capture_task_complete,
> L98:         capture_planning_start,
> L99:         capture_planning_complete,
> L100:         capture_execution_start,
> L101:         capture_execution_complete,
> L102:         capture_criticism_start,
> L103:         capture_criticism_complete,
> L104:         capture_agent_selection,
> L105:         capture_error_event,
> L106:         capture_workflow_event
> L107:     )
> L108:     EVENT_CAPTURE_AVAILABLE = True
> L109: except ImportError:
> L110:     # Event capture not available - create dummy functions
> L111:     EVENT_CAPTURE_AVAILABLE = False
> L112:     def setup_event_capture_hooks(*args, **kwargs): pass
> L113:     def capture_task_start(*args, **kwargs): pass
> L114:     def capture_task_complete(*args, **kwargs): pass
> L115:     def capture_planning_start(*args, **kwargs): pass
> L116:     def capture_planning_complete(*args, **kwargs): pass
> L117:     def capture_execution_start(*args, **kwargs): pass
> L118:     def capture_execution_complete(*args, **kwargs): pass
> L119:     def capture_criticism_start(*args, **kwargs): pass
> L120:     def capture_criticism_complete(*args, **kwargs): pass
> L121:     def capture_agent_selection(*args, **kwargs): pass
> L122:     def capture_error_event(*args, **kwargs): pass
> L123:     def capture_workflow_event(*args, **kwargs): pass
> L124: 
> L125: 
> L126: 
> L127: 
> L128: 
> L129: 
> L130: class CerebrumState(TypedDict):
> L131:     """State for the Cerebrum orchestration workflow."""
> L132:     messages: Annotated[List[BaseMessage], add_messages]
> L133:     session: OrchestrationSession
> L134:     current_phase: OrchestrationPhase
> L135:     available_executors: Dict[str, ExecutorAgent]
> L136:     error: Optional[str]
> L137:     retry_count: int
> L138: 
> L139: 
> L140: class CerebrumOrchestrator:
> L141:     """
> L142:     Main Cerebrum orchestrator with LangGraph workflow coordination.
> L143:     
> L144:     Implements hierarchical Planner-Executor-Critic architecture:
> L145:     1. PlannerAgent decomposes tasks into manageable sub-tasks
> L146:     2. ExecutorAgents execute sub-tasks with specialized capabilities
> L147:     3. CriticAgent validates results and provides quality feedback
> L148:     4. Orchestrator coordinates the entire workflow with state management
> L149:     """
> L150:     
> L151:     def __init__(
> L152:         self,
> L153:         planner_agent: Optional[PlannerAgent] = None,
> L154:         critic_agent: Optional[CriticAgent] = None,
> L155:         executor_agents: Optional[Dict[str, ExecutorAgent]] = None,
> L156:         backend=None,
> L157:         console: Optional[Console] = None,
> L158:         max_session_time: int = 1800,  # 30 minutes
> L159:         quality_threshold: float = 0.7,
> L160:         enable_parallel_execution: bool = True
> L161:     ):
> L162:         """Initialize the Cerebrum orchestrator.
> L163:         
> L164:         Args:
> L165:             planner_agent: Agent for task planning and decomposition
> L166:             critic_agent: Agent for quality assessment and feedback
> L167:             executor_agents: Dictionary of specialized executor agents
> L168:             backend: AI backend for orchestration decisions
> L169:             console: Rich console for output
> L170:             max_session_time: Maximum session time in seconds
> L171:             quality_threshold: Minimum acceptable quality score
> L172:             enable_parallel_execution: Whether to enable parallel execution
> L173:         """
> L174:         self.backend = backend
> L175:         self.console = console or Console()
> L176:         self.max_session_time = max_session_time
> L177:         self.quality_threshold = quality_threshold
> L178:         self.enable_parallel_execution = enable_parallel_execution
> L179:         
> L180:         # Add max retries configuration for Phase 1C
> L181:         self.max_retries = 2  # Maximum number of retry attempts
> L182:         self.retry_delay = 1.0  # Delay between retries in seconds
> L183:         
> L184:         # Initialize logger first
> L185:         self.logger = logging.getLogger(__name__)
> L186:         
> L187:         # GraphRAG integration
> L188:         self.graphrag_url = os.getenv("GRAPHRAG_URL", "http://localhost:8001")
> L189:         self.graphrag_enabled = os.getenv("GRAPHRAG_ENABLED", "true").lower() == "true"
> L190:         self.graphrag_circuit_breaker = GraphRAGCircuitBreaker(
> L191:             failure_threshold=int(os.getenv("GRAPHRAG_FAILURE_THRESHOLD", "5")),
> L192:             recovery_timeout=int(os.getenv("GRAPHRAG_RECOVERY_TIMEOUT", "60"))
> L193:         )
> L194:         self.logger.info(f"GraphRAG integration: {'enabled' if self.graphrag_enabled else 'disabled'} at {self.graphrag_url}")
> L195:         
> L196:         # Initialize agents
> L197:         self.planner_agent = planner_agent or PlannerAgent(backend=backend, console=console)
> L198:         self.critic_agent = critic_agent or CriticAgent(backend=backend, console=console)
> L199:         self.executor_agents = executor_agents or {}
> L200:         
> L201:         # Session management
> L202:         self.session_counter = 0
> L203:         self.session_id_lock = threading.Lock()  # Thread-safe session ID generation
> L204:         
> L205:         # Redis session persistence setup
> L206:         redis_client = None
> L207:         if REDIS_AVAILABLE:
> L208:             try:
> L209:                 redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
> L210:                 redis_client = redis.from_url(redis_url, decode_responses=False)
> L211:                 redis_client.ping()  # Test connection
> L212:                 self.logger.info(f"Connected to Redis at {redis_url}")
> L213:             except Exception as e:
> L214:                 self.logger.warning(f"Failed to connect to Redis: {e}. Sessions will not be persisted.")
> L215:                 redis_client = None
> L216:         else:
> L217:             self.logger.warning("Redis not available. Sessions will not be persisted.")
> L218:         
> L219:         # Initialize SessionManager with Redis integration
> L220:         self.session_manager = SessionManager(
> L221:             max_completed_sessions=100,
> L222:             session_ttl_hours=24,
> L223:             redis_client=redis_client,
> L224:             logger=self.logger
> L225:         )
> L226:         
> L227:         # Performance tracking
> L228:         self.total_sessions = 0
> L229:         self.successful_sessions = 0
> L230:         self.total_orchestration_time = 0.0
> L231:         self.average_quality_score = 0.0
> L232:         
> L233:         # Initialize LangGraph workflow
> L234:         self.workflow = self._create_orchestration_workflow()
> L235:         
> L236:         # Setup event capture hooks
> L237:         setup_event_capture_hooks(self)
> L238:         self.logger.info("Event capture hooks initialized")
> L239:         
> L240:         # Initialize monitoring system
> L241:         if MONITORING_AVAILABLE:
> L242:             self.monitoring_system = MonitoringSystem(self)
> L243:             self.health_manager = self.monitoring_system.health_manager
> L244:             self.performance_collector = self.monitoring_system.performance_collector
> L245:             self.error_tracker = self.monitoring_system.error_tracker
> L246:             self.logger.info("Monitoring system initialized with full capabilities")
> L247:         else:
> L248:             # Fallback monitoring (basic functionality)
> L249:             self.monitoring_system = MonitoringSystem(self)
> L250:             self.health_manager = SystemHealthManager(self)
> L251:             self.performance_collector = PerformanceMetricsCollector(self)
> L252:             self.error_tracker = ErrorTracker(self)
> L253:             self.logger.warning("Monitoring system initialized with basic capabilities (monitoring package not available)")
> L254:         
> L255:         # Record startup time for uptime calculation
> L256:         self._start_time = time.time()
> L257:         self.logger.info("Cerebrum orchestrator fully initialized with monitoring capabilities")
> L258:     
> L259:     def get_completed_sessions(self) -> Dict[str, Dict]:
> L260:         """Get completed sessions from SessionManager."""
> L261:         return self.session_manager.get_completed_sessions_from_redis()
> L262: 
> L263:     def register_executor_agent(self, name: str, agent: ExecutorAgent):
> L264:         """Register an executor agent with the orchestrator."""
> L265:         self.executor_agents[name] = agent
> L266:         self.logger.info(f"Registered executor agent: {name} ({agent.specialization})")
> L267:     
> L268:     def _create_orchestration_workflow(self) -> StateGraph:
> L269:         """Create the LangGraph workflow for orchestration."""
> L270:         workflow = StateGraph(CerebrumState)
> L271:         
> L272:         # Define workflow nodes
> L273:         workflow.add_node("initialize_session", self._initialize_session)
> L274:         workflow.add_node("plan_task", self._plan_task)
> L275:         workflow.add_node("execute_plan", self._execute_plan)
> L276:         workflow.add_node("assess_quality", self._assess_quality)
> L277:         workflow.add_node("integrate_results", self._integrate_results)
> L278:         workflow.add_node("complete_session", self._complete_session)
> L279:         
> L280:         # Define workflow edges
> L281:         workflow.set_entry_point("initialize_session")
> L282:         
> L283:         workflow.add_edge("initialize_session", "plan_task")
> L284:         workflow.add_edge("plan_task", "execute_plan")
> L285:         workflow.add_edge("execute_plan", "assess_quality")
> L286:         
> L287:         # Conditional edge from quality assessment
> L288:         workflow.add_conditional_edges(
> L289:             "assess_quality",
> L290:             self._should_retry_execution,
> L291:             {
> L292:                 "retry": "execute_plan",
> L293:                 "integrate": "integrate_results"
> L294:             }
> L295:         )
> L296:         
> L297:         workflow.add_edge("integrate_results", "complete_session")
> L298:         workflow.add_edge("complete_session", END)
> L299:         
> L300:         return workflow.compile()
> L301:     
> L302:     async def orchestrate_task(self, task: OrchestrationTask) -> OrchestrationSession:
> L303:         """
> L304:         Orchestrate the complete execution of a task.
> L305:         
> L306:         Args:
> L307:             task: The task to orchestrate
> L308:             
> L309:         Returns:
> L310:             OrchestrationSession with complete execution results
> L311:         """
> L312:         # Thread-safe session ID generation
> L313:         with self.session_id_lock:
> L314:             session_id = f"cerebrum_session_{self.session_counter}"
> L315:             self.session_counter += 1
> L316:         
> L317:         self.console.print(Panel(
> L318:             f"[bold blue]🧠 Cerebrum Orchestrating Starting[/bold blue]\n"
> L319:             f"Session ID: {session_id}\n"
> L320:             f"Task: {task.description}\n"
> L321:             f"Complexity: {task.complexity.value}",
> L322:             title="Cerebrum Orchestrator",
> L323:             style="blue"
> L324:         ))
> L325:         
> L326:         # Create session
> L327:         session = OrchestrationSession(
> L328:             session_id=session_id,
> L329:             task=task,
> L330:             status=SessionStatus.ACTIVE
> L331:         )
> L332:         
> L333:         self.session_manager.add_active_session(session_id, session)
> L334:         
> L335:         # PHASE 2: Task start event hook (LINE 175 requirement)
> L336:         capture_task_start(session)
> L337:         
> L338:         # Initialize state
> L339:         initial_state = CerebrumState(
> L340:             messages=[SystemMessage(content="Cerebrum orchestration workflow initiated")],
> L341:             session=session,
> L342:             current_phase=OrchestrationPhase.INITIALIZATION,
> L343:             available_executors=self.executor_agents,
> L344:             error=None,
> L345:             retry_count=0
> L346:         )
> L347:         
> L348:         try:
> L349:             # Execute orchestration workflow
> L350:             final_state = await self.workflow.ainvoke(initial_state)
> L351:             
> L352:             # PHASE 2: Workflow execution event hook (LINE 218 requirement)
> L353:             capture_workflow_event(
> L354:                 event_type=EventType.TASK_COMPLETED if not final_state.get("error") else EventType.TASK_FAILED,
> L355:                 data={
> L356:                     'session_id': session_id,
> L357:                     'task_id': task.task_id,
> L358:                     'workflow_completed': True,
> L359:                     'has_error': bool(final_state.get("error"))
> L360:                 }
> L361:             )
> L362:             
> L363:             if final_state.get("error"):
> L364:                 session.status = SessionStatus.FAILED
> L365:                 session.errors.append(final_state["error"])
> L366:                 raise Exception(final_state["error"])
> L367:             
> L368:             session = final_state["session"]
> L369:             session.status = SessionStatus.COMPLETED
> L370:             
> L371:             # Update performance metrics
> L372:             self._update_performance_metrics(session)
> L373:             
> L374:             # Persist completed session
> L375:             self.session_manager._persist_session(session)
> L376:             
> L377:             self.console.print(Panel(
> L378:                 f"[green]✅ Orchestration completed successfully[/green]\n"
> L379:                 f"Session ID: {session_id}\n"
> L380:                 f"Quality Score: {session.overall_quality_score:.2f}\n"
> L381:                 f"Total Time: {session.total_execution_time:.2f}s",
> L382:                 title="Orchestration Complete",
> L383:                 style="green"
> L384:             ))
> L385:             
> L386:             # Log orchestration decision
> L387:             self._log_orchestration_decision(session)
> L388:             
> L389:             # PHASE 2: Session completion event hook (LINE 232 requirement)
> L390:             capture_task_complete(session)
> L391:             
> L392:             return session
> L393:             
> L394:         except Exception as e:
> L395:             self.logger.error(f"Orchestration failed for session {session_id}: {e}")
> L396:             session.status = SessionStatus.FAILED
> L397:             session.end_time = datetime.now()
> L398:             session.errors.append(str(e))
> L399:             
> L400:             # Record error for tracking
> L401:             self.error_tracker.record_error(
> L402:                 error_type="orchestration_error",
> L403:                 error_message=str(e),
> L404:                 context={"session_id": session_id, "method": "orchestrate_task"}
> L405:             )
> L406:             
> L407:             self.console.print(Panel(
> L408:                 f"[red]❌ Orchestration failed: {str(e)}[/red]",
> L409:                 title="Orchestration Error",
> L410:                 style="red"
> L411:             ))
> L412:             
> L413:             # PHASE 2: Error handling event hook (LINE 248 requirement)
> L414:             capture_error_event(session, str(e), "orchestration_error")
> L415:             
> L416:             # Persist failed session
> L417:             self.session_manager._persist_session(session)
> L418:             
> L419:             return session
> L420:         
> L421:         finally:
> L422:             # Clean up active session and persist if completed
> L423:             session = self.session_manager.get_session(session_id)
> L424:             if session:
> L425:                 if session.status in [SessionStatus.COMPLETED, SessionStatus.FAILED, SessionStatus.CANCELLED]:
> L426:                     self.session_manager._persist_session(session)
> L427:                 self.session_manager.move_to_completed(session_id)
> L428:     
> L429:     async def _initialize_session(self, state: CerebrumState) -> CerebrumState:
> L430:         """Initialize the orchestration session."""
> L431:         self.console.print("[yellow]🚀 Initializing orchestration session...[/yellow]")
> L432:         
> L433:         session = state["session"]
> L434:         
> L435:         # Validate prerequisites
> L436:         if not self.executor_agents:
> L437:             state["error"] = "No executor agents available"
> L438:             return state
> L439:         
> L440:         # Set up session metadata
> L441:         session.metadata.update({
> L442:             "orchestrator_version": "1.0.0",
> L443:             "available_executors": list(self.executor_agents.keys()),
> L444:             "planner_agent": self.planner_agent.__class__.__name__,
> L445:             "critic_agent": self.critic_agent.__class__.__name__,
> L446:             "initialization_time": datetime.now().isoformat()
> L447:         })
> L448:         
> L449:         session.current_phase = OrchestrationPhase.PLANNING
> L450:         state["current_phase"] = OrchestrationPhase.PLANNING
> L451:         state["messages"].append(AIMessage(content="Session initialized successfully"))
> L452:         
> L453:         return state
> L454:     
> L455:     async def _plan_task(self, state: CerebrumState) -> CerebrumState:
> L456:         """Plan the task using the PlannerAgent."""
> L457:         self.console.print("[yellow]📋 Planning task decomposition...[/yellow]")
> L458:         
> L459:         session = state["session"]
> L460:         task = session.task
> L461:         
> L462:         # Event hook: Planning started
> L463:         capture_planning_start(session)
> L464:         
> L465:         try:
> L466:             # Retrieve relevant memories for context
> L467:             relevant_memories = await self._retrieve_relevant_memories(task.description)
> L468: 
> L469:             # Create enhanced context with memory
> L470:             enhanced_context = task.context.copy() if task.context else {}
> L471:             if relevant_memories:
> L472:                 enhanced_context["historical_context"] = {
> L473:                     "similar_tasks": len(relevant_memories),
> L474:                     "past_strategies": [m.get("context", {}).get("execution_strategy") for m in relevant_memories],
> L475:                     "past_quality_scores": [m.get("context", {}).get("overall_quality_score") for m in relevant_memories],
> L476:                     "lessons_learned": [m.get("content") for m in relevant_memories[:2]]  # Top 2 most relevant
> L477:                 }
> L478: 
> L479:             # Create task context for planner
> L480:             task_context = TaskContext(
> L481:                 task_id=task.task_id,
> L482:                 description=task.description,
> L483:                 file_path=task.file_path,
> L484:                 priority=task.priority,
> L485:                 complexity=task.complexity,
> L486:                 constraints=task.constraints,
> L487:                 requirements=task.requirements,
> L488:                 existing_context=enhanced_context
> L489:             )
> L490:             
> L491:             # Get decomposition plan from planner
> L492:             decomposition_plan = await self.planner_agent.create_plan(task_context)
> L493:             session.decomposition_plan = decomposition_plan
> L494:             
> L495:             # Assess the plan quality
> L496:             plan_assessment = await self.critic_agent.assess_decomposition_plan(decomposition_plan)
> L497:             session.quality_assessments["plan"] = plan_assessment
> L498:             
> L499:             # Check if plan meets quality threshold
> L500:             if plan_assessment.overall_score < self.quality_threshold:
> L501:                 session.warnings.append(f"Plan quality score ({plan_assessment.overall_score:.2f}) below threshold")
> L502:             
> L503:             session.current_phase = OrchestrationPhase.EXECUTION
> L504:             state["current_phase"] = OrchestrationPhase.EXECUTION
> L505:             state["messages"].append(AIMessage(content=f"Task planned: {len(decomposition_plan.sub_tasks)} sub-tasks"))
> L506:             
> L507:             # Event hook: Planning completed
> L508:             capture_planning_complete(session, decomposition_plan)
> L509:             
> L510:         except Exception as e:
> L511:             state["error"] = f"Planning failed: {str(e)}"
> L512:             session.errors.append(str(e))
> L513:             
> L514:             # Record error for tracking
> L515:             self.error_tracker.record_error(
> L516:                 error_type="planning_error",
> L517:                 error_message=str(e),
> L518:                 context={"session_id": session.session_id, "method": "_plan_task"}
> L519:             )
> L520:         
> L521:         return state
> L522:     
> L523:     async def _execute_plan(self, state: CerebrumState) -> CerebrumState:
> L524:         """Execute the decomposition plan using ExecutorAgents."""
> L525:         self.console.print("[yellow]⚡ Executing decomposition plan...[/yellow]")
> L526:         
> L527:         session = state["session"]
> L528:         plan = session.decomposition_plan
> L529:         
> L530:         if not plan:
> L531:             state["error"] = "No decomposition plan available"
> L532:             return state
> L533:         
> L534:         # Event hook: Execution started
> L535:         capture_execution_start(session, "orchestrator")
> L536:         
> L537:         try:
> L538:             # Execute based on strategy
> L539:             if plan.strategy.value == "parallel" and self.enable_parallel_execution:
> L540:                 await self._execute_parallel(session, plan)
> L541:             else:
> L542:                 await self._execute_sequential(session, plan)
> L543:             
> L544:             session.current_phase = OrchestrationPhase.CRITICISM
> L545:             state["current_phase"] = OrchestrationPhase.CRITICISM
> L546:             state["messages"].append(AIMessage(content=f"Execution completed: {len(session.execution_results)} results"))
> L547:             
> L548:             # Event hook: Execution completed
> L549:             capture_execution_complete(session, "orchestrator")
> L550:             
> L551:         except Exception as e:
> L552:             state["error"] = f"Execution failed: {str(e)}"
> L553:             session.errors.append(str(e))
> L554:             
> L555:             # Record error for tracking
> L556:             self.error_tracker.record_error(
> L557:                 error_type="execution_error",
> L558:                 error_message=str(e),
> L559:                 context={"session_id": session.session_id, "method": "_execute_plan"}
> L560:             )
> L561:         
> L562:         return state
> L563:     
> L564:     async def _assess_quality(self, state: CerebrumState) -> CerebrumState:
> L565:         """Assess quality of execution results using CriticAgent."""
> L566:         self.console.print("[yellow]🔍 Assessing execution quality...[/yellow]")
> L567:         
> L568:         session = state["session"]
> L569:         
> L570:         # Event hook: Criticism started
> L571:         capture_criticism_start(session)
> L572:         
> L573:         try:
> L574:             # Assess each execution result
> L575:             total_quality_score = 0.0
> L576:             assessment_count = 0
> L577:             
> L578:             for result_id, result in session.execution_results.items():
> L579:                 assessment = await self.critic_agent.assess_execution_result(result)
> L580:                 session.quality_assessments[result_id] = assessment
> L581:                 total_quality_score += assessment.overall_score
> L582:                 assessment_count += 1
> L583:             
> L584:             # Calculate overall quality score
> L585:             if assessment_count > 0:
> L586:                 session.overall_quality_score = total_quality_score / assessment_count
> L587:             
> L588:             # Check if quality meets threshold
> L589:             quality_passed = session.overall_quality_score >= self.quality_threshold
> L590:             
> L591:             session.current_phase = OrchestrationPhase.INTEGRATION
> L592:             state["current_phase"] = OrchestrationPhase.INTEGRATION
> L593:             state["messages"].append(AIMessage(
> L594:                 content=f"Quality assessment completed: {session.overall_quality_score:.2f} "
> L595:                        f"({'PASS' if quality_passed else 'FAIL'})"
> L596:             ))
> L597:             
> L598:             # Event hook: Criticism completed
> L599:             capture_criticism_complete(session)
> L600:             
> L601:         except Exception as e:
> L602:             state["error"] = f"Quality assessment failed: {str(e)}"
> L603:             session.errors.append(str(e))
> L604:             
> L605:             # Record error for tracking
> L606:             self.error_tracker.record_error(
> L607:                 error_type="assessment_error",
> L608:                 error_message=str(e),
> L609:                 context={"session_id": session.session_id, "method": "_assess_quality"}
> L610:             )
> L611:         
> L612:         return state
> L613:     
> L614:     async def _integrate_results(self, state: CerebrumState) -> CerebrumState:
> L615:         """Integrate execution results into final output."""
> L616:         self.console.print("[yellow]🔗 Integrating execution results...[/yellow]")
> L617:         
> L618:         session = state["session"]
> L619:         
> L620:         try:
> L621:             # Collect all outputs and artifacts
> L622:             all_outputs = []
> L623:             all_artifacts = {}
> L624:             
> L625:             for result_id, result in session.execution_results.items():
> L626:                 if result.output:
> L627:                     all_outputs.append(result.output)
> L628:                 all_artifacts.update(result.artifacts)
> L629:             
> L630:             # Create integrated final output
> L631:             if len(all_outputs) == 1:
> L632:                 session.final_output = all_outputs[0]
> L633:             else:
> L634:                 session.final_output = {
> L635:                     "integrated_results": all_outputs,
> L636:                     "result_count": len(all_outputs)
> L637:                 }
> L638:             
> L639:             session.final_artifacts = all_artifacts
> L640:             
> L641:             # Calculate session metrics
> L642:             session.total_tokens_used = sum(r.tokens_used for r in session.execution_results.values())
> L643:             session.total_cost = sum(r.cost for r in session.execution_results.values())
> L644:             
> L645:             # Create session summary
> L646:             session.session_summary = {
> L647:                 "task_description": session.task.description,
> L648:                 "sub_tasks_executed": len(session.execution_results),
> L649:                 "overall_quality_score": session.overall_quality_score,
> L650:                 "total_execution_time": session.total_execution_time,
> L651:                 "total_tokens_used": session.total_tokens_used,
> L652:                 "total_cost": session.total_cost,
> L653:                 "quality_assessments_count": len(session.quality_assessments),
> L654:                 "errors_count": len(session.errors),
> L655:                 "warnings_count": len(session.warnings)
> L656:             }
> L657:             
> L658:             session.current_phase = OrchestrationPhase.COMPLETION
> L659:             state["current_phase"] = OrchestrationPhase.COMPLETION
> L660:             state["messages"].append(AIMessage(content="Results integrated successfully"))
> L661:             
> L662:         except Exception as e:
> L663:             state["error"] = f"Integration failed: {str(e)}"
> L664:             session.errors.append(str(e))
> L665:             
> L666:             # Record error for tracking
> L667:             self.error_tracker.record_error(
> L668:                 error_type="integration_error",
> L669:                 error_message=str(e),
> L670:                 context={"session_id": session.session_id, "method": "_integrate_results"}
> L671:             )
> L672:         
> L673:         return state
> L674:     
> L675:     async def _complete_session(self, state: CerebrumState) -> CerebrumState:
> L676:         """Complete the orchestration session."""
> L677:         self.console.print("[yellow]🎯 Completing orchestration session...[/yellow]")
> L678:         
> L679:         session = state["session"]
> L680:         
> L681:         # Set completion time
> L682:         session.end_time = datetime.now()
> L683:         session.total_execution_time = (session.end_time - session.start_time).total_seconds()
> L684:         
> L685:         # Add final metadata
> L686:         session.metadata.update({
> L687:             "completion_time": session.end_time.isoformat(),
> L688:             "total_workflow_messages": len(state["messages"]),
> L689:             "final_phase": session.current_phase.value,
> L700:             "orchestration_overhead": self._calculate_orchestration_overhead(session)
> L701:         })
> L702:         
> L703:         state["messages"].append(AIMessage(content="Orchestration session completed"))
> L704: 
> L705:         # Store session memory in GraphRAG
> L706:         await self._store_session_memory(session)
> L707: 
> L708:         return state
> L709:     
> L710:     def _should_retry_execution(self, state: CerebrumState) -> str:
> L711:         """Determine if execution should be retried with max retry limit and smart logic."""
> L712:         session = state["session"]
> L713:         retry_count = state.get("retry_count", 0)
> L714:         
> L715:         # Don't retry if max retries reached
> L716:         if retry_count >= self.max_retries:
> L717:             session.warnings.append(f"Maximum retries ({self.max_retries}) reached, proceeding to integration")
> L718:             return "integrate"
> L719:         
> L720:         # Don't retry if quality is acceptable
> L721:         if session.overall_quality_score >= self.quality_threshold:
> L722:             return "integrate"
> L723:         
> L724:         # Analyze failure types to determine if retry is worthwhile
> L725:         retryable_failures = 0
> L726:         permanent_failures = 0
> L727:         resource_conflicts = 0
> L728:         total_failures = 0
> L729:         
> L730:         for result in session.execution_results.values():
> L731:             if hasattr(result, 'status') and result.status == ExecutionStatus.FAILED:
> L732:                 total_failures += 1
> L733:                 error_type = getattr(result, 'error_type', 'unknown')
> L734:                 
> L735:                 if error_type == "transient" and getattr(result, 'should_retry', False):
> L736:                     retryable_failures += 1
> L737:                 elif error_type == "permanent":
> L738:                     permanent_failures += 1
> L739:                 elif error_type == "resource_conflict":
> L740:                     resource_conflicts += 1
> L741:         
> L742:         # Don't retry if there are permanent failures
> L743:         if permanent_failures > 0:
> L744:             session.warnings.append(f"Skipping retry due to {permanent_failures} permanent failures")
> L745:             return "integrate"
> L746:         
> L747:         # Don't retry if all failures are resource conflicts (need different strategy)
> L748:         if resource_conflicts > 0 and resource_conflicts == total_failures:
> L749:             session.warnings.append(f"Skipping retry due to {resource_conflicts} resource conflicts")
> L750:             return "integrate"
> L751:         
> L752:         # Retry if there are retryable failures
> L753:         if retryable_failures > 0:
> L754:             state["retry_count"] = retry_count + 1
> L755:             session.warnings.append(
> L756:                 f"Retrying execution (attempt {retry_count + 1}/{self.max_retries}) "
> L757:                 f"due to {retryable_failures} retryable failures"
> L758:             )
> L759:             
> L760:             # Add delay before retry to allow transient issues to resolve
> L761:             if self.retry_delay > 0:
> L762:                 import asyncio
> L763:                 asyncio.create_task(asyncio.sleep(self.retry_delay))
> L764:             
> L765:             return "retry"
> L766:         
> L767:         # Check if any critical issues that might be fixable with retry
> L768:         critical_issues = 0
> L769:         for assessment in session.quality_assessments.values():
> L770:             critical_issues += len([c for c in assessment.criticisms if c.level.value == "critical"])
> L771:         
> L772:         # Retry for critical quality issues if no permanent failures
> L773:         if critical_issues > 0 and permanent_failures == 0 and 0 < critical_issues <= 2:
> L774:             state["retry_count"] = retry_count + 1
> L775:             session.warnings.append(
> L776:                 f"Retrying execution (attempt {retry_count + 1}/{self.max_retries}) "
> L777:                 f"due to {critical_issues} critical quality issues"
> L778:             )
> L779:             return "retry"
> L780:         
> L781:         # No retryable failures, proceed to integration
> L782:         return "integrate"
> L783:     
> L784:     async def _execute_sequential(self, session: OrchestrationSession, plan: DecompositionPlan):
> L785:         """Execute sub-tasks sequentially."""
> L786:         self.console.print("[blue]📋 Executing tasks sequentially...[/blue]")
> L787:         
> L788:         for task_id in plan.execution_order:
> L789:             sub_task = next(task for task in plan.sub_tasks if task.id == task_id)
> L790:             
> L791:             # Select appropriate executor
> L792:             executor = await self._select_executor_for_task(sub_task)
> L793:             if not executor:
> L794:                 raise Exception(f"No suitable executor found for task: {sub_task.title}")
> L795:             
> L796:             self.console.print(f"[cyan]🔄 Executing: {sub_task.title} with {executor.agent_name}[/cyan]")
> L797:             
> L798:             # Execute sub-task
> L799:             result = await executor.execute_task(sub_task, session.session_id, session.task.task_id)
> L800:             session.execution_results[task_id] = result
> L801:             
> L802:             # Check if execution failed critically
> L803:             if result.status == ExecutionStatus.FAILED and result.quality_score < 0.3:
> L804:                 raise Exception(f"Critical failure in task {task_id}: {result.error_message}")
> L805:     
> L806:     async def _execute_parallel(self, session: OrchestrationSession, plan: DecompositionPlan):
> L807:         """Execute independent sub-tasks in parallel with resource conflict detection."""
> L808:         self.console.print("[blue]⚡ Executing tasks with resource conflict analysis...[/blue]")
> L809:         
> L810:         # Group tasks by dependency level
> L811:         dependency_levels = self._analyze_dependency_levels(plan)
> L812:         
> L813:         # Analyze resource conflicts across all tasks
> L814:         resource_conflicts = self._analyze_resource_conflicts(plan)
> L815:         
> L816:         for level, task_ids in dependency_levels.items():
> L817:             self.console.print(f"[cyan]🔄 Executing level {level}: {len(task_ids)} tasks[/cyan]")
> L818:             
> L819:             # Group tasks by resource conflicts within this level
> L820:             task_groups = self._group_by_resource_conflicts(task_ids, resource_conflicts)
> L821:             
> L822:             self.console.print(f"[yellow]📊 Resource analysis: {len(task_groups)} execution groups[/yellow]")
> L823:             
> L824:             # Execute each group appropriately
> L825:             for group_idx, group_task_ids in enumerate(task_groups):
> L826:                 if len(group_task_ids) == 1:
> L827:                     self.console.print(f"[green]🔒 Sequential group {group_idx + 1}: {group_task_ids[0]}[/green]")
> L828:                     await self._execute_task_group_sequential(session, group_task_ids)
> L829:                 else:
> L830:                     self.console.print(f"[blue]⚡ Parallel group {group_idx + 1}: {len(group_task_ids)} tasks[/blue]")
> L831:                     await self._execute_task_group_parallel(session, group_task_ids)
> L832: 
> L833:     async def _execute_single_task(self, session: OrchestrationSession, task) -> 'ExecutionResult':
> L834:         """Execute a single task with proper error handling and executor selection."""
> L835:         executor = await self._select_executor_for_task(task)
> L836:         
> L837:         if not executor:
> L838:             error = Exception(f"No suitable executor found for task: {task.title}")
> L839:             raise PermanentExecutionError(f"Executor selection failed: {error}")
> L840:         
> L841:         try:
> L842:             # Execute the task
> L843:             result = await executor.execute_task(task, session.session_id, session.task.task_id)
> L844:             return result
> L845:             
> L846:         except Exception as e:
> L847:             # Classify the error and re-raise with proper type
> L848:             error_info = self._classify_error(e)
> L849:             
> L850:             if error_info['category'] == 'transient':
> L851:                 raise TransientExecutionError(f"Transient failure in task {task.id}: {e}")
> L852:             elif error_info['category'] == 'resource':
> L853:                 raise ResourceConflictError(f"Resource conflict in task {task.id}: {e}")
> L854:             else:
> L855:                 raise PermanentExecutionError(f"Permanent failure in task {task.id}: {e}")
> L856:     
> L857:     async def _select_executor_for_task(self, sub_task) -> Optional[ExecutorAgent]:
> L858:         """Select the most appropriate executor for a sub-task using AI-powered decision making."""
> L859:         
> L860:         self.logger.info(f"Selecting executor for task: {sub_task.description}")
> L861:         self.logger.info(f"Backend available: {self.backend is not None}")
> L862:         
> L863:         # If no backend available, fall back to keyword matching
> L864:         if not self.backend:
> L865:             self.logger.info("No backend available, using fallback selection")
> L866:             return self._select_executor_fallback(sub_task)
> L867:         
> L868:         # Use AI backend for intelligent executor selection
> L869:         self.logger.info("Using AI backend for executor selection")
> L870:         try:
> L871:             return await self._ai_select_executor(sub_task)
> L872:         except Exception as e:
> L873:             self.logger.warning(f"AI executor selection failed: {e}, falling back to keyword matching")
> L874:             
> L875:             # Record error for tracking
> L876:             self.error_tracker.record_error(
> L877:                 error_type="ai_selection_error",
> L878:                 error_message=str(e),
> L879:                 context={"method": "_select_executor_for_task", "task_description": sub_task.description}
> L880:             )
> L881:             
> L882:             return self._select_executor_fallback(sub_task)
> L883:     
> L884:     async def _ai_select_executor(self, sub_task) -> Optional[ExecutorAgent]:
> L885:         """Use AI backend to select the most appropriate executor with structured JSON output."""
> L886:         
> L887:         if not self.backend:
> L888:             self.logger.warning("No backend available for AI executor selection, falling back")
> L889:             return self._select_executor_fallback(sub_task)
> L890:         
> L891:         # Get available executor names
> L892:         executor_names = list(self.executor_agents.keys())
> L893:         
> L894:         # Create structured prompt that forces JSON response
> L895:         prompt = f"""
> L896: Analyze the following task and determine the best executor to handle it.
> L897: 
> L898: Task: {sub_task.description}
> L899: 
> L900: Available Executors:
> L901: {json.dumps(executor_names, indent=2)}
> L902: 
> L903: You MUST respond with a JSON object containing the name of the chosen executor.
> L904: Choose EXACTLY one of these names: {', '.join(executor_names)}
> L905: 
> L906: Response format:
> L907: {{
> L908:   "executor_name": "exact_executor_name_from_list"
> L909: }}
> L910: 
> L911: Example response:
> L912: {{
> L913:   "executor_name": "code_executor"
> L914: }}
> L915: """
> L916: 
> L917:         try:
> L918:             self.logger.info(f"🤖 AI selecting executor for: {sub_task.description}")
> L919:             
> L920:             # Call AI backend with structured prompt
> L921:             response_text = await self.backend.generate_text(
> L922:                 prompt=prompt,
> L923:                 max_tokens=100,
> L924:                 temperature=0.0  # Deterministic output
> L925:             )
> L926:             
> L927:             self.logger.debug(f"🤖 Raw AI response: {response_text}")
> L928: 
> L929:             # Extract JSON from response using regex
> L930:             json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
> L931:             if not json_match:
> L932:                 self.logger.error(f"❌ AI response contains no JSON object. Response: {response_text}")
> L933:                 return self._select_executor_fallback(sub_task)
> L934: 
> L935:             # Parse JSON response
> L936:             try:
> L937:                 response_json = json.loads(json_match.group(0))
> L938:                 selected_name = response_json.get("executor_name")
> L939:                 
> L940:                 if not selected_name:
> L941:                     self.logger.error(f"❌ AI response missing 'executor_name' field: {response_json}")
> L942:                     return self._select_executor_fallback(sub_task)
> L943:                 
> L944:                 # Validate executor exists
> L945:                 if selected_name in self.executor_agents:
> L946:                     self.logger.info(f"✅ AI selected executor: {selected_name}")
> L947:                     return self.executor_agents[selected_name]
> L948:                 else:
> L949:                     self.logger.warning(f"❌ AI selected unknown executor '{selected_name}'. Available: {executor_names}")
> L950:                     return self._select_executor_fallback(sub_task)
> L951:                     
> L952:             except json.JSONDecodeError as e:
> L953:                 self.logger.error(f"❌ Failed to parse AI JSON response: {e}. Raw: {response_text}")
> L954:                 return self._select_executor_fallback(sub_task)
> L955: 
> L956:         except Exception as e:
> L957:             self.logger.error(f"❌ AI executor selection failed: {e}")
> L958:             return self._select_executor_fallback(sub_task)
> L959:     
> L960:     def _format_executors_for_ai(self, executors: List[Dict]) -> str:
> L961:         """Format executor information for AI prompt."""
> L962:         formatted = []
> L963:         for executor in executors:
> L964:             tools_str = ", ".join(executor["supported_tools"][:5])  # Limit to first 5 tools
> L965:             if len(executor["supported_tools"]) > 5:
> L966:                 tools_str += "..."
> L967:             
> L968:             formatted.append(
> L969:                 f"- {executor['name']}: {executor['specialization']}\n"
> L970:                 f"  Tools: {tools_str}"
> L971:             )
> L972:         return "\n".join(formatted)
> L973:     
> L974:     def _select_executor_fallback(self, sub_task) -> Optional[ExecutorAgent]:
> L975:         """Fallback keyword-based executor selection."""
> L976:         
> L977:         # Get task description and title for analysis
> L978:         task_desc_lower = sub_task.description.lower()
> L979:         task_title_lower = getattr(sub_task, 'title', '').lower()
> L980:         combined_text = f"{task_desc_lower} {task_title_lower}"
> L981:         
> L982:         # Get required tools from sub_task if available
> L983:         required_tools = getattr(sub_task, 'required_tools', [])
> L984:         
> L985:         # Documentation tasks (check first as they're specific)
> L986:         doc_keywords = ["document", "write", "explain", "documentation", "docstring", "api doc", "comment"]
> L987:         if any(keyword in combined_text for keyword in doc_keywords) or "documentation" in required_tools:
> L988:             if "doc_writer" in self.executor_agents:
> L989:                 return self.executor_agents["doc_writer"]
> L990:             for name, executor in self.executor_agents.items():
> L991:                 if "doc" in executor.specialization.lower() or "documentation" in executor.specialization.lower():
> L992:                     return executor
> L993:         
> L994:         # Refactoring tasks (check before general code tasks)
> L995:         refactor_keywords = ["refactor", "improve", "optimize", "clean", "technical debt", "code smell", "quality"]
> L996:         if any(keyword in combined_text for keyword in refactor_keywords) or "refactoring" in required_tools:
> L997:             if "refactor_agent" in self.executor_agents:
> L998:                 return self.executor_agents["refactor_agent"]
> L999:             for name, executor in self.executor_agents.items():
> L1000:                 if "refactor" in executor.specialization.lower() or "quality" in executor.specialization.lower():
> L1001:                     return executor
> L1002:         
> L1003:         # Test-related tasks
> L1004:         test_keywords = ["test", "verify", "validate", "check", "unit test", "testing"]
> L1005:         if any(keyword in combined_text for keyword in test_keywords) or "testing" in required_tools:
> L1006:             if "test_executor" in self.executor_agents:
> L1007:                 return self.executor_agents["test_executor"]
> L1008:             for name, executor in self.executor_agents.items():
> L1009:                 if "test" in executor.specialization.lower() or "validation" in executor.specialization.lower():
> L1010:                     return executor
> L1011:         
> L1012:         # Code-related tasks (general implementation)
> L1013:         code_keywords = ["code", "implement", "develop", "create", "build", "write", "function", "class", "program", "python", "javascript"]
> L1014:         if any(keyword in combined_text for keyword in code_keywords) or "coding" in required_tools:
> L1015:             # Look for code executor first
> L1016:             if "code_executor" in self.executor_agents:
> L1017:                 return self.executor_agents["code_executor"]
> L1018:             # Fallback to any coding-specialized executor
> L1019:             for name, executor in self.executor_agents.items():
> L1020:                 if "code" in executor.specialization.lower() or "generation" in executor.specialization.lower():
> L1021:                     return executor
> L1022:         
> L1023:         # Analysis-related tasks
> L1024:         analysis_keywords = ["analyze", "review", "research", "investigate", "study", "examine"]
> L1025:         if any(keyword in combined_text for keyword in analysis_keywords) or "analysis" in required_tools:
> L1026:             if "analysis_executor" in self.executor_agents:
> L1027:                 return self.executor_agents["analysis_executor"]
> L1028:             for name, executor in self.executor_agents.items():
> L1029:                 if "analysis" in executor.specialization.lower() or "research" in executor.specialization.lower():
> L1030:                     return executor
> L1031:         
> L1032:         # FALLBACK: For generic tasks like "hello world", default to code_executor
> L1033:         # This handles simple programming tasks that don't match specific keywords
> L1034:         if "code_executor" in self.executor_agents:
> L1035:             return self.executor_agents["code_executor"]
> L1036:         
> L1037:         # If still no match, try any available executor as last resort
> L1038:         if self.executor_agents:
> L1039:             # Prefer executors with "code" or "generation" in their specialization
> L1040:             for name, executor in self.executor_agents.items():
> L1041:                 if "code" in executor.specialization.lower() or "generation" in executor.specialization.lower():
> L1042:                     return executor
> L1043:             # If no code-related executor, return the first available
> L1044:             return next(iter(self.executor_agents.values()))
> L1045:         
> L1046:         # Only raise error if no executors are available at all
> L1047:         available_executors = list(self.executor_agents.keys())
> L1048:         available_specializations = [f"{name}: {executor.specialization}" for name, executor in self.executor_agents.items()]
> L1049:         
> L1050:         raise Exception(
> L1051:             f"No suitable executor found for task: '{sub_task.title}' "
> L1052:             f"(description: '{sub_task.description}'). "
> L1053:             f"Available executors: {available_specializations}. "
> L1054:             f"Required tools: {required_tools}"
> L1055:         )
> L1056:     
> L1057:     def _analyze_dependency_levels(self, plan: DecompositionPlan) -> Dict[int, List[str]]:
> L1058:         """Analyze dependency levels for parallel execution."""
> L1059:         levels = {}
> L1060:         task_levels = {}
> L1061:         
> L1062:         # Calculate level for each task
> L1063:         def calculate_level(task_id: str) -> int:
> L1064:             if task_id in task_levels:
> L1065:                 return task_levels[task_id]
> L1066:             
> L1067:             dependencies = plan.dependencies.get(task_id, [])
> L1068:             if not dependencies:
> L1069:                 level = 0
> L1070:             else:
> L1071:                 level = max(calculate_level(dep) for dep in dependencies) + 1
> L1072:             
> L1073:             task_levels[task_id] = level
> L1074:             return level
> L1075:         
> L1076:         # Group tasks by level
> L1077:         for task in plan.sub_tasks:
> L1078:             level = calculate_level(task.id)
> L1079:             if level not in levels:
> L1080:                 levels[level] = []
> L1081:             levels[level].append(task.id)
> L1082:         
> L1083:         return levels
> L1084: 
> L1085:     def _analyze_resource_conflicts(self, plan: DecompositionPlan) -> Dict[str, Set[str]]:
> L1086:         """Analyze which tasks conflict on shared resources.
> L1087:         
> L1088:         Returns:
> L1089:             Dict mapping resource types to sets of conflicting task IDs
> L1090:         """
> L1091:         conflicts = {
> L1092:             'files': set(),
> L1093:             'tools': set(), 
> L1094:             'outputs': set()
> L1095:         }
> L1096:         
> L1097:         # Track which tasks use which resources
> L1098:         file_users = {}
> L1099:         tool_users = {}
> L1100:         output_users = {}
> L1101:         
> L1102:         for task in plan.sub_tasks:
> L1103:             task_id = task.id
> L1104:             
> L1105:             # Analyze file access patterns from task description
> L1106:             task_text = task.description.lower()
> L1107:             if any(keyword in task_text for keyword in ['file', 'write', 'edit', 'create', 'modify']):
> L1108:                 # Extract potential file references
> L1109:                 for word in task_text.split():
> L1110:                     if '.' in word and any(ext in word for ext in ['.py', 'js', '.ts', '.md', '.json']):
> L1111:                         if word not in file_users:
> L1112:                             file_users[word] = []
> L1113:                         file_users[word].append(task_id)
> L1114:             
> L1115:             # Analyze tool usage
> L1116:             if any(keyword in task_text for keyword in ['run', 'execute', 'terminal', 'command']):
> L1117:                 tool_key = 'terminal'
> L1118:                 if tool_key not in tool_users:
> L1119:                     tool_users[tool_key] = []
> L1120:                 tool_users[tool_key].append(task_id)
> L1121:             
> L1122:             # Analyze output dependencies
> L1123:             if any(keyword in task_text for keyword in ['result', 'output', 'return']):
> L1124:                 output_key = f"output_{task_id}"
> L1125:                 if output_key not in output_users:
> L1126:                     output_users[output_key] = []
> L1127:                 output_users[output_key].append(task_id)
> L1128:         
> L1129:         # Identify conflicts (multiple tasks using same resource)
> L1130:         for resource, users in file_users.items():
> L1131:             if len(users) > 1:
> L1132:                 conflicts['files'].update(users)
> L1133:         
> L1134:         for resource, users in tool_users.items():
> L1135:             if len(users) > 1:
> L1136:                 conflicts['tools'].update(users)
> L1137:                 
> L1138:         for resource, users in output_users.items():
> L1139:             if len(users) > 1:
> L1140:                 conflicts['outputs'].update(users)
> L1141:         
> L1142:         return conflicts
> L1143: 
> L1144:     def _group_by_resource_conflicts(self, task_ids: List[str], resource_conflicts: Dict[str, Set[str]]) -> List[List[str]]:
> L1145:         """Group tasks by resource conflicts - conflicting tasks in same group.
> L1146:         
> L1147:         Args:
> L1148:             task_ids: List of task IDs to group
> L1149:             resource_conflicts: Dict of resource conflicts from _analyze_resource_conflicts
> L1150:             
> L1151:         Returns:
> L1152:             List of groups, where each group contains task IDs that should run sequentially
> L1153:         """
> L1154:         # Find all conflicting task IDs
> L1155:         all_conflicting_tasks = set()
> L1156:         for conflict_set in resource_conflicts.values():
> L1157:             all_conflicting_tasks.update(conflict_set)
> L1158:         
> L1159:         # Separate non-conflicting and conflicting tasks
> L1160:         non_conflicting = [tid for tid in task_ids if tid not in all_conflicting_tasks]
> L1161:         conflicting = [tid for tid in task_ids if tid in all_conflicting_tasks]
> L1162:         
> L1163:         groups = []
> L1164:         
> L1165:         # Non-conflicting tasks can all run in parallel (one group)
> L1166:         if non_conflicting:
> L1167:             groups.append(non_conflicting)
> L1168:         
> L1169:         # Conflicting tasks must be grouped to avoid resource conflicts
> L1170:         if conflicting:
> L1171:             # For now, put all conflicting tasks in sequential groups of 1
> L1172:             # More sophisticated grouping could be implemented later
> L1173:             for task_id in conflicting:
> L1174:                 groups.append([task_id])
> L1175:         
> L1176:         return groups
> L1177: 
> L1178:     async def _execute_task_group_parallel(self, session: OrchestrationSession, task_ids: List[str]):
> L1179:         """Execute non-conflicting tasks in parallel."""
> L1180:         execution_tasks = []
> L1181:         
> L1182:         for task_id in task_ids:
> L1183:             task = next(t for t in session.decomposition_plan.sub_tasks if t.id == task_id)
> L1184:             task_coro = self._execute_single_task(session, task)
> L1185:             execution_tasks.append((task_id, task_coro))
> L1186:         
> L1187:         # Execute all tasks in parallel
> L1188:         results = await asyncio.gather(
> L1189:             *[task_coro for _, task_coro in execution_tasks],
> L1200:             return_exceptions=True
> L1201:         )
> L1202:         
> L1203:         # Process results
> L1204:         for (task_id, _), result in zip(execution_tasks, results):
> L1205:             if isinstance(result, Exception):
> L1206:                 error_info = self._classify_error(result)
> L1207:                 session.execution_results[task_id] = self._create_failure_result(task_id, result)
> L1208:                 await self._log_execution_failure(session, task_id, result, error_info)
> L1209:             else:
> L1210:                 session.execution_results[task_id] = result
> L1211: 
> L1212:     async def _execute_task_group_sequential(self, session: OrchestrationSession, task_ids: List[str]):
> L1213:         """Execute conflicting tasks sequentially to avoid resource conflicts."""
> L1214:         for task_id in task_ids:
> L1215:             task = next(t for t in session.decomposition_plan.sub_tasks if t.id == task_id)
> L1216:             
> L1217:             try:
> L1218:                 result = await self._execute_single_task(session, task)
> L1219:                 session.execution_results[task_id] = result
> L1220:             except Exception as e:
> L1221:                 error_info = self._classify_error(e)
> L1222:                 session.execution_results[task_id] = self._create_failure_result(task_id, e)
> L1223:                 await self._log_execution_failure(session, task_id, e, error_info)
> L1224: 
> L1225:     def _classify_error(self, error: Exception) -> Dict[str, Any]:
> L1226:         """Classify error type and determine retry strategy."""
> L1227:         error_str = str(error).lower()
> L1228:         
> L1229:         # Transient errors (should retry)
> L1230:         if isinstance(error, (ConnectionError, TimeoutError, asyncio.TimeoutError)):
> L1231:             return {
> L1232:                 "type": "transient",
> L1233:                 "should_retry": True,
> L1234:                 "category": "network",
> L1235:                 "description": "Network or connection issue"
> L1236:             }
> L1237:         
> L1238:         if any(keyword in error_str for keyword in ["timeout", "connection", "network", "unavailable", "503", "502", "504"]):
> L1239:             return {
> L1240:                 "type": "transient", 
> L1241:                 "should_retry": True,
> L1242:                 "category": "service",
> L1243:                 "description": "Service temporarily unavailable"
> L1244:             }
> L1245:         
> L1246:         # Permanent errors (don't retry)
> L1247:         if isinstance(error, (ValueError, TypeError, ImportError, AttributeError)):
> L1248:             return {
> L1249:                 "type": "permanent",
> L1250:                 "should_retry": False,
> L1251:                 "category": "code",
> L1252:                 "description": "Code or configuration error"
> L1253:             }
> L1254:         
> L1255:         if any(keyword in error_str for keyword in ["not found", "invalid", "forbidden", "unauthorized", "400", "401", "403", "404"]):
> L1256:             return {
> L1257:                 "type": "permanent",
> L1258:                 "should_retry": False,
> L1259:                 "category": "client",
> L1260:                 "description": "Client error or invalid request"
> L1261:             }
> L1262:         
> L1263:         # Resource conflicts (don't retry, need different approach)
> L1264:         if any(keyword in error_str for keyword in ["resource", "conflict", "lock", "busy", "in use"]):
> L1265:             return {
> L1266:                 "type": "resource_conflict",
> L1267:                 "should_retry": False,
> L1268:                 "category": "resource",
> L1269:                 "description": "Resource conflict or lock contention"
> L1270:             }
> L1271:         
> L1272:         # Check custom error types
> L1273:         if isinstance(error, TransientExecutionError):
> L1274:             return {
> L1275:                 "type": "transient",
> L1276:                 "should_retry": True,
> L1277:                 "category": "service",
> L1278:                 "description": "Transient execution error"
> L1279:             }
> L1280:         elif isinstance(error, PermanentExecutionError):
> L1281:             return {
> L1282:                 "type": "permanent",
> L1283:                 "should_retry": False,
> L1284:                 "category": "code",
> L1285:                 "description": "Permanent execution error"
> L1286:             }
> L1287:         elif isinstance(error, ResourceConflictError):
> L1288:             return {
> L1289:                 "type": "resource_conflict",
> L1290:                 "should_retry": False,
> L1291:                 "category": "resource",
> L1292:                 "description": "Resource conflict error"
> L1293:             }
> L1294:         
> L1295:         # Unknown errors (conservative - don't retry)
> L1296:         return {
> L1297:             "type": "unknown",
> L1298:             "should_retry": False,
> L1299:             "category": "unknown",
> L1300:             "description": "Unknown error type"
> L1301:         }
> L1302: 
> L1303:     def _create_failure_result(self, task_id: str, error: Exception) -> 'ExecutionResult':
> L1304:         """Create a detailed failure result with error classification."""
> L1305:         error_info = self._classify_error(error)
> L1306:         
> L1307:         from ..core.models import ExecutionResult, ExecutionStatus
> L1308:         
> L1309:         return ExecutionResult(
> L1310:             execution_id=f"failed_{task_id}",
> L1311:             task_id=task_id,
> L1312:             status=ExecutionStatus.FAILED,
> L1313:             output=None,
> L1314:             executor_name="orchestrator",
> L1315:             error_message=str(error),
> L1316:             error_type=error_info["type"],
> L1317:             error_category=error_info["category"],
> L1318:             should_retry=error_info["should_retry"],
> L1319:             error_description=error_info["description"],
> L1320:             execution_time=0.0,
> L1321:             quality_score=0.0,
> L1322:             artifacts={}
> L1323:         )
> L1324: 
> L1325:     async def _log_execution_failure(self, session: 'OrchestrationSession', task_id: str, error: Exception, error_info: Dict[str, any]):
> L1326:         """Log execution failure with detailed error information."""
> L1327:         logger.error(f"Task {task_id} failed in session {session.session_id}")
> L1328:         logger.error(f"Error type: {error_info['type']}, Category: {error_info['category']}")
> L1329:         logger.error(f"Is transient: {error_info['is_transient']}, Should retry: {error_info['should_retry']}")
> L1330:         logger.error(f"Error: {error}")
> L1331:     
> L1332:     def _calculate_orchestration_overhead(self, session: OrchestrationSession) -> float:
> L1333:         """Calculate orchestration overhead as percentage of total time."""
> L1334:         if session.total_execution_time == 0:
> L1335:             return 0.0
> L1336:         
> L1337:         # Sum up actual execution times
> L1338:         actual_execution_time = sum(
> L1339:             result.execution_time for result in session.execution_results.values()
> L1340:         )
> L1341:         
> L1342:         # Add assessment times
> L1343:         actual_execution_time += sum(
> L1344:             assessment.assessment_time for assessment in session.quality_assessments.values()
> L1345:         )
> L1346:         
> L1347:         # Calculate overhead
> L1348:         overhead_time = session.total_execution_time - actual_execution_time
> L1349:         return (overhead_time / session.total_execution_time) * 100
> L1350:     
> L1351:     def _update_performance_metrics(self, session: OrchestrationSession):
> L1352:         """Update performance metrics based on session results."""
> L1353:         self.total_sessions += 1
> L1354:         self.total_orchestration_time += session.total_execution_time
> L1355:         
> L1356:         # Update success rate
> L1357:         if session.status == SessionStatus.COMPLETED:
> L1358:             self.successful_sessions += 1
> L1359:         
> L1360:         # Update average quality score
> L1361:         total_quality = self.total_sessions * self.average_quality_score
> L1362:         self.average_quality_score = (total_quality + session.overall_quality_score) / self.total_sessions
> L1363:         
> L1364:         # Record detailed metrics for analysis
> L1365:         self.performance_collector.record_session_metrics(session)
> L1366:     
> L1367:     def _log_orchestration_decision(self, session: OrchestrationSession):
> L1368:         """Log orchestration decision with rationale for audit trail."""
> L1369:         log_entry = {
> L1370:             "timestamp": datetime.now().isoformat(),
> L1371:             "session_id": session.session_id,
> L1372:             "task_description": session.task.description,
> L1373:             "task_complexity": session.task.complexity.value,
> L1374:             "orchestration_strategy": session.decomposition_plan.strategy.value if session.decomposition_plan else "unknown",
> L1375:             "sub_tasks_count": len(session.execution_results),
> L1376:             "overall_quality_score": session.overall_quality_score,
> L1377:             "total_execution_time": session.total_execution_time,
> L1378:             "orchestration_overhead_percent": session.metadata.get("orchestration_overhead", 0),
> L1379:             "session_status": session.status.value,
> L1380:             "errors_count": len(session.errors),
> L1381:             "warnings_count": len(session.warnings),
> L1382:             "total_tokens_used": session.total_tokens_used,
> L1383:             "total_cost": session.total_cost,
> L1384:             "rationale": f"Orchestrated {len(session.execution_results)} sub-tasks with {session.decomposition_plan.strategy.value if session.decomposition_plan else 'unknown'} strategy, achieving {session.overall_quality_score:.2f} quality score"
> L1385:         }
> L1386:         
> L1387:         self.logger.info(f"Orchestration completed: {json.dumps(log_entry, indent=2)}")
> L1388:     
> L1389:     def get_performance_metrics(self) -> Dict[str, Any]:
> L1390:         """Get performance metrics for the orchestrator."""
> L1391:         success_rate = self.successful_sessions / self.total_sessions if self.total_sessions > 0 else 0
> L1392:         avg_orchestration_time = self.total_orchestration_time / self.total_sessions if self.total_sessions > 0 else 0
> L1393:         
> L1394:         return {
> L1395:             "total_sessions": self.total_sessions,
> L1396:             "successful_sessions": self.successful_sessions,
> L1397:             "success_rate": success_rate,
> L1398:             "total_orchestration_time": self.total_orchestration_time,
> L1399:             "average_orchestration_time": avg_orchestration_time,
> L1400:             "average_quality_score": self.average_quality_score,
> L1401:             "active_sessions": len(self.session_manager.get_active_sessions()),
> L1402:             "registered_executors": len(self.executor_agents),
> L1403:             "quality_threshold": self.quality_threshold,
> L1404:             "parallel_execution_enabled": self.enable_parallel_execution
> L1405:         }
> L1406:     
> L1407:     def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
> L1408:         """Get status of a specific session."""
> L1409:         session = self.session_manager.get_session(session_id)
> L1410:         if session:
> L1411:             return {
> L1412:                 "session_id": session_id,
> L1413:                 "status": session.status.value,
> L1414:                 "current_phase": session.current_phase.value,
> L1415:                 "progress": self._calculate_session_progress(session),
> L1416:                 "execution_results_count": len(session.execution_results),
> L1417:                 "quality_score": session.overall_quality_score,
> L1418:                 "errors": session.errors,
> L1419:                 "warnings": session.warnings
> L1420:             }
> L1421:         return None
> L1422:     
> L1423:     def _calculate_session_progress(self, session: OrchestrationSession) -> float:
> L1424:         """Calculate session progress as percentage."""
> L1425:         phase_weights = {
> L1426:             OrchestrationPhase.INITIALIZATION: 0.1,
> L1427:             OrchestrationPhase.PLANNING: 0.2,
> L1428:             OrchestrationPhase.EXECUTION: 0.5,
> L1429:             OrchestrationPhase.CRITICISM: 0.15,
> L1430:             OrchestrationPhase.INTEGRATION: 0.04,
> L1431:             OrchestrationPhase.COMPLETION: 0.01
> L1432:         }
> L1433:         
> L1434:         completed_weight = 0.0
> L1435:         for phase, weight in phase_weights.items():
> L1436:             if phase.value <= session.current_phase.value:
> L1437:                 completed_weight += weight
> L1438:             else:
> L1439:                 break
> L1440:         
> L1441:         return min(completed_weight * 100, 100.0)
> L1442: 
> L1443:     # ================================
> L1444:     # MONITORING API METHODS
> L1445:     # ================================
> L1446:     
> L1447:     async def get_unified_monitoring_data(self) -> Dict[str, Any]:
> L1448:         """Get unified monitoring data for dashboards and alerting."""
> L1449:         try:
> L1450:             if MONITORING_AVAILABLE:
> L1451:                 return await self.monitoring_system.get_unified_monitoring_data()
> L1452:             else:
> L1453:                 # Fallback basic monitoring data
> L1454:                 return {
> L1455:                     "timestamp": time.time(),
> L1456:                     "health": await self._get_basic_health_status(),
> L1457:                     "performance": self._get_basic_performance_metrics(),
> L1458:                     "errors": {"total_errors": 0, "message": "Error tracking not available"},
> L1459:                     "system_info": {
> L1460:                         "orchestrator_version": "2.0.0",
> L1461:                         "uptime_seconds": time.time() - self._start_time,
> L1462:                         "total_sessions_processed": self.total_sessions,
> L1463:                         "active_sessions": len(self.session_manager.get_active_sessions())
> L1464:                     }
> L1465:                 }
> L1466:         except Exception as e:
> L1467:             self.logger.error(f"Failed to get unified monitoring data: {e}")
> L1468:             self.error_tracker.record_error(
> L1469:                 error_type="monitoring_error",
> L1470:                 error_message=str(e),
> L1471:                 context={"method": "get_unified_monitoring_data"}
> L1472:             )
> L1473:             return {
> L1474:                 "timestamp": time.time(),
> L1475:                 "error": str(e),
> L1476:                 "health": {"error": "Failed to collect health data"},
> L1477:                 "performance": {"error": "Failed to collect performance data"},
> L1478:                 "errors": {"error": "Failed to collect error data"}
> L1479:             }
> L1480: 
> L1481:     async def get_monitoring_summary(self) -> Dict[str, Any]:
> L1482:         """Get a quick monitoring summary for health checks."""
> L1483:         try:
> L1484:             if MONITORING_AVAILABLE:
> L1485:                 return await self.monitoring_system.get_monitoring_summary()
> L1486:             else:
> L1487:                 # Fallback basic monitoring summary
> L1488:                 active_sessions = len(self.session_manager.get_active_sessions())
> L1489:                 performance_metrics = self.get_performance_metrics()
> L1490:                 
> L1491:                 # Determine overall status
> L1492:                 if performance_metrics.get("success_rate", 1.0) < 0.5:
> L1493:                     overall_status = "critical"
> L1494:                 elif performance_metrics.get("success_rate", 1.0) < 0.8:
> L1495:                     overall_status = "degraded"
> L1496:                 elif active_sessions > 50:
> L1497:                     overall_status = "busy"
> L1498:                 else:
> L1499:                     overall_status = "healthy"
> L1500:                 
> L1501:                 return {
> L1502:                     "status": overall_status,
> L1503:                     "active_sessions": active_sessions,
> L1504:                     "success_rate": performance_metrics.get("success_rate", 0),
> L1505:                     "uptime_seconds": time.time() - self._start_time,
> L1506:                     "last_check": time.time()
> L1507:                 }
> L1508:         except Exception as e:
> L1509:             self.logger.error(f"Failed to get monitoring summary: {e}")
> L1510:             self.error_tracker.record_error(
> L1511:                 error_type="monitoring_error",
> L1512:                 error_message=str(e),
> L1513:                 context={"method": "get_monitoring_summary"}
> L1514:             )
> L1515:             return {
> L1516:                 "status": "error",
> L1517:                 "error": str(e),
> L1518:                 "last_check": time.time()
> L1519:             }
> L1520: 
> L1521:     async def _get_basic_health_status(self) -> Dict[str, Any]:
> L1522:         """Get basic health status when full monitoring is not available."""
> L1523:         try:
> L1524:             active_sessions = len(self.session_manager.get_active_sessions())
> L1525:             graphrag_health = await self._check_graphrag_health()
> L1526:             
> L1527:             return {
> L1528:                 "overall_status": "healthy",
> L1529:                 "services": {
> L1530:                     "orchestrator": {
> L1531:                         "status": "healthy",
> L1532:                         "active_sessions": active_sessions
> L1533:                     },
> L1534:                     "graphrag": {
> L1535:                         "status": graphrag_health.get("status", "unknown"),
> L1536:                         "available": graphrag_health.get("available", False)
> L1537:                     },
> L1538:                     "executors": {
> L1539:                         "status": "healthy",
> L1540:                         "count": len(self.executor_agents)
> L1541:                     }
> L1542:                 },
> L1543:                 "timestamp": time.time()
> L1544:             }
> L1545:         except Exception as e:
> L1546:             return {
> L1547:                 "overall_status": "error",
> L1548:                 "error": str(e),
> L1549:                 "timestamp": time.time()
> L1550:             }
> L1551: 
> L1552:     def _get_basic_performance_metrics(self) -> Dict[str, Any]:
> L1553:         """Get basic performance metrics when full monitoring is not available."""
> L1554:         try:
> L1555:             return {
> L1556:                 "total_sessions": self.total_sessions,
> L1557:                 "successful_sessions": self.successful_sessions,
> L1558:                 "success_rate": self.successful_sessions / self.total_sessions if self.total_sessions > 0 else 0,
> L1559:                 "average_execution_time": self.total_orchestration_time / self.total_sessions if self.total_sessions > 0 else 0,
> L1560:                 "average_quality_score": self.average_quality_score,
> L1561:                 "timestamp": time.time()
> L1562:             }
> L1563:         except Exception as e:
> L1564:             return {
> L1565:                 "error": str(e),
> L1566:                 "timestamp": time.time()
> L1567:             }
> L1568: 
> L1569:     async def _check_graphrag_health(self) -> Dict[str, Any]:
> L1570:         """Check GraphRAG service health with detailed diagnostics."""
> L1571:         if not self.graphrag_enabled:
> L1572:             return {
> L1573:                 "status": "disabled",
> L1574:                 "available": False,
> L1575:                 "message": "GraphRAG integration disabled"
> L1576:             }
> L1577:         
> L1578:         health_status = {
> L1579:             "status": "unknown",
> L1580:             "available": False,
> L1581:             "response_time": None,
> L1582:             "circuit_breaker": self.graphrag_circuit_breaker.get_status(),
> L1583:             "endpoints": {},
> L1584:             "last_check": time.time()
> L1585:         }
> L1586:         
> L1587:         try:
> L1588:             start_time = time.time()
> L1589:             
> L1590:             async with httpx.AsyncClient(timeout=5.0) as client:
> L1591:                 # Check main health endpoint
> L1592:                 try:
> L1593:                     health_response = await client.get(f"{self.graphrag_url}/health")
> L1594:                     health_status["endpoints"]["health"] = {
> L1595:                         "status_code": health_response.status_code,
> L1596:                         "available": health_response.status_code == 200
> L1597:                     }
> L1598:                 except Exception as e:
> L1599:                     health_status["endpoints"]["health"] = {
> L1600:                         "status_code": None,
> L1601:                         "available": False,
> L1602:                         "error": str(e)
> L1603:                     }
> L1604:                 
> L1605:                 # Check memory endpoint
> L1606:                 try:
> L1607:                     memory_response = await client.get(f"{self.graphrag_url}/memory/health")
> L1608:                     health_status["endpoints"]["memory"] = {
> L1609:                         "status_code": memory_response.status_code,
> L1610:                         "available": memory_response.status_code == 200
> L1611:                     }
> L1612:                 except Exception as e:
> L1613:                     health_status["endpoints"]["memory"] = {
> L1614:                         "status_code": None,
> L1615:                         "available": False,
> L1616:                         "error": str(e)
> L1617:                     }
> L1618:                 
> L1619:                 # Check temporal analysis endpoint
> L1620:                 try:
> L1621:                     temporal_response = await client.get(f"{self.graphrag_url}/temporal/health")
> L1622:                     health_status["endpoints"]["temporal"] = {
> L1623:                         "status_code": temporal_response.status_code,
> L1624:                         "available": temporal_response.status_code == 200
> L1625:                     }
> L1626:                 except Exception as e:
> L1627:                     health_status["endpoints"]["temporal"] = {
> L1628:                         "status_code": None,
> L1629:                         "available": False,
> L1630:                         "error": str(e)
> L1631:                     }
> L1632:             
> L1633:             health_status["response_time"] = time.time() - start_time
> L1634:             
> L1635:             # Determine overall availability
> L1636:             available_endpoints = sum(1 for ep in health_status["endpoints"].values() if ep["available"])
> L1637:             total_endpoints = len(health_status["endpoints"])
> L1638:             
> L1639:             if available_endpoints == total_endpoints:
> L1640:                 health_status["status"] = "healthy"
> L1641:                 health_status["available"] = True
> L1642:             elif available_endpoints > 0:
> L1643:                 health_status["status"] = "degraded"
> L1644:                 health_status["available"] = True
> L1645:             else:
> L1646:                 health_status["status"] = "unhealthy"
> L1647:                 health_status["available"] = False
> L1648:             
> L1649:         except Exception as e:
> L1650:             health_status["status"] = "error"
> L1651:             health_status["available"] = False
> L1652:             health_status["error"] = str(e)
> L1653:             health_status["response_time"] = time.time() - start_time if 'start_time' in locals() else None
> L1654:         
> L1655:         return health_status
> L1656: 
> L1657:     async def _store_memory_with_circuit_breaker(self, memory_data: Dict[str, Any]) -> bool:
> L1658:         """Store memory in GraphRAG with circuit breaker protection."""
> L1659:         if not self.graphrag_enabled:
> L1660:             self.logger.debug("GraphRAG disabled, skipping memory storage")
> L1661:             return False
> L1662:         
> L1663:         try:
> L1664:             async def store_memory():
> L1665:                 async with httpx.AsyncClient(timeout=10.0) as client:
> L1666:                     response = await client.post(
> L1667:                         f"{self.graphrag_url}/memory/store",
> L1668:                         json=memory_data
> L1669:                     )
> L1670:                     response.raise_for_status()
> L1671:                     return response.json()
> L1672:             
> L1673:             result = await self.graphrag_circuit_breaker.call(store_memory)
> L1674:             self.logger.info(f"Memory stored in GraphRAG: {result.get('id', 'unknown')}")
> L1700:             return True
> L1701:             
> L1702:         except GraphRAGUnavailableError as e:
> L1703:             self.logger.warning(f"GraphRAG unavailable for memory storage: {e}")
> L1704:             return False
> L1705:         except Exception as e:
> L1706:             self.logger.error(f"Failed to store memory in GraphRAG: {e}")
> L1707:             
> L1708:             # Record error for tracking
> L1709:             self.error_tracker.record_error(
> L1710:                 error_type="graphrag_error",
> L1711:                 error_message=str(e),
> L1712:                 context={"method": "_store_memory_with_circuit_breaker", "operation": "store_memory"}
> L1713:             )
> L1714:             
> L1715:             return False
> L1716: 
> L1717:     async def _retrieve_memory_with_circuit_breaker(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
> L1718:         """Retrieve memory from GraphRAG with circuit breaker protection."""
> L1719:         if not self.graphrag_enabled:
> L1720:             self.logger.debug("GraphRAG disabled, returning empty memory results")
> L1721:             return []
> L1722:         
> L1723:         try:
> L1724:             async def retrieve_memory():
> L1725:                 async with httpx.AsyncClient(timeout=10.0) as client:
> L1726:                     response = await client.post(
> L1727:                         f"{self.graphrag_url}/memory/retrieve",
> L1728:                         json={"query": query, "limit": limit}
> L1729:                     )
> L1730:                     response.raise_for_status()
> L1731:                     return response.json()
> L1732:             
> L1733:             result = await self.graphrag_circuit_breaker.call(retrieve_memory)
> L1734:             memories = result if isinstance(result, list) else result.get('memories', [])
> L1735:             self.logger.info(f"Retrieved {len(memories)} memories from GraphRAG")
> L1736:             return memories
> L1737:             
> L1738:         except GraphRAGUnavailableError as e:
> L1739:             self.logger.warning(f"GraphRAG unavailable for memory retrieval: {e}")
> L1740:             return []
> L1741:         except Exception as e:
> L1742:             self.logger.error(f"Failed to retrieve memory from GraphRAG: {e}")
> L1743:             return []
> L1744: 
> L1745:     async def _store_session_memory(self, session: OrchestrationSession):
> L1746:         """Store orchestration session as memory in GraphRAG."""
> L1747:         try:
> L1748:             # Create memory data from session
> L1749:             memory_data = {
> L1750:                 "content": f"Orchestrated task: {session.task.description}",
> L1751:                 "memory_type": "episodic",
> L1752:                 "importance": "high" if session.overall_quality_score > 0.8 else "medium",
> L1753:                 "session_id": session.session_id,
> L1754:                 "agent_id": "cerebrum_orchestrator",
> L1755:                 "context": {
> L1756:                     "task_complexity": session.task.complexity.value,
> L1757:                     "execution_strategy": session.decomposition_plan.strategy.value if session.decomposition_plan else "unknown",
> L1758:                     "sub_tasks_count": len(session.execution_results),
> L1759:                     "overall_quality_score": session.overall_quality_score,
> L1760:                     "total_execution_time": session.total_execution_time,
> L1761:                     "success": session.status.value == "completed"
> L1762:                 },
> L1763:                 "tags": [
> L1764:                     "orchestration",
> L1765:                     session.task.complexity.value,
> L1766:                     session.status.value,
> L1767:                     f"quality_{int(session.overall_quality_score * 10)}"
> L1768:                 ]
> L1769:             }
> L1770:             
> L1771:             # Add error information if session failed
> L1772:             if session.errors:
> L1773:                 memory_data["context"]["errors"] = session.errors[:3]  # Limit to first 3 errors
> L1774:                 memory_data["tags"].append("failed")
> L1775:             
> L1776:             # Store memory with circuit breaker protection
> L1777:             success = await self._store_memory_with_circuit_breaker(memory_data)
> L1778:             
> L1779:             if success:
> L1780:                 session.metadata["memory_stored"] = True
> L1781:                 self.logger.info(f"Session {session.session_id} stored as memory in GraphRAG")
> L1782:             else:
> L1783:                 session.metadata["memory_stored"] = False
> L1784:                 session.warnings.append("Failed to store session memory in GraphRAG")
> L1785:                 
> L1786:         except Exception as e:
> L1787:             self.logger.error(f"Error storing session memory: {e}")
> L1788:             session.metadata["memory_stored"] = False
> L1789:             session.warnings.append(f"Memory storage error: {str(e)}")
> L1790: 
> L1791:     async def _retrieve_relevant_memories(self, task_description: str) -> List[Dict[str, Any]]:
> L1792:         """Retrieve relevant memories for task planning."""
> L1793:         try:
> L1794:             # Query for similar past orchestrations
> L1795:             memories = await self._retrieve_memory_with_circuit_breaker(
> L1796:                 query=f"orchestration task similar to: {task_description}",
> L1797:                 limit=5
> L1798:             )
> L1799:             
> L1800:             if memories:
> L1801:                 self.logger.info(f"Found {len(memories)} relevant memories for task planning")
> L1802:                 return memories
> L1803:             else:
> L1804:                 self.logger.debug("No relevant memories found for task planning")
> L1805:                 return []
> L1806:                 
> L1807:         except Exception as e:
> L1808:             self.logger.error(f"Error retrieving relevant memories: {e}")
> L1809:             return []

## 2. Simulation / Stub Detection

This section identifies all code that is incomplete, simulated, or serves as a temporary fallback.

> L64: # Create dummy monitoring classes for graceful degradation
> L65:     class MonitoringSystem:
> L66:         def __init__(self, orchestrator): pass
> L67:         async def get_unified_monitoring_data(self): return {}
> L68:         def get_monitoring_summary(self): return {}
> L69:     class SystemHealthManager:
> L70:         def __init__(self, orchestrator): pass
> L71:         async def get_comprehensive_health(self): return {}
> L72:     class PerformanceMetricsCollector:
> L73:         def __init__(self, orchestrator): pass
> L74:         def record_session_metrics(self, session): pass
> L75:         def get_performance_analysis(self, hours=24): return {}
> L76:     class ErrorTracker:
> L77:         def __init__(self, orchestrator): pass
> L78:         def record_error(self, error_type, message, context=None): pass
> L79:     class GraphRAGCircuitBreaker:
> L80:         def __init__(self, failure_threshold=5, recovery_timeout=60): pass
> L81:         async def call(self, func, *args, **kwargs): return await func(*args, **kwargs)
> L82:         def get_status(self): return {"state": "CLOSED"}

- **Analysis**: The entire block from L65-L82 defines stub classes that are used when the `monitoring` package is not available. They use `pass` in `__init__` and return empty or default values, effectively simulating a working monitoring system while doing nothing. This prevents `AttributeError`s but hides the fact that a key dependency is missing.

> L110: # Event capture not available - create dummy functions
> L111:     EVENT_CAPTURE_AVAILABLE = False
> L112:     def setup_event_capture_hooks(*args, **kwargs): pass
> L113:     def capture_task_start(*args, **kwargs): pass
> L114:     def capture_task_complete(*args, **kwargs): pass
> L115:     def capture_planning_start(*args, **kwargs): pass
> L116:     def capture_planning_complete(*args, **kwargs): pass
> L117:     def capture_execution_start(*args, **kwargs): pass
> L118:     def capture_execution_complete(*args, **kwargs): pass
> L119:     def capture_criticism_start(*args, **kwargs): pass
> L120:     def capture_criticism_complete(*args, **kwargs): pass
> L121:     def capture_agent_selection(*args, **kwargs): pass
> L122:     def capture_error_event(*args, **kwargs): pass
> L123:     def capture_workflow_event(*args, **kwargs): pass

- **Analysis**: Similar to the monitoring stubs, lines L112-L123 define a series of dummy functions that do nothing (`pass`). This simulates the event capture system when the real implementation cannot be imported.

> L866: return self._select_executor_fallback(sub_task)
> L882: return self._select_executor_fallback(sub_task)
> L889: return self._select_executor_fallback(sub_task)
> L933: return self._select_executor_fallback(sub_task)
> L942: return self._select_executor_fallback(sub_task)
> L950: return self._select_executor_fallback(sub_task)
> L954: return self._select_executor_fallback(sub_task)
> L958: return self._select_executor_fallback(sub_task)

- **Analysis**: The `_ai_select_executor` and `_select_executor_for_task` methods repeatedly fall back to `_select_executor_fallback`. This indicates that the primary AI-based selection logic is not trusted to be robust and requires a non-AI, keyword-based simulation as a backup.

> L974: def _select_executor_fallback(self, sub_task) -> Optional[ExecutorAgent]:
> L975:         """Fallback keyword-based executor selection."""

- **Analysis**: The function itself is explicitly named a "fallback", indicating it's a substitute for a more sophisticated primary mechanism. It simulates intelligent selection using simple, brittle keyword matching.

> L1171: # For now, put all conflicting tasks in sequential groups of 1
> L1172: # More sophisticated grouping could be implemented later

- **Analysis**: This `TODO` comment explicitly states that the resource conflict handling (L1173-L1174) is a stub. It avoids parallel execution for any conflicting task, which is safe but inefficient. A real implementation would group non-overlapping conflicting tasks to run in parallel.

## 3. Best-Practice Violations (July 2025)

This section details violations of modern Python best practices.

> L140: class CerebrumOrchestrator:

- **Violation**: **Single Responsibility Principle (SRP) / God Object**. The class has over 1500 lines and manages state, workflow nodes, execution strategies, agent selection, monitoring, configuration, and external service integration (GraphRAG, Redis).
- **Evidence**: The class contains methods for workflow logic (`_plan_task`, `_execute_plan`), execution strategy (`_execute_parallel`, `_execute_sequential`), external client logic (`_store_session_memory`, `_check_graphrag_health`), monitoring (`get_unified_monitoring_data`), and configuration (hardcoded values in `__init__`).
- **Fix**: Refactor the class by extracting distinct responsibilities into separate modules as detailed in Section 4.

> L181: self.max_retries = 2
> L182: self.retry_delay = 1.0
> L188: self.graphrag_url = os.getenv("GRAPHRAG_URL", "http://localhost:8001")
> L209: redis_url = os.getenv("REDIS_URL", "redis://redis:6379")

- **Violation**: **Hardcoded Configuration & Environment Variable Sprawl**. Configuration values are scattered throughout the `__init__` method, mixing hardcoded defaults with direct `os.getenv` calls.
- **Evidence**: Lines L181, L182, L188, L191, L192, L209.
- **Fix**: Introduce a dedicated configuration module using Pydantic's `BaseSettings` to load configuration from environment variables into a structured, type-validated object. This centralizes all configuration.

> L203: self.session_id_lock = threading.Lock()
> L313: with self.session_id_lock:

- **Violation**: **Mixing `asyncio` with `threading` primitives**. Using `threading.Lock` in an `asyncio` application is a sign of design issues. While it works for protecting a simple counter, it's not idiomatic `asyncio` and can be misleading. An async-native approach or simply managing state within the async context is preferred.
- **Evidence**: The lock is created at L203 and used in an `async` method at L313.
- **Fix**: Since `orchestrate_task` is the only entry point that modifies the counter, and each invocation runs its own state machine, the lock is likely unnecessary if the orchestrator object is not shared across threads. If it must be shared, an `asyncio.Lock` would be more appropriate, but the need for it should be re-evaluated.

> L211: redis_client.ping()
> L1593: health_response = await client.get(f"{self.graphrag_url}/health")

- **Violation**: **Blocking I/O in `__init__` and synchronous I/O in `async` code**. The `redis_client.ping()` call at L211 is a blocking network call inside the constructor. While `httpx` is used asynchronously, the Redis client is not.
- **Evidence**: L211 performs a synchronous network call.
- **Fix**: The `__init__` method should not perform I/O. Connection setup should be done in a separate `async def connect()` method. For blocking libraries like `redis-py` (before v5.0), I/O calls within an `async` function should be wrapped with `await asyncio.to_thread(redis_client.ping)` to avoid blocking the event loop.

> L213: except Exception as e:
> L394: except Exception as e:
> L510: except Exception as e:
> L872: except Exception as e:

- **Violation**: **Overly Broad Exception Handling**. Catching `Exception` hides specific errors, making debugging difficult and leading to incorrect error handling logic.
- **Evidence**: Lines L213, L394, L510, L551, L601, L662, L872, L956, L1786.
- **Fix**: Catch specific exceptions first (e.g., `redis.exceptions.ConnectionError`, `httpx.RequestError`, `KeyError`, `json.JSONDecodeError`), and only then catch a broader `Exception` as a last resort.

> L974: def _select_executor_fallback(self, sub_task) -> Optional[ExecutorAgent]:
> L1225: def _classify_error(self, error: Exception) -> Dict[str, Any]:

- **Violation**: **Complex `if/elif/else` chains instead of `match/case`**. These functions use long, hard-to-read `if/elif` chains for dispatching logic based on keywords or types.
- **Evidence**: The entire body of `_select_executor_fallback` (L985-L1044) is a series of `if/any()` checks. The `_classify_error` function (L1229-L1294) is a series of `isinstance` and `in` checks.
- **Fix**: Refactor both functions to use the `match/case` statement (available since Python 3.10) for clearer, more structured pattern matching. For `_classify_error`, match on the error type (`case ConnectionError():`) and use guards for string matching. For `_select_executor_fallback`, match on a tuple of boolean conditions or a derived category.

> L1307: from ..core.models import ExecutionResult, ExecutionStatus

- **Violation**: **Local `import` inside a function**. This is generally discouraged by PEP 8 as it hides dependencies and can cause circular import issues.
- **Evidence**: Line L1307 inside `_create_failure_result`.
- **Fix**: Move the import to the top of the file (L40) with the other `.core` imports.

## 4. Refactor Map for <500 Line Compliance

The current 1765-line file will be broken down into smaller, single-responsibility modules.

**Proposed Directory Structure:**
```
src/agent_motor/cerebrum/
├── orchestrator/
│   ├── __init__.py
│   ├── config.py             # Configuration models (Pydantic)
│   ├── main.py               # The new slim CerebrumOrchestrator class
│   ├── state.py              # CerebrumState, session types, enums
│   ├── workflow_nodes.py     # _plan_task, _execute_plan, etc. as functions
│   ├── execution_strategy.py # _execute_parallel/_sequential, dependency analysis
│   ├── executor_selector.py  # _ai_select_executor, _select_executor_fallback
│   ├── error_handler.py      # _classify_error, custom exceptions
│   └── integrations/
│       ├── __init__.py
│       ├── graphrag_client.py  # All GraphRAG interaction logic
│       └── monitoring_client.py # Monitoring API calls and fallbacks
└── ... (other cerebrum modules)
```

**Estimated Line Counts per New File:**

| New File | Est. Lines | Responsibilities |
| :--- | :--- | :--- |
| `orchestrator/main.py` | ~250 | Core `CerebrumOrchestrator` class, `__init__`, `orchestrate_task`, workflow definition. Delegates all complex logic to other modules. |
| `orchestrator/state.py` | ~50 | `CerebrumState`, `OrchestrationSession`, `OrchestrationPhase`, etc. |
| `orchestrator/config.py` | ~50 | Pydantic `BaseSettings` for Redis URL, GraphRAG URL, retry counts, etc. |
| `orchestrator/workflow_nodes.py` | ~300 | `initialize_session`, `plan_task`, `assess_quality`, `integrate_results`, `complete_session`. |
| `orchestrator/execution_strategy.py` | ~250 | `execute_plan`, `execute_sequential`, `execute_parallel`, dependency and resource analysis. |
| `orchestrator/executor_selector.py` | ~200 | `select_executor_for_task`, `ai_select_executor`, `select_executor_fallback`. |
| `orchestrator/error_handler.py` | ~150 | `classify_error`, `create_failure_result`, custom exception classes. |
| `integrations/graphrag_client.py` | ~200 | `store_session_memory`, `retrieve_relevant_memories`, `check_graphrag_health`. |
| `integrations/monitoring_client.py`| ~150 | `get_unified_monitoring_data`, `get_monitoring_summary`, and their fallbacks. |
| **Total** | **~1600** | The total line count remains similar, but each file is now well under the 500-line limit and adheres to SRP. |

## 5. Implementation Roadmap

This is an ordered TODO list for executing the refactor proposed in Section 4.

1.  **Setup New Structure**:
    *   Create the new directory structure: `src/agent_motor/cerebrum/orchestrator/` and `.../integrations/`.
    *   Create empty `__init__.py` files in the new directories.
    *   Cross-reference: Section 4.

2.  **Centralize State and Configuration**:
    *   Move `CerebrumState` (L130), `OrchestrationSession`, and related types to `orchestrator/state.py`.
    *   Create `orchestrator/config.py` using Pydantic `BaseSettings`. Migrate all `os.getenv` calls and hardcoded values (L181, L188, etc.) to this file.
    *   Cross-reference: Section 3 (Hardcoded Configuration).

3.  **Extract Integration Logic**:
    *   Move all GraphRAG-related methods (`_check_graphrag_health`, `_store_session_memory`, etc.) from `CerebrumOrchestrator` to `integrations/graphrag_client.py`.
    *   Move all monitoring API methods (`get_unified_monitoring_data`, etc.) and their fallback stubs to `integrations/monitoring_client.py`.
    *   Cross-reference: Section 4.

4.  **Isolate Core Logic**:
    *   Move `_classify_error` (L1225) and `_create_failure_result` (L1303) to `orchestrator/error_handler.py`.
    *   Move `_select_executor_for_task` (L857), `_ai_select_executor` (L884), and `_select_executor_fallback` (L974) to `orchestrator/executor_selector.py`.
    *   Move `_execute_plan` (L523), `_execute_sequential` (L784), `_execute_parallel` (L806), and the dependency/resource analysis methods to `orchestrator/execution_strategy.py`.
    *   Cross-reference: Section 3 (SRP), Section 4.

5.  **Refactor Workflow Nodes**:
    *   Move the remaining `_` methods (`_initialize_session`, `_plan_task`, etc.) into `orchestrator/workflow_nodes.py`. These can be standalone functions that take `state` as an argument.
    *   The main `CerebrumOrchestrator` class in `orchestrator/main.py` will now import and call these functions.
    *   Cross-reference: Section 4.

6.  **Modernize Syntax**:
    *   In `orchestrator/executor_selector.py`, refactor the `_select_executor_fallback` function to use a `match/case` statement.
    *   In `orchestrator/error_handler.py`, refactor `_classify_error` to use `match/case` on exception types.
    *   Cross-reference: Section 3 (`match/case` violation).

7.  **Refine `__init__` and Finalize `main.py`**:
    *   Update `CerebrumOrchestrator.__init__` in `orchestrator/main.py` to import and instantiate the new client and helper classes instead of containing the logic directly. It will now be much smaller.
    *   Replace `threading.Lock` with an `asyncio`-native solution if still deemed necessary after refactoring.
    *   Ensure all top-level imports are clean and local imports (L1307) are removed.
    *   Cross-reference: Section 3 (Async/Sync Mix, Local Import).

8.  **Verification**:
    *   Run the project's test suite against the refactored code, adapting tests as needed to the new structure.
    *   Perform a final line count check on all new files to ensure compliance with the <500 line rule.
