# Inkhat: Open-Source Agent Execution Platform

## Vision

Inkhat is an open-source alternative to Claude Code that extends beyond development into execution. It's a **component-based platform for designing, building, and executing AI agents** using a visual TUI interface.

### Core Philosophy

- **Visual-First**: Design agent workflows visually in a TUI
- **Provider-Agnostic**: Works with any LLM provider (Ollama, OpenAI, Anthropic, OpenRouter)
- **Execution-Focused**: Not just code generation—actually run agents and workflows
- **Component-Based**: Reusable building blocks for agent creation
- **Observable**: Real-time monitoring and metrics for all executions

## Three Core Modes

### 1. **Process Design Mode** 🎨

A visual workflow builder for designing agent processes.

**Features:**
- Drag-and-drop component placement in TUI
- Visual connection between components
- Component library (prompts, tools, logic nodes)
- Real-time validation
- Template library for common patterns

**Components:**
- **Triggers**: Entry points (user input, schedule, event)
- **LLM Nodes**: LLM completion with configurable prompts
- **Tool Nodes**: Function calls (file ops, API calls, calculations)
- **Logic Nodes**: Conditions, loops, transformations
- **Memory Nodes**: Store and retrieve context
- **Output Nodes**: Return results, save to storage

**Workflow Storage:**
```
workflows/
  └── <workflow-id>/
      ├── definition.json      # Workflow structure
      ├── components.json      # Component configs
      └── connections.json     # Data flow
```

### 2. **Build Mode** 🔨

Transforms workflow designs into executable agents (or generates standalone code).

**Two Approaches:**

**A. Runtime Execution** (Primary)
- Load workflow definition
- Execute components using built-in engine
- No code generation needed
- Hot-reload on workflow changes

**B. Code Generation** (Optional)
- Generate TypeScript App class from workflow
- Produces standalone app in `src/apps/generated-<name>/`
- Useful for distribution or customization

**Runtime Execution Flow:**
1. Load workflow from storage
2. Validate workflow structure
3. Topological sort for execution order
4. Initialize LLM provider and tools
5. Execute components sequentially
6. Pass data through connections
7. Handle errors and retries

### 3. **Observe Dashboard** 📊

Real-time monitoring and metrics for agent execution.

**Metrics Tracked:**
- Active agents and status
- Execution timeline
- Token usage and cost
- Tool call frequency
- Error rates
- Execution duration
- Memory usage

**Views:**
- **Live View**: Currently executing agents
- **History**: Past executions with filtering
- **Agent Detail**: Per-agent metrics and logs
- **System Health**: Provider status, storage, resources

**Data Collection:**
- Execution events (state changes, tool calls)
- LLM metrics (tokens, latency, cost)
- Storage operations
- System resources

## Architecture

### Hexagonal Architecture (Ports & Adapters)

```
┌─────────────────────────────────────────────────────────┐
│                         Apps                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Process    │  │   Execute    │  │   Observe    │ │
│  │   Designer   │  │   Runner     │  │  Dashboard   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                        Ports                            │
│   AgentPort │ WorkflowPort │ LLMPort │ ObservePort     │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                      Adapters                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Agent   │  │ Workflow │  │   LLM    │  │ Observe│ │
│  │ Executor │  │ Storage  │  │ Providers│  │Storage │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Key Ports

#### 1. **LLMPort** (`src/ports/llm.ts`)
Unified interface for multiple LLM providers.

```typescript
interface LLMPort {
  complete(request: CompletionRequest): Promise<CompletionResponse>
  stream(request: CompletionRequest): AsyncGenerator<StreamChunk>
  listModels(): Promise<ModelInfo[]>
  testConnection(): Promise<boolean>
}
```

**Adapters:**
- `OllamaAdapter` - Local models via Ollama
- `OpenAIAdapter` - OpenAI API
- `AnthropicAdapter` - Claude API
- `OpenRouterAdapter` - OpenRouter multi-provider

#### 2. **AgentPort** (`src/ports/agent.ts`)
Agent creation and execution.

```typescript
interface AgentPort {
  createAgent(agent: Agent): Promise<Agent>
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>
  executeStream(request: AgentExecutionRequest): AsyncGenerator<AgentStreamEvent>
  registerTool(tool: AgentTool): Promise<void>
}
```

#### 3. **WorkflowPort** (`src/ports/workflow.ts`)
Workflow management and execution.

```typescript
interface WorkflowPort {
  createWorkflow(definition: WorkflowDefinition): Promise<WorkflowDefinition>
  validateWorkflow(definition: WorkflowDefinition): Promise<ValidationResult>
  executeWorkflow(id: string, inputs?: any): Promise<WorkflowExecutionContext>
}
```

#### 4. **ObservabilityPort** (`src/ports/observe.ts`)
Metrics and monitoring.

```typescript
interface ObservabilityPort {
  recordMetric(metric: Metric): void
  logEvent(event: ObservabilityEvent): void
  getMetrics(options: MetricQuery): Promise<Metric[]>
  getAppMetrics(appId: string): Promise<AppMetrics>
}
```

### Component Types

#### Workflow Components

1. **Trigger Components**
   - User Input
   - Schedule (cron)
   - Event Listener
   - Webhook

2. **LLM Components**
   - Completion (single turn)
   - Chat (multi-turn)
   - Few-shot (with examples)
   - Chain-of-Thought

3. **Tool Components**
   - File Operations (read, write, list)
   - Storage Operations (CRUD)
   - API Calls (HTTP requests)
   - Shell Commands
   - Custom Functions

4. **Logic Components**
   - If/Else Conditions
   - Switch Cases
   - Loops (for, while)
   - Map/Reduce
   - Transform Data

5. **Memory Components**
   - Buffer (sliding window)
   - Summary (compress history)
   - Vector Store (semantic search)
   - Key-Value Store

6. **Output Components**
   - Display (show to user)
   - Save (storage)
   - Return (end workflow)
   - Notify (alerts)

## Implementation Roadmap

### Phase 1: Foundation ✅
- [x] LLM Port interface
- [x] Agent Port interface
- [x] Workflow Port interface
- [x] Observability Port interface
- [x] Build Port interface

### Phase 2: LLM Adapters
- [ ] Ollama Adapter (local models)
- [ ] OpenAI Adapter (GPT-4, etc.)
- [ ] Anthropic Adapter (Claude)
- [ ] OpenRouter Adapter (multi-provider)
- [ ] Provider Router (fallback, load balancing)

### Phase 3: Agent Execution Engine
- [ ] Agent Executor Adapter
- [ ] Tool Registry
- [ ] Built-in Tools (file, storage, http)
- [ ] Memory Management
- [ ] Execution Context

### Phase 4: Workflow Execution Engine
- [ ] Component Library
- [ ] Workflow Validator
- [ ] Execution Engine (topological sort, data flow)
- [ ] Error Handling & Retries
- [ ] State Persistence

### Phase 5: Process Design Mode App
- [ ] Workflow Editor UI (TUI)
- [ ] Component Palette
- [ ] Connection Editor
- [ ] Validation Display
- [ ] Save/Load Workflows
- [ ] Template Library

### Phase 6: Execute Mode App
- [ ] Agent Launcher UI
- [ ] Execution Control (start, stop, pause)
- [ ] Live Output Display
- [ ] Input Handling
- [ ] Streaming Support

### Phase 7: Observe Dashboard App
- [ ] Real-time Metrics Display
- [ ] Execution Timeline
- [ ] Agent Status Cards
- [ ] Logs Viewer
- [ ] Cost Tracking
- [ ] Performance Graphs

### Phase 8: Integration & Polish
- [ ] Multi-agent Orchestration
- [ ] Agent-to-Agent Communication
- [ ] Background Execution
- [ ] Scheduled Agents
- [ ] API Server (REST/GraphQL)
- [ ] CLI Commands

## Example Use Cases

### 1. Research Agent
```
[User Input] → [LLM: Research Plan] → [Loop: Search + Read + Summarize]
                                     → [LLM: Synthesize] → [Save Report]
```

### 2. Code Assistant
```
[User Query] → [LLM: Understand Task] → [Read Files]
                                      → [LLM: Generate Code]
                                      → [Write Files]
                                      → [Run Tests]
                                      → [If Failed: LLM: Fix Errors]
                                      → [Display Result]
```

### 3. Data Pipeline
```
[Schedule: Daily] → [API: Fetch Data] → [Transform: Clean]
                                      → [LLM: Analyze Trends]
                                      → [Storage: Save Results]
                                      → [Notify: Send Summary]
```

### 4. Interactive Assistant
```
[Chat Loop] → [LLM: Understand Intent] → [Switch Case:
                                            - "search": Web Search Tool
                                            - "remind": Calendar Tool
                                            - "calculate": Math Tool
                                            - "default": Direct Response
                                          ]
            → [Display Response] → [Continue Chat]
```

## Configuration

### User Config (`~/.inkhat/config.json`)
```json
{
  "llm": {
    "defaultProvider": "ollama",
    "providers": {
      "ollama": {
        "baseUrl": "http://localhost:11434",
        "defaultModel": "llama3.2"
      },
      "openai": {
        "apiKey": "sk-...",
        "defaultModel": "gpt-4-turbo"
      },
      "anthropic": {
        "apiKey": "sk-ant-...",
        "defaultModel": "claude-sonnet-4.5"
      }
    }
  },
  "agent": {
    "maxSteps": 50,
    "maxDuration": 300000,
    "maxCost": 1.0
  },
  "storage": {
    "basePath": "~/.inkhat/data",
    "adapter": "json"
  },
  "observability": {
    "enabled": true,
    "retention": 7
  }
}
```

## Technology Stack

**Core:**
- TypeScript (ES2022, ESM)
- Node.js (v18+)

**UI:**
- React (18.3.1)
- Ink (5.0.1) - Terminal rendering
- ink-text-input, ink-select-input - Input components

**LLM SDKs:**
- `ollama` - Ollama client
- `openai` - OpenAI SDK
- `@anthropic-ai/sdk` - Claude SDK
- `axios` - HTTP client for OpenRouter

**Utilities:**
- `zod` - Schema validation
- `date-fns` - Date handling
- `conf` - Configuration management
- `commander` - CLI framework

**Testing:**
- Vitest - Unit testing
- Testing Library - React/Ink testing

## Comparison to Claude Code

| Feature | Claude Code | Inkhat |
|---------|-------------|--------|
| **Purpose** | Development assistant | Agent platform |
| **LLM** | Claude only | Multi-provider |
| **Interface** | Chat + tools | Visual workflows |
| **Execution** | Dev tasks only | Any automation |
| **Extensibility** | Limited | Component-based |
| **Deployment** | Proprietary | Open source |
| **Cost** | Claude API | Choose provider |
| **Observability** | Basic | Full metrics |

## Contributing

### Adding a New LLM Provider

1. Implement `LLMPort` interface in `src/adapters/llm/`
2. Handle provider-specific API format
3. Normalize to common types
4. Add configuration schema
5. Test with integration tests

### Adding a New Tool

1. Implement `AgentTool` interface
2. Define parameters with JSON schema
3. Implement `execute` function
4. Add to tool registry
5. Document usage and examples

### Adding a New Component Type

1. Define component interface in `src/ports/workflow.ts`
2. Create template in `src/adapters/workflow-templates.ts`
3. Implement execution logic in workflow engine
4. Add UI widget in Process Designer
5. Add to component palette

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ by the open-source community**

_Inkhat: From design to execution, visually._
