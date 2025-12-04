# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Inkhat** is an open-source agent execution platform - a visual, component-based framework for designing, building, and executing AI agents with any LLM provider. Think of it as an open-source alternative to Claude Code that extends beyond development into autonomous agent execution.

### Core Vision

Inkhat transforms from a simple productivity TUI framework into a **full agent development and execution platform** with three core modes:

1. **Process Design Mode** 🎨 - Visual workflow builder for designing agent processes
2. **Execute Mode** 🚀 - Runtime execution of agents and workflows
3. **Observe Dashboard** 📊 - Real-time monitoring and metrics

### Key Differentiators

- **Visual-First**: Design agent workflows visually in TUI
- **Provider-Agnostic**: Works with Ollama, OpenAI, Anthropic, OpenRouter
- **Execution-Focused**: Actually run agents, not just generate code
- **Component-Based**: Reusable building blocks for agent creation
- **Observable**: Full metrics and monitoring for all executions

## Architecture

### Hexagonal Architecture (Ports & Adapters)

The codebase follows ports and adapters pattern with clear separation:

- **Ports** (`src/ports/`): Abstract interfaces
  - `storage.ts`: Data persistence
  - `input.ts`: User input
  - `app.ts`: App plugin system
  - `llm.ts`: **NEW** - LLM provider abstraction
  - `agent.ts`: **NEW** - Agent execution
  - `workflow.ts`: **NEW** - Workflow management
  - `observe.ts`: **NEW** - Observability/metrics
  - `build.ts`: **NEW** - Code generation (optional)

- **Adapters** (`src/adapters/`): Implementations
  - `json-storage.ts`: File-based storage
  - `keyboard-input.ts`: Terminal input
  - `llm/ollama.ts`: **NEW** - Ollama adapter
  - `llm/openai.ts`: **TODO** - OpenAI adapter
  - `llm/anthropic.ts`: **TODO** - Anthropic adapter
  - `workflow-storage.ts`: **NEW** - Workflow persistence
  - `workflow-templates.ts`: **NEW** - Component library

- **Core** (`src/core/`): Business logic
  - `framework.ts`: Main orchestrator
  - `app-registry.ts`: App management

### App Plugin System

Apps implement the `App` interface and get registered with the framework:

```typescript
interface App {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly commands: AppCommand[];

  initialize(context: AppContext): Promise<void>;
  render(): React.ReactElement;
  cleanup(): Promise<void>;
}
```

Apps receive an `AppContext` with:
- `storage`: Data persistence
- `input`: User input handling
- `config`: Configuration

## Path Aliases

```typescript
import { LLMPort } from '@ports/llm';
import { OllamaAdapter } from '@adapters/llm/ollama';
import type { Agent } from '@ports/agent';
```

## Development Commands

### Running the App

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Run production
npm start

# Type checking
npm run type-check
```

### Testing

```bash
npm test
npm test:ui
npm test:run
```

## Current Apps

### 1. Calendar Manager (`src/apps/calendar/`)
Original productivity app for managing calendar events.

**Features:**
- Add events
- View agenda
- Find available slots

**Usage:**
```bash
npm run dev -- exec calendar-manager agenda
npm run dev -- exec calendar-manager add "Meeting" "2024-01-15 14:00"
```

### 2. Agent Chat (`src/apps/agent-chat/`) **NEW**

**Demo of LLM-powered conversational agent with intelligent memory management.**

**Features:**
- Chat with local LLMs via Ollama
- Persistent conversation history
- **Split UI**: Chat pane (left) and Memory pane (right)
- **Conversation Summarization**: Automatic summary generation every M messages
- **Entity Memory**: Structured knowledge graph of entities (people, places, concepts, events, tasks)
- **Memory Persistence**: All memory is saved and restored across sessions
- Multi-turn conversations with context awareness

**Usage:**
```bash
# Start interactive chat (select from launcher)
npm run dev

# Execute commands
npm run dev -- exec agent-chat chat
npm run dev -- exec agent-chat models
npm run dev -- exec agent-chat clear
```

**Prerequisites:**
1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3.2`
3. Ensure Ollama is running: `ollama serve`

**Commands:**
- `/help` - Show help
- `/clear` - Clear history and memory
- `/chat` - Return to chat

**Memory Management:**

The Agent Chat app features a sophisticated two-pane interface:

**Left Pane - Chat Interface:**
- Shows the last N messages (configurable, default: 10)
- Real-time chat with the LLM
- Uses conversation summary + recent messages for context

**Right Pane - Memory Dashboard:**
- **Recent Messages**: Last 5 messages preview
- **Conversation Summary**: Narrative summary of the entire conversation, updated every M messages (configurable, default: 5)
- **Entity Memory**: Structured knowledge graph showing:
  - People mentioned (👤)
  - Places mentioned (📍)
  - Events discussed (📅)
  - Tasks mentioned (✓)
  - Concepts discussed (💡)
  - Other entities (🔷)
  - Relationships between entities with strength indicators

**Memory Configuration:**
- `recentMessagesCount` (N): Number of recent messages to show in chat (default: 10)
- `summaryUpdateFrequency` (M): Update summary every M messages (default: 5)

**Memory Persistence:**
- Conversation history: `agent-chat/history`
- Conversation summary: `agent-chat/conversation-summary`
- Entity memory: `agent-chat/entity-memory`

All memory is automatically saved and loaded when the app starts/stops.

**How Memory Works:**

1. **Conversation Memory**: The system maintains a narrative summary that captures:
   - Conversation flow
   - Key topics discussed
   - Important context
   - This is distinct from entity memory (separate output from the LLM)

2. **Entity Memory**: The system extracts and structures:
   - Entity nodes (with type, name, description, properties)
   - Relationships between entities
   - Relationship strength (0-1 scale)
   - Updated incrementally as conversations progress

3. **Automatic Updates**: Every M messages, the system:
   - Takes the previous summary and latest M messages
   - Sends to LLM with a specialized prompt that distinguishes conversation memory from entity memory
   - Updates both the narrative summary and the entity graph
   - Saves to persistent storage

**Memory Prompt Design:**

The summarization prompt explicitly separates two types of memory:
- **CONVERSATION MEMORY**: Narrative, flow-based summary
- **ENTITY MEMORY**: Structured, graph-based knowledge

This distinction allows the system to maintain both a coherent narrative understanding and a structured knowledge base.

## LLM Provider System

### Unified LLM Port

The `LLMPort` interface provides a consistent API across all providers:

```typescript
interface LLMPort {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncGenerator<StreamChunk>;
  listModels(): Promise<ModelInfo[]>;
  testConnection(): Promise<boolean>;
}
```

### Supported Providers

#### Ollama (Implemented ✅)
```typescript
import { OllamaAdapter } from '@adapters/llm/ollama';

const llm = new OllamaAdapter({
  baseUrl: 'http://localhost:11434',
  defaultModel: 'llama3.2'
});

const response = await llm.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7
});
```

#### OpenAI (TODO)
```typescript
import { OpenAIAdapter } from '@adapters/llm/openai';

const llm = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  defaultModel: 'gpt-4-turbo'
});
```

#### Anthropic (TODO)
```typescript
import { AnthropicAdapter } from '@adapters/llm/anthropic';

const llm = new AnthropicAdapter({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultModel: 'claude-sonnet-4.5'
});
```

#### OpenRouter (TODO)
Multi-provider routing with fallback support.

## Workflow Components

### Component Library (`src/adapters/workflow-templates.ts`)

Reusable building blocks for agent workflows:

**Triggers:**
- User Input - Start from user message
- Schedule - Cron-based triggers
- Event - Respond to events

**LLM Components:**
- LLM Completion - Single-turn completion
- LLM with Tools - Function calling enabled
- Chat - Multi-turn conversation

**Tool Components:**
- Read File - File system read
- Write File - File system write
- HTTP Request - API calls
- Storage Read/Write - Data persistence

**Logic Components:**
- If Condition - Branching logic
- Loop - Iterate over items
- Transform - Data transformation

**Output Components:**
- Display - Show to user
- Return - End workflow
- Save - Persist results

### Creating Workflows

Workflows are stored as JSON in `~/.inkhat/data/workflows/`:

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  components: WorkflowComponent[];
  connections: WorkflowConnection[];
  metadata: {
    created: Date;
    modified: Date;
  };
}
```

## Creating a New App

### 1. Basic App Structure

```bash
mkdir -p src/apps/my-app
```

```typescript
// src/apps/my-app/MyApp.tsx
import React from 'react';
import type { App, AppContext } from '@ports/app';

export class MyApp implements App {
  readonly id = 'my-app';
  readonly name = 'My App';
  readonly description = 'What it does';
  readonly version = '0.1.0';

  readonly commands = [
    {
      name: 'action',
      description: 'Do something',
      execute: async (args, context) => {
        // Use context.storage, context.input
      }
    }
  ];

  async initialize(context: AppContext) {
    // Setup
  }

  render() {
    return <MyComponent />;
  }

  async cleanup() {
    // Save state
  }
}

export default new MyApp();
```

### 2. Using LLMs in Your App

```typescript
import { OllamaAdapter } from '@adapters/llm/ollama';
import type { LLMPort } from '@ports/llm';

export class MyAgentApp implements App {
  private llm!: LLMPort;

  async initialize(context: AppContext) {
    this.llm = new OllamaAdapter({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'llama3.2'
    });

    // Test connection
    const connected = await this.llm.testConnection();
    if (!connected) {
      console.error('Ollama not available');
    }
  }

  async handleUserMessage(message: string) {
    const response = await this.llm.complete({
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      maxTokens: 500
    });

    return response.content;
  }
}
```

### 3. Register in CLI

```typescript
// src/cli.tsx
import myApp from './apps/my-app/MyApp.js';

framework.getRegistry().register(myApp);
```

## Agent Execution Patterns

### Simple Completion

```typescript
const response = await llm.complete({
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7
});
```

### Streaming

```typescript
for await (const chunk of llm.stream({ messages })) {
  process.stdout.write(chunk.delta);
}
```

### Tool/Function Calling

```typescript
const response = await llm.complete({
  messages,
  tools: [
    {
      name: 'get_weather',
      description: 'Get weather for location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' }
        },
        required: ['location']
      }
    }
  ]
});

if (response.toolCalls) {
  for (const call of response.toolCalls) {
    // Execute tool and return result
  }
}
```

## Storage Patterns

Apps should namespace storage keys:

```typescript
// Write
await context.storage.write('my-app/data/item-1', { foo: 'bar' });

// Read
const item = await context.storage.read('my-app/data/item-1');

// List
const keys = await context.storage.list('my-app/data/*');

// Query
const items = await context.storage.query({ status: 'active' });
```

## Configuration

User config in `~/.inkhat/config.json`:

```json
{
  "llm": {
    "defaultProvider": "ollama",
    "providers": {
      "ollama": {
        "baseUrl": "http://localhost:11434",
        "defaultModel": "llama3.2"
      }
    }
  },
  "storage": {
    "basePath": "~/.inkhat/data"
  }
}
```

## UI Components (Ink)

Use Ink components for TUI:

```typescript
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

function MyUI() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Title</Text>
      <TextInput value={input} onChange={setInput} />
    </Box>
  );
}
```

## Roadmap

### Phase 1: Foundation ✅
- [x] LLM Port interface
- [x] Ollama adapter
- [x] Agent Chat demo
- [x] Component templates
- [x] Workflow definitions

### Phase 2: More Providers (In Progress)
- [ ] OpenAI adapter
- [ ] Anthropic adapter
- [ ] OpenRouter adapter
- [ ] Provider router with fallback

### Phase 3: Agent Execution Engine
- [ ] Agent executor adapter
- [ ] Tool registry
- [ ] Built-in tools
- [ ] Memory management
- [ ] Multi-step execution

### Phase 4: Process Designer
- [ ] Visual workflow editor (TUI)
- [ ] Component palette
- [ ] Connection editor
- [ ] Validation
- [ ] Template library

### Phase 5: Observe Dashboard
- [ ] Real-time metrics
- [ ] Execution timeline
- [ ] Agent status
- [ ] Cost tracking
- [ ] Performance graphs

## Important Notes

- All imports must use `.js` extensions (ESM requirement)
- Project uses `type: "module"`
- React components must return valid Ink elements
- Storage operations are async - always await
- Apps should namespace storage keys
- LLM operations can be expensive - add loading states
- Test LLM connection before use

## File Structure

```
inkhat/
├── src/
│   ├── ports/          # Interfaces
│   │   ├── app.ts
│   │   ├── storage.ts
│   │   ├── input.ts
│   │   ├── llm.ts      # NEW
│   │   ├── agent.ts    # NEW
│   │   ├── workflow.ts # NEW
│   │   ├── observe.ts  # NEW
│   │   └── build.ts    # NEW
│   ├── adapters/       # Implementations
│   │   ├── json-storage.ts
│   │   ├── keyboard-input.ts
│   │   ├── llm/
│   │   │   ├── ollama.ts      # NEW ✅
│   │   │   ├── openai.ts      # TODO
│   │   │   └── anthropic.ts   # TODO
│   │   ├── workflow-storage.ts    # NEW
│   │   └── workflow-templates.ts  # NEW
│   ├── core/           # Business logic
│   │   ├── framework.ts
│   │   └── app-registry.ts
│   ├── apps/           # Applications
│   │   ├── calendar/
│   │   └── agent-chat/ # NEW ✅
│   ├── ui/             # UI components
│   │   ├── App.tsx
│   │   └── components/
│   └── cli.tsx         # Entry point
├── DESIGN.md           # NEW - Architecture docs
├── CLAUDE.md          # This file
└── package.json
```

## Contributing

See DESIGN.md for:
- Detailed architecture
- Adding new providers
- Creating component types
- Building workflows
- Implementing observability

## Resources

- [Ollama](https://ollama.ai) - Local LLMs
- [Ink Documentation](https://github.com/vadimdemedes/ink) - Terminal UI
- [Design Document](./DESIGN.md) - Full platform architecture
