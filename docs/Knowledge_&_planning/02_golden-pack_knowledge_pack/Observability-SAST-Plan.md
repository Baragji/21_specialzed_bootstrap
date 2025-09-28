---
canonical_source: "Scaffold/ai-coding-system/docs/verification/phase2_plan/07_observability_sast_plan.md"
golden_pack_selection: "true"
spec_coverage: ["cicd_supply", "contracts", "guardrails", "observability", "operations", "security", "ux_surface"]
selection_score: "61.2"
selection_reason: "Covers 2 required SPEC categories: ['cicd_supply', 'observability']"
word_count: "3237"
cluster: "agentic"
title: "Observability & SAST Plan"
canonical_id: "scaffold-observability-sast-plan"
---
# Observability & SAST Plan

## Current Observability Analysis

**File**: docker-compose.yml
**Existing Configuration**:
- Line 33: "JAEGER_ENDPOINT=http://jaeger:14268/api/traces" (Context Server tracing)
- Line 60: "JAEGER_HOST=jaeger" (Agent Motor tracing)
- Line 120: "jaeger: image: jaegertracing/all-in-one:1.50" (Jaeger service)
- Line 133: "grafana: image: grafana/grafana:10.2.0" (Grafana dashboards)
- Line 149: "prometheus: image: prom/prometheus:v2.47.0" (Metrics collection)

**File**: dashboard-service/Dockerfile
**Existing Setup**: Line 21: "HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3"

**Gaps Identified**:
- No OpenTelemetry instrumentation in Python services
- Missing cost tracking implementation
- No SAST integration in CI pipeline
- Limited metrics collection from agent backends
- No distributed tracing correlation across services
- Missing performance monitoring for AI model calls

## Evidence & Code Citations

### Current CI Pipeline (Without SAST):
```yaml
# .github/workflows/ci.yml (Lines 41-50)
      - name: 📦 Install dependencies
        working-directory: ai-coding-system
        run: |
          pnpm install --frozen-lockfile
          pnpm audit --audit-level=high

      - name: 🔍 License scan
        working-directory: ai-coding-system
        run: |
          # Check for allowed licenses only (MIT/Apache/BSD)
          # NO SAST SCANNING HERE - SECURITY GAP
```

### Semgrep Job Integration (AFTER):
```yaml
# .github/workflows/ci.yml (NEW SAST JOB) - CI workflow integration
  sast-scan:
    name: 🔒 SAST Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
      
      - name: 🔍 Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: semgrep.yml
          generateSarif: "1"
      
      - name: 📄 Upload SARIF file
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: semgrep.sarif
        if: always()
```

### CI Workflow Integration:
```yaml
# Complete CI workflow integration with SAST
jobs:
  sast-scan:
    name: 🔒 SAST Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: semgrep.yml
```

### OpenTelemetry Environment Variables:
```bash
# Required OTEL environment variables for instrumentation
OTEL_SERVICE_NAME=agent-motor
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=service.name=agent-motor,service.version=1.0.0
OTEL_EXPORTER_JAEGER_ENDPOINT=http://jaeger:14268/api/traces
OTEL_EXPORTER_PROMETHEUS_HOST=0.0.0.0
OTEL_EXPORTER_PROMETHEUS_PORT=9464
OTEL_TRACES_EXPORTER=jaeger
OTEL_METRICS_EXPORTER=prometheus
OTEL_LOGS_EXPORTER=console
OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true
```

### Semgrep Rules File:
```yaml
# semgrep.yml (Security rules for AI coding system)
rules:
  - id: hardcoded-api-key
    patterns:
      - pattern-either:
          - pattern: |
              $KEY = "sk-..."
          - pattern: |
              $KEY = "AIza..."
          - pattern: |
              $KEY = "sk-ant-..."
    message: "Hardcoded API key detected"
    languages:
      - python
      - javascript
    severity: ERROR
    metadata:
      category: security
      confidence: HIGH
      impact: HIGH
      
  - id: ai-prompt-injection
    patterns:
      - pattern-either:
          - pattern: |
              $PROMPT = $USER_INPUT
          - pattern: |
              generate_text($USER_INPUT)
    message: "Potential AI prompt injection vulnerability"
    languages:
      - python
    severity: WARNING
    metadata:
      category: security
      confidence: MEDIUM
      impact: MEDIUM
```

## OpenTelemetry Configuration

### Agent Motor Instrumentation:
```python
# src/agent_motor/observability/telemetry.py
"""
OpenTelemetry instrumentation for Agent Motor service.
"""

import os
import time
from typing import Dict, Any, Optional
from contextlib import contextmanager

from opentelemetry import trace, metrics
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.asyncio import AsyncioInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.resource import ResourceAttributes

class TelemetryManager:
    """Centralized telemetry management for Agent Motor."""
    
    def __init__(self, service_name: str = "agent-motor"):
        self.service_name = service_name
        self.tracer = None
        self.meter = None
        self.cost_tracker = None
        self._initialized = False
    
    def initialize(self):
        """Initialize OpenTelemetry instrumentation."""
        if self._initialized:
            return
        
        # Create resource
        resource = Resource.create({
            ResourceAttributes.SERVICE_NAME: self.service_name,
            ResourceAttributes.SERVICE_VERSION: "2.0.0",
            ResourceAttributes.DEPLOYMENT_ENVIRONMENT: os.getenv("ENVIRONMENT", "development")
        })
        
        # Initialize tracing
        self._setup_tracing(resource)
        
        # Initialize metrics
        self._setup_metrics(resource)
        
        # Initialize cost tracking
        self._setup_cost_tracking()
        
        # Auto-instrument libraries
        self._setup_auto_instrumentation()
        
        self._initialized = True
    
    def _setup_tracing(self, resource: Resource):
        """Setup distributed tracing with Jaeger."""
        trace.set_tracer_provider(TracerProvider(resource=resource))
        
        # Jaeger exporter
        jaeger_exporter = JaegerExporter(
            agent_host_name=os.getenv("JAEGER_HOST", "localhost"),
            agent_port=int(os.getenv("JAEGER_PORT", "6831")),
        )
        
        # Batch span processor
        span_processor = BatchSpanProcessor(jaeger_exporter)
        trace.get_tracer_provider().add_span_processor(span_processor)
        
        self.tracer = trace.get_tracer(__name__)
    
    def _setup_metrics(self, resource: Resource):
        """Setup metrics collection with Prometheus."""
        # Prometheus metric reader
        prometheus_reader = PrometheusMetricReader()
        
        # Meter provider
        metrics.set_meter_provider(MeterProvider(
            resource=resource,
            metric_readers=[prometheus_reader]
        ))
        
        self.meter = metrics.get_meter(__name__)
        
        # Create custom metrics
        self.backend_request_counter = self.meter.create_counter(
            name="backend_requests_total",
            description="Total number of backend requests",
            unit="1"
        )
        
        self.backend_request_duration = self.meter.create_histogram(
            name="backend_request_duration_seconds",
            description="Backend request duration in seconds",
            unit="s"
        )
        
        self.token_usage_counter = self.meter.create_counter(
            name="tokens_used_total",
            description="Total tokens used by backend",
            unit="1"
        )
        
        self.cost_counter = self.meter.create_counter(
            name="cost_usd_total",
            description="Total cost in USD",
            unit="1"
        )
        
        self.orchestrator_session_counter = self.meter.create_counter(
            name="orchestrator_sessions_total",
            description="Total orchestrator sessions",
            unit="1"
        )
        
        self.orchestrator_session_duration = self.meter.create_histogram(
            name="orchestrator_session_duration_seconds",
            description="Orchestrator session duration in seconds",
            unit="s"
        )
    
    def _setup_cost_tracking(self):
        """Setup cost tracking for AI model usage."""
        self.cost_tracker = CostTracker(self.meter)
    
    def _setup_auto_instrumentation(self):
        """Setup automatic instrumentation for common libraries."""
        # FastAPI instrumentation
        FastAPIInstrumentor.instrument()
        
        # HTTP requests instrumentation
        RequestsInstrumentor.instrument()
        
        # Asyncio instrumentation
        AsyncioInstrumentor.instrument()
    
    @contextmanager
    def trace_backend_request(self, backend_name: str, method: str):
        """Context manager for tracing backend requests."""
        start_time = time.time()
        
        with self.tracer.start_as_current_span(
            f"backend.{backend_name}.{method}",
            attributes={
                "backend.name": backend_name,
                "backend.method": method,
                "service.name": self.service_name
            }
        ) as span:
            try:
                yield span
                
                # Record success metrics
                duration = time.time() - start_time
                self.backend_request_counter.add(1, {
                    "backend": backend_name,
                    "method": method,
                    "status": "success"
                })
                self.backend_request_duration.record(duration, {
                    "backend": backend_name,
                    "method": method
                })
                
            except Exception as e:
                # Record error metrics
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                self.backend_request_counter.add(1, {
                    "backend": backend_name,
                    "method": method,
                    "status": "error"
                })
                raise
    
    @contextmanager
    def trace_orchestrator_session(self, session_id: str, task_type: str):
        """Context manager for tracing orchestrator sessions."""
        start_time = time.time()
        
        with self.tracer.start_as_current_span(
            f"orchestrator.session",
            attributes={
                "session.id": session_id,
                "task.type": task_type,
                "service.name": self.service_name
            }
        ) as span:
            try:
                yield span
                
                # Record success metrics
                duration = time.time() - start_time
                self.orchestrator_session_counter.add(1, {
                    "task_type": task_type,
                    "status": "success"
                })
                self.orchestrator_session_duration.record(duration, {
                    "task_type": task_type
                })
                
            except Exception as e:
                # Record error metrics
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                self.orchestrator_session_counter.add(1, {
                    "task_type": task_type,
                    "status": "error"
                })
                raise
    
    def record_token_usage(self, backend_name: str, tokens: int, cost: float):
        """Record token usage and cost metrics."""
        self.token_usage_counter.add(tokens, {"backend": backend_name})
        self.cost_counter.add(cost, {"backend": backend_name})
        
        # Track with cost tracker
        if self.cost_tracker:
            self.cost_tracker.record_usage(backend_name, tokens, cost)

class CostTracker:
    """Real-time cost tracking for AI model usage."""
    
    def __init__(self, meter):
        self.meter = meter
        self.daily_cost = 0.0
        self.monthly_cost = 0.0
        self.cost_by_backend = {}
        self.cost_alerts = []
        
        # Cost thresholds
        self.daily_threshold = float(os.getenv("DAILY_COST_THRESHOLD", "50.0"))
        self.monthly_threshold = float(os.getenv("MONTHLY_COST_THRESHOLD", "1000.0"))
        
        # Cost metrics
        self.daily_cost_gauge = self.meter.create_up_down_counter(
            name="daily_cost_usd",
            description="Daily cost in USD",
            unit="1"
        )
        
        self.monthly_cost_gauge = self.meter.create_up_down_counter(
            name="monthly_cost_usd", 
            description="Monthly cost in USD",
            unit="1"
        )
    
    def record_usage(self, backend_name: str, tokens: int, cost: float):
        """Record usage and update cost tracking."""
        # Update totals
        self.daily_cost += cost
        self.monthly_cost += cost
        
        # Update by backend
        if backend_name not in self.cost_by_backend:
            self.cost_by_backend[backend_name] = 0.0
        self.cost_by_backend[backend_name] += cost
        
        # Update metrics
        self.daily_cost_gauge.add(cost)
        self.monthly_cost_gauge.add(cost)
        
        # Check thresholds
        self._check_cost_thresholds()
    
    def _check_cost_thresholds(self):
        """Check cost thresholds and generate alerts."""
        if self.daily_cost > self.daily_threshold:
            alert = {
                "type": "daily_cost_exceeded",
                "current": self.daily_cost,
                "threshold": self.daily_threshold,
                "timestamp": time.time()
            }
            self.cost_alerts.append(alert)
        
        if self.monthly_cost > self.monthly_threshold:
            alert = {
                "type": "monthly_cost_exceeded",
                "current": self.monthly_cost,
                "threshold": self.monthly_threshold,
                "timestamp": time.time()
            }
            self.cost_alerts.append(alert)
    
    def get_cost_summary(self) -> Dict[str, Any]:
        """Get current cost summary."""
        return {
            "daily_cost": self.daily_cost,
            "monthly_cost": self.monthly_cost,
            "cost_by_backend": self.cost_by_backend,
            "daily_threshold": self.daily_threshold,
            "monthly_threshold": self.monthly_threshold,
            "alerts": self.cost_alerts[-10:]  # Last 10 alerts
        }

# Global telemetry instance
telemetry = TelemetryManager()

# Decorator for automatic tracing
def trace_method(operation_name: str = None):
    """Decorator for automatic method tracing."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            with telemetry.tracer.start_as_current_span(op_name) as span:
                # Add method attributes
                span.set_attribute("method.name", func.__name__)
                span.set_attribute("method.module", func.__module__)
                
                try:
                    result = func(*args, **kwargs)
                    span.set_attribute("method.success", True)
                    return result
                except Exception as e:
                    span.set_attribute("method.success", False)
                    span.set_attribute("method.error", str(e))
                    raise
        
        return wrapper
    return decorator
```

### Backend Integration:
```python
# src/agent_motor/backends/instrumented_backend.py
"""
Instrumented backend wrapper for observability.
"""

from typing import Dict, Any
from .base_backend import StandardResponse
from ..observability.telemetry import telemetry

class InstrumentedBackend:
    """Wrapper to add observability to backends."""
    
    def __init__(self, backend):
        self.backend = backend
        self.backend_name = getattr(backend, 'name', str(backend))
    
    async def generate_patch(self, *args, **kwargs) -> StandardResponse:
        """Generate patch with observability."""
        with telemetry.trace_backend_request(self.backend_name, "generate_patch") as span:
            # Add request attributes
            span.set_attribute("request.type", "generate_patch")
            if args:
                span.set_attribute("request.problem_statement_length", len(str(args[0])))
            
            # Call original method
            response = await self.backend.generate_patch(*args, **kwargs)
            
            # Record metrics
            if hasattr(response, 'tokens_used') and hasattr(response, 'cost_usd'):
                telemetry.record_token_usage(
                    self.backend_name,
                    response.tokens_used,
                    response.cost_usd
                )
            
            # Add response attributes
            span.set_attribute("response.success", response.success if hasattr(response, 'success') else True)
            span.set_attribute("response.tokens_used", getattr(response, 'tokens_used', 0))
            span.set_attribute("response.cost_usd", getattr(response, 'cost_usd', 0.0))
            
            return response
    
    async def generate_text(self, *args, **kwargs) -> StandardResponse:
        """Generate text with observability."""
        with telemetry.trace_backend_request(self.backend_name, "generate_text") as span:
            # Add request attributes
            span.set_attribute("request.type", "generate_text")
            if args:
                span.set_attribute("request.prompt_length", len(str(args[0])))
            
            # Call original method
            response = await self.backend.generate_text(*args, **kwargs)
            
            # Record metrics
            if hasattr(response, 'tokens_used') and hasattr(response, 'cost_usd'):
                telemetry.record_token_usage(
                    self.backend_name,
                    response.tokens_used,
                    response.cost_usd
                )
            
            # Add response attributes
            span.set_attribute("response.success", response.success if hasattr(response, 'success') else True)
            span.set_attribute("response.tokens_used", getattr(response, 'tokens_used', 0))
            span.set_attribute("response.cost_usd", getattr(response, 'cost_usd', 0.0))
            
            return response
    
    def __getattr__(self, name):
        """Delegate other methods to original backend."""
        return getattr(self.backend, name)
```

## Jaeger Integration

### Enhanced Docker Configuration:
```yaml
# docker-compose.observability.yml
version: '3.8'

services:
  # Enhanced Jaeger with persistent storage
  jaeger:
    image: jaegertracing/all-in-one:1.50
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger collector HTTP
      - "6831:6831/udp"  # Jaeger agent UDP
      - "14250:14250"  # Jaeger gRPC
    environment:
      - COLLECTOR_OTLP_ENABLED=true
      - SPAN_STORAGE_TYPE=elasticsearch
      - ES_SERVER_URLS=http://elasticsearch:9200
      - ES_INDEX_PREFIX=jaeger
    volumes:
      - jaeger-data:/tmp
    depends_on:
      - elasticsearch
    networks:
      - ai-coding-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:16686/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Elasticsearch for Jaeger storage
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - ai-coding-network
    restart: unless-stopped

  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.88.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./monitoring/otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC receiver
      - "4318:4318"   # OTLP HTTP receiver
      - "8888:8888"   # Prometheus metrics
    depends_on:
      - jaeger
      - prometheus
    networks:
      - ai-coding-network
    restart: unless-stopped

volumes:
  jaeger-data:
  elasticsearch-data:
```

### OpenTelemetry Collector Configuration:
```yaml
# monitoring/otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  
  prometheus:
    config:
      scrape_configs:
        - job_name: 'agent-motor'
          static_configs:
            - targets: ['agent-motor:8000']
        - job_name: 'context-server'
          static_configs:
            - targets: ['context-server:3001']
        - job_name: 'dashboard'
          static_configs:
            - targets: ['dashboard:5080']

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  
  resource:
    attributes:
      - key: environment
        value: ${ENVIRONMENT}
        action: upsert
      - key: service.version
        value: "2.0.0"
        action: upsert
  
  memory_limiter:
    limit_mib: 512

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  
  prometheus:
    endpoint: "0.0.0.0:8888"
  
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [jaeger, logging]
    
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, resource, batch]
      exporters: [prometheus, logging]
```

## Cost Tracking Implementation

### Real-time Cost Dashboard:
```python
# src/agent_motor/cost_tracking/dashboard.py
"""
Real-time cost tracking dashboard integration.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

from fastapi import WebSocket
from ..observability.telemetry import telemetry

class CostDashboard:
    """Real-time cost tracking dashboard."""
    
    def __init__(self):
        self.websocket_clients = set()
        self.cost_history = []
        self.alert_thresholds = {
            "hourly": 5.0,
            "daily": 50.0,
            "weekly": 200.0,
            "monthly": 1000.0
        }
    
    async def connect_websocket(self, websocket: WebSocket):
        """Connect new websocket client."""
        await websocket.accept()
        self.websocket_clients.add(websocket)
        
        # Send current cost summary
        cost_summary = self.get_cost_summary()
        await websocket.send_json({
            "type": "cost_summary",
            "data": cost_summary
        })
    
    def disconnect_websocket(self, websocket: WebSocket):
        """Disconnect websocket client."""
        self.websocket_clients.discard(websocket)
    
    async def broadcast_cost_update(self, cost_data: Dict[str, Any]):
        """Broadcast cost update to all connected clients."""
        message = {
            "type": "cost_update",
            "data": cost_data,
            "timestamp": datetime.now().isoformat()
        }
        
        # Remove disconnected clients
        disconnected = set()
        for client in self.websocket_clients:
            try:
                await client.send_json(message)
            except:
                disconnected.add(client)
        
        self.websocket_clients -= disconnected
    
    def record_cost_event(self, backend: str, tokens: int, cost: float, operation: str):
        """Record cost event and check thresholds."""
        event = {
            "timestamp": datetime.now(),
            "backend": backend,
            "tokens": tokens,
            "cost": cost,
            "operation": operation
        }
        
        self.cost_history.append(event)
        
        # Keep only last 24 hours
        cutoff = datetime.now() - timedelta(hours=24)
        self.cost_history = [e for e in self.cost_history if e["timestamp"] > cutoff]
        
        # Check thresholds and broadcast if needed
        asyncio.create_task(self._check_and_broadcast_alerts())
    
    async def _check_and_broadcast_alerts(self):
        """Check cost thresholds and broadcast alerts."""
        now = datetime.now()
        
        # Calculate costs for different time periods
        costs = {
            "hourly": self._calculate_cost_for_period(now - timedelta(hours=1)),
            "daily": self._calculate_cost_for_period(now - timedelta(days=1)),
            "weekly": self._calculate_cost_for_period(now - timedelta(weeks=1)),
            "monthly": self._calculate_cost_for_period(now - timedelta(days=30))
        }
        
        # Check thresholds
        alerts = []
        for period, cost in costs.items():
            threshold = self.alert_thresholds[period]
            if cost > threshold:
                alerts.append({
                    "period": period,
                    "cost": cost,
                    "threshold": threshold,
                    "severity": "warning" if cost < threshold * 1.5 else "critical"
                })
        
        if alerts:
            await self.broadcast_cost_update({
                "type": "cost_alert",
                "alerts": alerts,
                "current_costs": costs
            })
    
    def _calculate_cost_for_period(self, start_time: datetime) -> float:
        """Calculate total cost for a time period."""
        return sum(
            event["cost"] 
            for event in self.cost_history 
            if event["timestamp"] >= start_time
        )
    
    def get_cost_summary(self) -> Dict[str, Any]:
        """Get comprehensive cost summary."""
        now = datetime.now()
        
        # Calculate costs by time period
        costs_by_period = {
            "last_hour": self._calculate_cost_for_period(now - timedelta(hours=1)),
            "last_24h": self._calculate_cost_for_period(now - timedelta(days=1)),
            "last_7d": self._calculate_cost_for_period(now - timedelta(weeks=1)),
            "last_30d": self._calculate_cost_for_period(now - timedelta(days=30))
        }
        
        # Calculate costs by backend
        costs_by_backend = {}
        for event in self.cost_history:
            backend = event["backend"]
            if backend not in costs_by_backend:
                costs_by_backend[backend] = 0.0
            costs_by_backend[backend] += event["cost"]
        
        # Calculate costs by operation
        costs_by_operation = {}
        for event in self.cost_history:
            operation = event["operation"]
            if operation not in costs_by_operation:
                costs_by_operation[operation] = 0.0
            costs_by_operation[operation] += event["cost"]
        
        # Get telemetry cost data
        telemetry_costs = telemetry.cost_tracker.get_cost_summary() if telemetry.cost_tracker else {}
        
        return {
            "costs_by_period": costs_by_period,
            "costs_by_backend": costs_by_backend,
            "costs_by_operation": costs_by_operation,
            "thresholds": self.alert_thresholds,
            "telemetry_data": telemetry_costs,
            "total_events": len(self.cost_history)
        }

# Global cost dashboard instance
cost_dashboard = CostDashboard()
```

## SAST Integration

### Semgrep GitHub Action:
```yaml
# .github/workflows/sast.yml
name: 🔒 SAST - Security Analysis

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    # Run SAST daily at 3 AM UTC
    - cron: '0 3 * * *'
  workflow_dispatch:

env:
  SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

jobs:
  semgrep:
    name: 🔍 Semgrep Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for better analysis

      - name: 🔒 Run Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
            p/python
            p/javascript
            p/typescript
            p/docker
            p/kubernetes
          generateSarif: "1"
          
      - name: 📊 Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep.sarif
          
      - name: 📋 Generate Security Report
        if: always()
        run: |
          # Create detailed security report
          echo "# Security Analysis Report" > security_report.md
          echo "**Date**: $(date)" >> security_report.md
          echo "**Commit**: ${{ github.sha }}" >> security_report.md
          echo "" >> security_report.md
          
          # Add Semgrep results summary
          if [ -f semgrep.sarif ]; then
            echo "## Semgrep Results" >> security_report.md
            jq -r '.runs[0].results | length' semgrep.sarif > /tmp/finding_count
            echo "**Total Findings**: $(cat /tmp/finding_count)" >> security_report.md
            echo "" >> security_report.md
            
            # Group findings by severity
            echo "### Findings by Severity" >> security_report.md
            jq -r '.runs[0].results | group_by(.level) | .[] | "\(.[0].level): \(length)"' semgrep.sarif >> security_report.md
          fi
          
      - name: 📤 Upload Security Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: security-report
          path: security_report.md

  dependency-check:
    name: 🔍 Dependency Vulnerability Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        
      - name: 🐍 Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: 🟢 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: 🔍 Python Security Scan
        run: |
          pip install safety bandit
          
          # Safety check for known vulnerabilities
          find . -name "requirements*.txt" -exec safety check -r {} \; || true
          
          # Bandit security linter
          bandit -r src/ -f json -o bandit_report.json || true
          
      - name: 🔍 Node.js Security Scan
        run: |
          # npm audit for Node.js dependencies
          find . -name "package.json" -not -path "*/node_modules/*" | while read package; do
            dir=$(dirname "$package")
            echo "Scanning $dir"
            cd "$dir"
            npm audit --audit-level=moderate --json > npm_audit.json || true
            cd - > /dev/null
          done
          
      - name: 📊 Generate Dependency Report
        run: |
          echo "# Dependency Security Report" > dependency_report.md
          echo "**Date**: $(date)" >> dependency_report.md
          echo "" >> dependency_report.md
          
          # Add Python findings
          if [ -f bandit_report.json ]; then
            echo "## Python Security Issues (Bandit)" >> dependency_report.md
            jq -r '.results | length' bandit_report.json > /tmp/python_issues
            echo "**Total Issues**: $(cat /tmp/python_issues)" >> dependency_report.md
          fi
          
      - name: 📤 Upload Dependency Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: dependency-report
          path: dependency_report.md

  security-summary:
    name: 📋 Security Summary
    needs: [semgrep, dependency-check]
    runs-on: ubuntu-latest
    if: always()
    
    steps:
      - name: 📥 Download Reports
        uses: actions/download-artifact@v4
        with:
          pattern: '*-report'
          merge-multiple: true
          
      - name: 📊 Generate Combined Report
        run: |
          echo "# Combined Security Analysis Report" > combined_security_report.md
          echo "**Repository**: ${{ github.repository }}" >> combined_security_report.md
          echo "**Branch**: ${{ github.ref_name }}" >> combined_security_report.md
          echo "**Commit**: ${{ github.sha }}" >> combined_security_report.md
          echo "**Date**: $(date)" >> combined_security_report.md
          echo "" >> combined_security_report.md
          
          # Combine all reports
          for report in *_report.md; do
            if [ -f "$report" ]; then
              echo "---" >> combined_security_report.md
              cat "$report" >> combined_security_report.md
              echo "" >> combined_security_report.md
            fi
          done
          
      - name: 📋 Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            if (fs.existsSync('combined_security_report.md')) {
              const report = fs.readFileSync('combined_security_report.md', 'utf8');
              
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## 🔒 Security Analysis Results\n\n${report}`
              });
            }
            
      - name: 📤 Upload Combined Report
        uses: actions/upload-artifact@v4
        with:
          name: combined-security-report
          path: combined_security_report.md
```

### Custom Semgrep Rules:
```yaml
# .semgrep/ai-coding-system.yml
rules:
  - id: hardcoded-api-key
    pattern-either:
      - pattern: |
          $KEY = "sk-..."
      - pattern: |
          $KEY = "gsk_..."
      - pattern: |
          openai_api_key = "..."
    message: "Hardcoded API key detected"
    severity: ERROR
    languages: [python, javascript, typescript]
    
  - id: unsafe-eval-usage
    pattern-either:
      - pattern: eval(...)
      - pattern: exec(...)
      - pattern: subprocess.call(...)
    message: "Unsafe code execution detected"
    severity: ERROR
    languages: [python]
    
  - id: sql-injection-risk
    pattern-either:
      - pattern: |
          $QUERY = "SELECT * FROM " + $USER_INPUT
      - pattern: |
          cursor.execute("... " + $VAR + " ...")
    message: "Potential SQL injection vulnerability"
    severity: ERROR
    languages: [python]
    
  - id: insecure-random
    pattern-either:
      - pattern: random.random()
      - pattern: Math.random()
    message: "Insecure random number generation for security purposes"
    severity: WARNING
    languages: [python, javascript]
    
  - id: debug-mode-enabled
    pattern-either:
      - pattern: |
          debug = True
      - pattern: |
          DEBUG = True
      - pattern: |
          app.debug = True
    message: "Debug mode enabled in production code"
    severity: WARNING
    languages: [python]
```

## Monitoring Dashboard

### Enhanced Grafana Configuration:
```yaml
# monitoring/grafana/dashboards/ai-coding-system.json
{
  "dashboard": {
    "id": null,
    "title": "AI Coding System - Observability Dashboard",
    "tags": ["ai-coding", "observability"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Backend Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(backend_requests_total[5m])",
            "legendFormat": "{{backend}} - {{method}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ]
      },
      {
        "id": 2,
        "title": "Backend Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(backend_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(backend_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Token Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(tokens_used_total[5m])",
            "legendFormat": "{{backend}}"
          }
        ]
      },
      {
        "id": 4,
        "title": "Cost Tracking",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(cost_usd_total[1h])",
            "legendFormat": "{{backend}} - Hourly Cost"
          }
        ]
      },
      {
        "id": 5,
        "title": "Orchestrator Sessions",
        "type": "stat",
        "targets": [
          {
            "expr": "orchestrator_sessions_total",
            "legendFormat": "Total Sessions"
          }
        ]
      },
      {
        "id": 6,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(backend_requests_total{status=\"error\"}[5m]) / rate(backend_requests_total[5m])",
            "legendFormat": "{{backend}} Error Rate"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

### Prometheus Configuration:
```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'agent-motor'
    static_configs:
      - targets: ['agent-motor:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'context-server'
    static_configs:
      - targets: ['context-server:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'dashboard'
    static_configs:
      - targets: ['dashboard:5080']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8888']
    scrape_interval: 10s
```

### Alert Rules:
```yaml
# monitoring/prometheus/alert_rules.yml
groups:
  - name: ai-coding-system
    rules:
      - alert: HighErrorRate
        expr: rate(backend_requests_total{status="error"}[5m]) / rate(backend_requests_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for backend {{ $labels.backend }}"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(backend_request_duration_seconds_bucket[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighCostRate
        expr: rate(cost_usd_total[1h]) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High cost rate detected"
          description: "Hourly cost rate is ${{ $value }}"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} service is down"
```

## Evidence References

**Current Observability Configuration**:
- Line 33 in `docker-compose.yml`: Jaeger endpoint configuration for context server
- Line 120: Jaeger service definition with all-in-one image
- Line 133: Grafana service with admin password and plugin configuration
- Line 149: Prometheus service with configuration volume mount

**Dashboard Service Analysis**:
- Line 21 in `dashboard-service/Dockerfile`: Basic health check implementation
- Missing OpenTelemetry instrumentation
- No cost tracking integration
- Limited observability features

**CI Pipeline Gaps**:
- Lines 47-51 in `.github/workflows/ci.yml`: Basic license scanning only
- No SAST integration with Semgrep
- Missing security vulnerability scanning
- No automated security reporting

**Integration Requirements**:
- Need for comprehensive OpenTelemetry instrumentation across all Python services
- Real-time cost tracking with threshold alerts
- Distributed tracing correlation between services
- SAST integration with GitHub Security tab
- Enhanced monitoring dashboards with AI-specific metrics